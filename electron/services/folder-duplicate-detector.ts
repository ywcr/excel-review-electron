/**
 * 文件夹图片重复检测服务
 * 
 * 功能：比较两个文件夹中的图片是否重复
 * - 图片库：已验证/存档的图片
 * - 待验证图片：新图片，需要与图片库进行比对
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import pLimit from "p-limit";
import { calculateBlockhash, calculateHammingDistanceHex } from "./blockhash";

// ==================== 类型定义 ====================

/** 图片信息 */
export interface ImageInfo {
  path: string;
  name: string;
  size: number;
  hash?: string;
}

/** 文件夹扫描结果 */
export interface FolderScanResult {
  folderPath: string;
  imageCount: number;
  images: ImageInfo[];
}

/** 重复匹配项 */
export interface DuplicateMatch {
  newImage: {
    path: string;
    name: string;
  };
  libraryImage: {
    path: string;
    name: string;
  };
  similarity: number;        // 0-100 百分比
  hammingDistance: number;   // 汉明距离 (0-144)
}

/** 对比结果 */
export interface CompareResult {
  totalNewImages: number;
  totalLibraryImages: number;
  duplicates: DuplicateMatch[];
  uniqueCount: number;
  durationMs: number;
}

// ==================== 配置 ====================

const CONFIG = {
  /** 支持的图片扩展名 */
  SUPPORTED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"],
  /** 汉明距离阈值：小于等于此值判定为重复 */
  DUPLICATE_THRESHOLD: 10,
  /** Blockhash 位数 */
  BLOCKHASH_BITS: 12,
  /** 并发数 */
  CONCURRENCY: 4,
  /** 缩略图尺寸 */
  THUMBNAIL_SIZE: 200,
};

// ==================== 核心类 ====================

export class FolderDuplicateDetector {
  private libraryHashes: Map<string, { hash: string; imagePath: string; imageName: string }> = new Map();

  /**
   * 扫描文件夹中的图片
   */
  async scanFolder(folderPath: string): Promise<FolderScanResult> {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`文件夹不存在: ${folderPath}`);
    }

    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`路径不是文件夹: ${folderPath}`);
    }

    const images: ImageInfo[] = [];
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const ext = path.extname(file).toLowerCase();

      if (CONFIG.SUPPORTED_EXTENSIONS.includes(ext)) {
        try {
          const fileStats = fs.statSync(filePath);
          if (fileStats.isFile()) {
            images.push({
              path: filePath,
              name: file,
              size: fileStats.size,
            });
          }
        } catch {
          // 跳过无法访问的文件
        }
      }
    }

    console.log(`📁 [文件夹扫描] ${folderPath}: ${images.length} 张图片`);

    return {
      folderPath,
      imageCount: images.length,
      images,
    };
  }

  /**
   * 计算图片哈希
   */
  private async calculateHash(imagePath: string): Promise<string> {
    const buffer = fs.readFileSync(imagePath);
    const result = await calculateBlockhash(buffer, CONFIG.BLOCKHASH_BITS);
    return result.hash;
  }

  /**
   * 比较两个文件夹中的图片
   */
  async compareFolders(
    libraryPath: string,
    newImagesPath: string,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<CompareResult> {
    const startTime = Date.now();
    
    // 1. 扫描两个文件夹
    console.log("📁 [对比] 开始扫描文件夹...");
    onProgress?.(0, 100, "正在扫描文件夹...");
    
    const libraryResult = await this.scanFolder(libraryPath);
    const newResult = await this.scanFolder(newImagesPath);

    if (libraryResult.imageCount === 0) {
      throw new Error("图片库文件夹中没有图片");
    }
    if (newResult.imageCount === 0) {
      throw new Error("待验证文件夹中没有图片");
    }

    const totalImages = libraryResult.imageCount + newResult.imageCount;
    let processedCount = 0;

    // 2. 计算图片库哈希
    console.log(`📁 [对比] 计算图片库哈希 (${libraryResult.imageCount} 张)...`);
    this.libraryHashes.clear();
    
    const limit = pLimit(CONFIG.CONCURRENCY);
    const libraryHashPromises = libraryResult.images.map((img, idx) =>
      limit(async () => {
        try {
          const hash = await this.calculateHash(img.path);
          this.libraryHashes.set(img.path, {
            hash,
            imagePath: img.path,
            imageName: img.name,
          });
          processedCount++;
          onProgress?.(
            Math.floor((processedCount / totalImages) * 50),
            100,
            `计算图片库哈希: ${img.name}`
          );
        } catch (err) {
          console.warn(`计算哈希失败: ${img.path}`, err);
        }
      })
    );
    await Promise.all(libraryHashPromises);

    // 3. 计算待验证图片哈希并比对
    console.log(`📁 [对比] 比对待验证图片 (${newResult.imageCount} 张)...`);
    const duplicates: DuplicateMatch[] = [];
    const libraryHashArray = Array.from(this.libraryHashes.values());

    const comparePromises = newResult.images.map((img) =>
      limit(async () => {
        try {
          const hash = await this.calculateHash(img.path);
          
          // 与图片库中的所有图片比较
          let bestMatch: { distance: number; libraryImage: typeof libraryHashArray[0] } | null = null;
          
          for (const libImg of libraryHashArray) {
            const distance = calculateHammingDistanceHex(hash, libImg.hash);
            
            if (distance <= CONFIG.DUPLICATE_THRESHOLD) {
              if (!bestMatch || distance < bestMatch.distance) {
                bestMatch = { distance, libraryImage: libImg };
              }
            }
          }

          if (bestMatch) {
            const similarity = Math.round((1 - bestMatch.distance / 144) * 100);
            duplicates.push({
              newImage: {
                path: img.path,
                name: img.name,
              },
              libraryImage: {
                path: bestMatch.libraryImage.imagePath,
                name: bestMatch.libraryImage.imageName,
              },
              similarity,
              hammingDistance: bestMatch.distance,
            });
            console.log(`🔴 [重复] ${img.name} ↔ ${bestMatch.libraryImage.imageName} (相似度: ${similarity}%)`);
          }

          processedCount++;
          onProgress?.(
            50 + Math.floor(((processedCount - libraryResult.imageCount) / newResult.imageCount) * 50),
            100,
            `比对: ${img.name}`
          );
        } catch (err) {
          console.warn(`比对失败: ${img.path}`, err);
          processedCount++;
        }
      })
    );
    await Promise.all(comparePromises);

    // 按相似度排序（高到低）
    duplicates.sort((a, b) => b.similarity - a.similarity);

    const result: CompareResult = {
      totalNewImages: newResult.imageCount,
      totalLibraryImages: libraryResult.imageCount,
      duplicates,
      uniqueCount: newResult.imageCount - duplicates.length,
      durationMs: Date.now() - startTime,
    };

    console.log(`✅ [对比完成] 发现 ${duplicates.length} 张重复, ${result.uniqueCount} 张无重复, 耗时 ${result.durationMs}ms`);
    onProgress?.(100, 100, "对比完成");

    return result;
  }

  /**
   * 生成缩略图 (Base64)
   */
  async generateThumbnail(imagePath: string): Promise<string> {
    try {
      const buffer = await sharp(imagePath)
        .resize(CONFIG.THUMBNAIL_SIZE, CONFIG.THUMBNAIL_SIZE, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch (err) {
      console.warn(`生成缩略图失败: ${imagePath}`, err);
      return "";
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.libraryHashes.clear();
  }
}

// ==================== 单例 ====================

let folderDuplicateDetector: FolderDuplicateDetector | null = null;

export function getFolderDuplicateDetector(): FolderDuplicateDetector {
  if (!folderDuplicateDetector) {
    folderDuplicateDetector = new FolderDuplicateDetector();
  }
  return folderDuplicateDetector;
}

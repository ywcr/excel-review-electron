import pLimit from "p-limit";
import * as os from "os";
import { ImageValidator, ImageValidationResult } from "../validators/image-validator";
import {
  getRegionalDuplicateDetector,
  resetRegionalDuplicateDetector,
  RegionalDuplicateResult,
} from "./regional-duplicate-detector";

interface WpsImage {
  buffer: Buffer;
  range: any; // 具体类型取决于 exceljs 或 wps-image-extractor
  positionDesc: string;
}

export class ImageValidationService {
  public imageValidator: ImageValidator;
  private isCancelled = false;

  constructor() {
    this.imageValidator = new ImageValidator();
  }

  cancel() {
    this.isCancelled = true;
  }

  reset() {
    this.isCancelled = false;
    this.imageValidator.reset();
  }

  /**
   * 执行图片批量验证（两阶段：顺序哈希 + 并行分析）
   */
  async validateImages(
    images: WpsImage[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    results: Array<{ index: number; result: ImageValidationResult; thumbnail?: { data: string; mimeType: string } }>;
    stats: {
      blurryImages: number;
      duplicateImages: number;
      suspiciousImages: number;
      watermarkedImages: number;
      seasonMismatchImages: number;
      borderImages: number;
    };
  }> {
    const stats = {
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
      watermarkedImages: 0,
      seasonMismatchImages: 0,
      borderImages: 0,
    };
    const results: Array<{ index: number; result: ImageValidationResult; thumbnail?: { data: string; mimeType: string } }> = [];

    if (images.length === 0) {
      return { results, stats };
    }

    try {
      // ========== 阶段一：顺序计算哈希（重复检测需要顺序性）==========
      console.log(`📷 [阶段一] 开始计算 ${images.length} 张图片的哈希...`);
      onProgress?.(76, `[4/6] 正在计算图片哈希 (0/${images.length})...`);

      const imagesWithPosition = images.map((img, i) => ({
        buffer: img.buffer,
        position: img.positionDesc,
      }));

      // 顺序预计算哈希
      const hashes = await this.imageValidator.precomputeHashes(
        imagesWithPosition,
        (current, total) => {
          if (this.isCancelled) return;
          if (current % 10 === 0 || current === total) {
            const hashProgress = 76 + Math.floor((current / total) * 8); // 76-84%
            onProgress?.(hashProgress, `[4/6] 正在计算图片哈希 (${current}/${total})...`);
          }
        }
      );

      if (this.isCancelled) throw new Error("Validation cancelled");

      // ========== 阶段二：并行验证分析（模糊检测、边框检测、可疑度评分）==========
      console.log(`📷 [阶段二] 开始并行验证 ${images.length} 张图片...`);
      onProgress?.(84, `[5/6] 正在并行验证图片 (0/${images.length})...`);

      // 根据 CPU 核心数自适应并发数（最小4，最大12）
      const cpuCount = os.cpus().length;
      const concurrency = Math.max(4, Math.min(cpuCount, 12));
      const limit = pLimit(concurrency);
      console.log(`🚀 [并发控制] CPU核心数: ${cpuCount}, 设置并发数: ${concurrency}`);

      let completedCount = 0;

      const validationPromises = images.map((image, i) => {
        return limit(async () => {
          if (this.isCancelled) return null;

          try {
            const result = await this.imageValidator.validateImageWithPrecomputedHash(
              image.buffer,
              i,
              hashes[i]
            );

            // 如果有问题，生成缩略图
            let thumbnail: string | undefined = undefined; // Returns base64 string directly? 
            // Original code: thumbnail: { data: string; mimeType: string } | null
            // imageProcessor.createThumbnail returns Promise<{ data: string; mimeType: string }>
            
            // 检测是否有问题（包含水印、季节不符、边框）
            const hasError = result.isBlurry || result.isDuplicate || result.suspicionScore >= 40 || 
                            result.hasWatermark || !result.seasonMatchesCurrent || result.hasBorder;
            if (hasError) {
              const thumb = await this.imageValidator.imageProcessor.createThumbnail(image.buffer);
              thumbnail = thumb.data;
            }

            let thumbnailObj: { data: string; mimeType: string } | undefined = undefined;
            if (hasError) {
               thumbnailObj = await this.imageValidator.imageProcessor.createThumbnail(image.buffer);
            }

            // 统计
            if (result.isBlurry) stats.blurryImages++;
            if (result.isDuplicate) stats.duplicateImages++;
            if (result.suspicionScore >= 40) stats.suspiciousImages++;
            if (result.hasWatermark) stats.watermarkedImages++;
            if (!result.seasonMatchesCurrent && result.detectedSeason !== "unknown") stats.seasonMismatchImages++;
            if (result.hasBorder) stats.borderImages++;

            completedCount++;
            if (completedCount % 10 === 0 || completedCount === images.length) {
              const analysisProgress = 84 + Math.floor((completedCount / images.length) * 11); // 84-95%
              onProgress?.(analysisProgress, `[5/6] 已验证 ${completedCount}/${images.length} 张图片`);
            }

            return { index: i, result, thumbnail: thumbnailObj };
          } catch (err) {
            console.error(`Image ${i} validation failed:`, err);
            return null;
          }
        });
      });

      const processedResults = await Promise.all(validationPromises);
      
      // 过滤 null
      processedResults.forEach(r => {
        if (r) results.push(r);
      });

    } catch (error) {
      console.error("Failed to validate images:", error);
      throw error;
    }

    return { results, stats };
  }

  /**
   * 执行区域重复检测
   * 检测多张图片中重复出现的相同物体/人物（排除固定招牌）
   * 
   * @param images 要检测的图片数组
   * @param onProgress 进度回调
   * @returns 区域重复检测结果
   */
  async validateRegionalDuplicates(
    images: WpsImage[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<RegionalDuplicateResult> {
    // 重置检测器
    resetRegionalDuplicateDetector();
    const detector = getRegionalDuplicateDetector();

    if (images.length < 2) {
      return {
        hasDuplicate: false,
        staticRegions: [],
        duplicates: [],
        totalImages: images.length,
      };
    }

    try {
      console.log(`🔳 [区域检测] 开始分析 ${images.length} 张图片...`);
      onProgress?.(0, `正在分析区域特征 (0/${images.length})...`);

      // 添加所有图片
      for (let i = 0; i < images.length; i++) {
        if (this.isCancelled) {
          throw new Error("Regional detection cancelled");
        }

        await detector.addImage(
          images[i].buffer,
          i,
          images[i].positionDesc
        );

        const progress = Math.floor(((i + 1) / images.length) * 80);
        onProgress?.(progress, `正在分析区域特征 (${i + 1}/${images.length})...`);
      }

      // 执行检测
      onProgress?.(85, "正在检测可疑重复...");
      const result = detector.detectDuplicates();

      onProgress?.(100, `检测完成: ${result.duplicates.length} 个可疑重复`);
      return result;
    } catch (error) {
      console.error("区域重复检测失败:", error);
      throw error;
    }
  }
}

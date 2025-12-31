/**
 * 区域重复检测服务
 * 检测多张图片中重复出现的相同物体/人物
 * 使用 CLIP 分区域嵌入 + 静态区域过滤
 */
import { getClipDetector } from "./clip-detector";
import { REGIONAL_DUPLICATE_CONFIG } from "../config/image-validation-config";

// 区域名称映射（3x3 网格）
const REGION_NAMES = [
  "左上", "上中", "右上",
  "左中", "正中", "右中",
  "左下", "下中", "右下",
];

export interface RegionalEmbedding {
  imageIndex: number;
  position?: string;  // 如 "行5 列M"
  row?: number;       // 行号
  date?: string;      // 拍摄日期
  groupKey?: string;  // 分组键（如药店名称）
  embeddings: Float32Array[];  // 9 个区域的嵌入向量
}

export interface RegionalDuplicateMatch {
  regionIndex: number;      // 0-8
  regionName: string;       // "左上", "正中" 等
  image1Index: number;
  image2Index: number;
  image1Position?: string;
  image2Position?: string;
  similarity: number;
}

export interface RegionalDuplicateResult {
  hasDuplicate: boolean;
  staticRegions: number[];        // 静态区域索引（被排除的区域）
  duplicates: RegionalDuplicateMatch[];
  totalImages: number;
}

export class RegionalDuplicateDetector {
  private images: RegionalEmbedding[] = [];
  private config = REGIONAL_DUPLICATE_CONFIG;

  /**
   * 添加图片并计算区域嵌入
   */
  async addImage(
    imageBuffer: Buffer,
    imageIndex: number,
    position?: string,
    row?: number,
    groupKey?: string,
    date?: string
  ): Promise<boolean> {
    const clipDetector = getClipDetector();
    const embeddings = await clipDetector.getRegionalEmbeddings(
      imageBuffer,
      this.config.GRID_SIZE
    );

    if (!embeddings) {
      console.warn(`⚠️ [区域检测] 图片 #${imageIndex} 嵌入生成失败`);
      return false;
    }

    this.images.push({
      imageIndex,
      position,
      row,
      groupKey,
      date,
      embeddings,
    });

    console.log(`📥 [区域检测] 添加图片 #${imageIndex}${groupKey ? ` (${groupKey})` : ''}, 总数: ${this.images.length}`);
    return true;
  }

  /**
   * 检测所有图片间的区域重复
   */
  detectDuplicates(): RegionalDuplicateResult {
    const totalImages = this.images.length;

    if (totalImages < this.config.MIN_IMAGES) {
      return {
        hasDuplicate: false,
        staticRegions: [],
        duplicates: [],
        totalImages,
      };
    }

    const clipDetector = getClipDetector();
    const numRegions = this.config.GRID_SIZE * this.config.GRID_SIZE;

    // 1. 计算每个区域在所有图片对之间的相似度
    const regionSimilarities: number[][] = Array(numRegions)
      .fill(null)
      .map(() => []);

    for (let i = 0; i < this.images.length; i++) {
      for (let j = i + 1; j < this.images.length; j++) {
        for (let r = 0; r < numRegions; r++) {
          const sim = clipDetector.calculateSimilarity(
            this.images[i].embeddings[r],
            this.images[j].embeddings[r]
          );
          regionSimilarities[r].push(sim);
        }
      }
    }

    // 2. 识别静态区域（在大部分图片对中都高度相似）
    const staticRegions: number[] = [];
    for (let r = 0; r < numRegions; r++) {
      const sims = regionSimilarities[r];
      if (sims.length === 0) continue;

      // 计算高相似度的比例
      const highSimCount = sims.filter(
        (s) => s >= this.config.STATIC_THRESHOLD
      ).length;
      const highSimRatio = highSimCount / sims.length;

      if (highSimRatio >= this.config.MIN_STATIC_RATIO) {
        staticRegions.push(r);
        console.log(
          `🏪 [区域检测] 区域 ${r}(${REGION_NAMES[r]}) 被识别为静态区域 ` +
          `(高相似度比例: ${(highSimRatio * 100).toFixed(1)}%)`
        );
      }
    }

    // 3. 在非静态区域中检测可疑重复
    const duplicates: RegionalDuplicateMatch[] = [];

    for (let i = 0; i < this.images.length; i++) {
      for (let j = i + 1; j < this.images.length; j++) {
        for (let r = 0; r < numRegions; r++) {
          // 跳过静态区域
          if (staticRegions.includes(r)) continue;

          const sim = clipDetector.calculateSimilarity(
            this.images[i].embeddings[r],
            this.images[j].embeddings[r]
          );

          if (sim >= this.config.DUPLICATE_THRESHOLD) {
            duplicates.push({
              regionIndex: r,
              regionName: REGION_NAMES[r] || `区域${r}`,
              image1Index: this.images[i].imageIndex,
              image2Index: this.images[j].imageIndex,
              image1Position: this.images[i].position,
              image2Position: this.images[j].position,
              similarity: sim,
            });

            console.log(
              `⚠️ [区域检测] 发现可疑重复! 区域 ${REGION_NAMES[r]}: ` +
              `图片 #${this.images[i].imageIndex} ↔ #${this.images[j].imageIndex} ` +
              `(相似度: ${(sim * 100).toFixed(1)}%)`
            );
          }
        }
      }
    }

    const hasDuplicate = duplicates.length > 0;

    console.log(
      `📊 [区域检测] 检测完成: ${totalImages} 张图片, ` +
      `${staticRegions.length} 个静态区域, ` +
      `${duplicates.length} 个可疑重复`
    );

    return {
      hasDuplicate,
      staticRegions,
      duplicates,
      totalImages,
    };
  }

  /**
   * 按分组检测区域重复
   * 只在同一 groupKey 的图片之间进行比较
   */
  detectDuplicatesGrouped(): RegionalDuplicateResult {
    const totalImages = this.images.length;

    if (totalImages < 2) {
      return {
        hasDuplicate: false,
        staticRegions: [],
        duplicates: [],
        totalImages,
      };
    }

    // 按 groupKey 分组
    const groups = new Map<string, RegionalEmbedding[]>();
    for (const img of this.images) {
      const key = img.groupKey || "__default__";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(img);
    }

    console.log(`🏪 [区域检测] 分组检测: ${groups.size} 个分组`);

    const clipDetector = getClipDetector();
    const numRegions = this.config.GRID_SIZE * this.config.GRID_SIZE;
    const allDuplicates: RegionalDuplicateMatch[] = [];
    const allStaticRegions: number[] = [];

    // 对每个分组单独检测
    for (const [groupKey, groupImages] of groups) {
      if (groupImages.length < 2) continue;

      console.log(`📂 [区域检测] 检测分组 "${groupKey}": ${groupImages.length} 张图片`);

      // 1. 计算分组内每个区域的相似度
      const regionSimilarities: number[][] = Array(numRegions).fill(null).map(() => []);

      for (let i = 0; i < groupImages.length; i++) {
        for (let j = i + 1; j < groupImages.length; j++) {
          for (let r = 0; r < numRegions; r++) {
            const sim = clipDetector.calculateSimilarity(
              groupImages[i].embeddings[r],
              groupImages[j].embeddings[r]
            );
            regionSimilarities[r].push(sim);
          }
        }
      }

      // 2. 识别静态区域（门头照的招牌区域等）
      const staticRegions: number[] = [];
      for (let r = 0; r < numRegions; r++) {
        const sims = regionSimilarities[r];
        if (sims.length === 0) continue;

        const highSimCount = sims.filter((s) => s >= this.config.STATIC_THRESHOLD).length;
        const highSimRatio = highSimCount / sims.length;

        if (highSimRatio >= this.config.MIN_STATIC_RATIO) {
          staticRegions.push(r);
        }
      }

      // 3. 在非静态区域检测可疑重复
      for (let i = 0; i < groupImages.length; i++) {
        for (let j = i + 1; j < groupImages.length; j++) {
          for (let r = 0; r < numRegions; r++) {
            if (staticRegions.includes(r)) continue;

            const sim = clipDetector.calculateSimilarity(
              groupImages[i].embeddings[r],
              groupImages[j].embeddings[r]
            );

            if (sim >= this.config.DUPLICATE_THRESHOLD) {
              allDuplicates.push({
                regionIndex: r,
                regionName: REGION_NAMES[r] || `区域${r}`,
                image1Index: groupImages[i].imageIndex,
                image2Index: groupImages[j].imageIndex,
                image1Position: groupImages[i].position,
                image2Position: groupImages[j].position,
                similarity: sim,
              });

              console.log(
                `⚠️ [区域检测] 分组 "${groupKey}" 发现可疑重复! 区域 ${REGION_NAMES[r]}: ` +
                `${groupImages[i].position || `#${groupImages[i].imageIndex}`} ↔ ` +
                `${groupImages[j].position || `#${groupImages[j].imageIndex}`} ` +
                `(相似度: ${(sim * 100).toFixed(1)}%)`
              );
            }
          }
        }
      }
    }

    console.log(`📊 [区域检测] 分组检测完成: ${groups.size} 个分组, ${allDuplicates.length} 个可疑重复`);

    return {
      hasDuplicate: allDuplicates.length > 0,
      staticRegions: allStaticRegions,
      duplicates: allDuplicates,
      totalImages,
    };
  }

  /**
   * 获取当前图片数量
   */
  getImageCount(): number {
    return this.images.length;
  }

  /**
   * 重置检测器状态
   */
  reset(): void {
    this.images = [];
    console.log("🔄 [区域检测] 状态已重置");
  }
}

// 单例
let regionalDetectorInstance: RegionalDuplicateDetector | null = null;

export function getRegionalDuplicateDetector(): RegionalDuplicateDetector {
  if (!regionalDetectorInstance) {
    regionalDetectorInstance = new RegionalDuplicateDetector();
  }
  return regionalDetectorInstance;
}

export function resetRegionalDuplicateDetector(): void {
  if (regionalDetectorInstance) {
    regionalDetectorInstance.reset();
  }
}

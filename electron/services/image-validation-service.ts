import pLimit from "p-limit";
import * as os from "os";
import { ImageValidator, ImageValidationResult } from "../validators/image-validator";

interface WpsImage {
  buffer: Buffer;
  range: any; // 具体类型取决于 exceljs 或 wps-image-extractor
  positionDesc: string;
}

export class ImageValidationService {
  private imageValidator: ImageValidator;
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
    };
  }> {
    const stats = {
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
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
            
            const hasError = result.isBlurry || result.isDuplicate || result.suspicionScore >= 40;
            if (hasError) {
              const thumb = await this.imageValidator.imageProcessor.createThumbnail(image.buffer);
              thumbnail = thumb.data; // Store base64 data directly for simplicity or keep object?
              // The caller needs to put it into error.imageData
            }
            // Wait, looking at `ImageValidationError` in types: imageData?: string
            // So just the base64 string is fine?
            // Original code in excel-processor.ts constructed error:
            // imageData: item.thumbnail ? item.thumbnail.data : undefined,
            // mimeType: item.thumbnail ? item.thumbnail.mimeType : undefined,
            
            // I should return the whole object { data, mimeType } then.

            let thumbnailObj: { data: string; mimeType: string } | undefined = undefined;
            if (hasError) {
               thumbnailObj = await this.imageValidator.imageProcessor.createThumbnail(image.buffer);
            }

            // 统计
            if (result.isBlurry) stats.blurryImages++;
            if (result.isDuplicate) stats.duplicateImages++;
            if (result.suspicionScore >= 40) stats.suspiciousImages++;

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
}

/**
 * 图片验证器 - 整合模糊检测、重复检测、可疑度评分
 * 使用与 PC Worker 完全一致的 bmvbhash 算法
 */
import { ImageProcessor } from "../services/image-processor";
import {
  IMAGE_DUP_CONFIG,
  BLUR_CONFIG,
} from "../config/image-validation-config";
import {
  calculateBlockhash,
  calculateHammingDistanceHex,
} from "../services/blockhash";

export interface ImageValidationResult {
  isBlurry: boolean;
  blurScore: number;
  isDuplicate: boolean;
  duplicateOf?: number; // 重复的图片索引
  /** 重复图片的位置，如 "行5 列M" */
  duplicateOfPosition?: string;
  suspicionScore: number;
  suspicionLevel: string;
  suspicionLabel: string;
  suspicionFactors: string[];
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    megapixels: number;
  };
}

export class ImageValidator {
  public imageProcessor: ImageProcessor;
  private imageHashes: Map<number, string> = new Map(); // 存储已处理图片的哈希（十六进制格式）
  private imagePositions: Map<number, string> = new Map(); // 存储图片位置映射

  // === 使用与 PC Worker 完全同步的配置 ===
  // 来源: electron/config/image-validation-config.ts
  private readonly BLUR_THRESHOLD = BLUR_CONFIG.SHARPNESS_THRESHOLD;
  private readonly DUPLICATE_THRESHOLD = IMAGE_DUP_CONFIG.HAMMING_THRESHOLD;
  private readonly NEAR_THRESHOLD_MARGIN =
    IMAGE_DUP_CONFIG.NEAR_THRESHOLD_MARGIN;
  private readonly BLOCKHASH_BITS = IMAGE_DUP_CONFIG.BLOCKHASH_BITS;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * 验证单张图片
   * @param imageBuffer 图片 Buffer
   * @param imageIndex 图片索引
   * @param position 可选的图片位置描述，如 "行5 列M"
   */
  async validateImage(
    imageBuffer: Buffer,
    imageIndex: number,
    position?: string
  ): Promise<ImageValidationResult> {
    // 存储位置映射
    if (position) {
      this.imagePositions.set(imageIndex, position);
    }
    // 1. 获取元数据
    const metadata = await this.imageProcessor.getImageMetadata(imageBuffer);
    if (!metadata) {
      throw new Error("Failed to read image metadata");
    }

    // 2. 模糊检测（使用与 PC Worker 一致的 Laplacian 方差算法）
    const blurScore = await this.imageProcessor.detectBlur(imageBuffer);
    const isBlurry = blurScore < this.BLUR_THRESHOLD;

    // 3. 计算哈希用于重复检测（使用与 PC Worker 完全一致的 bmvbhash 算法）
    const hashResult = await calculateBlockhash(
      imageBuffer,
      this.BLOCKHASH_BITS
    );
    const hash = hashResult.hash;
    this.imageHashes.set(imageIndex, hash);

    // 4. 检测重复（使用与 PC Worker 一致的十六进制汉明距离）
    const duplicateResult = this.checkDuplicate(hash, imageIndex);

    // 5. 边框检测
    const borderResult = await this.imageProcessor.detectBorder(imageBuffer);

    // 6. 可疑度评分（简化版）
    const suspicionResult = this.calculateSuspicionScore({
      width: metadata.width,
      height: metadata.height,
      megapixels: metadata.megapixels,
      mimeType: `image/${metadata.format}`,
      sizeBytes: metadata.size,
      exif: metadata.exif,
      hasBorder: borderResult.hasBorder,
      borderSides: borderResult.borderSides,
      borderWidth: borderResult.borderWidth,
      hasWatermark: false, // 暂未实现水印检测
      watermarkRegions: [],
      watermarkConfidence: 0,
    });

    return {
      isBlurry,
      blurScore,
      isDuplicate: duplicateResult.isDuplicate,
      duplicateOf: duplicateResult.duplicateOf,
      duplicateOfPosition: duplicateResult.duplicateOfPosition,
      suspicionScore: suspicionResult.suspicionScore,
      suspicionLevel: suspicionResult.suspicionLevel,
      suspicionLabel: suspicionResult.suspicionLabel,
      suspicionFactors: suspicionResult.factors,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        megapixels: metadata.megapixels,
      },
    };
  }

  /**
   * 检测图片是否重复
   * 使用与 PC Worker 一致的十六进制汉明距离算法
   */
  private checkDuplicate(
    hash: string,
    currentIndex: number
  ): {
    isDuplicate: boolean;
    duplicateOf?: number;
    duplicateOfPosition?: string;
  } {
    // 添加调试日志
    if (currentIndex < 5) {
      console.log(
        `📷 [重复检测] 图片 #${currentIndex} 哈希: ${hash} (长度: ${hash.length})`
      );
    }

    for (const [index, existingHash] of this.imageHashes) {
      if (index >= currentIndex) continue; // 只与之前的图片比较

      // 使用与 PC Worker 一致的十六进制汉明距离算法
      const distance = calculateHammingDistanceHex(hash, existingHash);

      // 调试日志：输出前几张图片的比较结果
      if (currentIndex < 10 && index < 5) {
        console.log(
          `  比较 #${currentIndex} vs #${index}: 汉明距离 = ${distance}`
        );
      }

      if (distance <= this.DUPLICATE_THRESHOLD) {
        // 获取原始图片的位置信息
        const duplicateOfPosition = this.imagePositions.get(index) || `图片 #${index + 1}`;
        console.log(
          `📷 [重复检测] 发现重复! 图片 #${currentIndex} 与 ${duplicateOfPosition} 重复，汉明距离: ${distance}`
        );
        return {
          isDuplicate: true,
          duplicateOf: index,
          duplicateOfPosition,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * 计算可疑度评分（简化版本）
   * 完整版本见 image-suspicion-scorer.ts
   */
  private calculateSuspicionScore(params: any): {
    suspicionScore: number;
    suspicionLevel: string;
    suspicionLabel: string;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    const { width, height, megapixels, sizeBytes, exif, hasBorder } = params;

    // 1. 尺寸检测
    if (megapixels < 1) {
      score += 10;
      factors.push(`像素较低(${megapixels.toFixed(1)}MP)`);
    }

    // 2. EXIF 检测
    if (!exif || !exif.hasExif) {
      score += 12;
      factors.push("无EXIF信息");
    }

    // 3. 比例检测
    const aspect = Math.max(width, height) / Math.min(width, height);
    if (aspect > 3) {
      score += 15;
      factors.push(`异常比例(${aspect.toFixed(1)}:1)`);
    }

    // 4. 边框检测
    if (hasBorder) {
      score += 8;
      factors.push("存在边框");
    }

    // 5. 文件大小异常
    if (megapixels > 0 && sizeBytes) {
      const kbPerMP = sizeBytes / 1024 / megapixels;
      if (kbPerMP < 120) {
        score += 8;
        factors.push(`强压缩(${kbPerMP.toFixed(0)}KB/MP)`);
      }
    }

    // 计算等级
    let level, label;
    if (score < 20) {
      level = "LOW";
      label = "正常";
    } else if (score < 40) {
      level = "MEDIUM";
      label = "可疑";
    } else if (score < 60) {
      level = "HIGH";
      label = "疑似异常";
    } else {
      level = "CRITICAL";
      label = "高度可疑";
    }

    return {
      suspicionScore: Math.round(score),
      suspicionLevel: level,
      suspicionLabel: label,
      factors,
    };
  }

  /**
   * 重置验证器状态（新文件时调用）
   */
  reset() {
    this.imageHashes.clear();
  }
}

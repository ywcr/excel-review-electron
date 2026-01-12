/**
 * 图片验证器 - 整合模糊检测、重复检测、可疑度评分、水印检测、季节检测
 * 使用与 PC Worker 完全一致的 bmvbhash 算法
 */
import { ImageProcessor } from "../services/image-processor";
import {
  IMAGE_DUP_CONFIG,
  BLUR_CONFIG,
  MODEL_CONFIG,
} from "../config/image-validation-config";
import {
  calculateBlockhash,
  calculateHammingDistanceHex,
} from "../services/blockhash";
import { getClipDetector } from "../services/clip-detector";
import { SeasonValidator } from "./season-validator";
import { validationLogger } from "../utils/logger";
import type { Season, BorderDetectionResult } from "../../shared/types/detection";

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
  // 边框检测
  hasBorder: boolean;
  borderSides: string[];
  borderWidth: Record<string, number>;
  // 季节检测
  detectedSeason: Season;
  seasonMatchesCurrent: boolean;
  seasonMismatchReason?: string;
  seasonConfidence: number;
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
   * 执行季节检测（使用 YOLO + CLIP）
   * 提取公共逻辑，避免代码重复
   * @param position 图片位置描述，如 "行5 列N"
   * @param imageType 图片类型，如 "门头"/"内部"/"图片" - 用于判断是否跳过季节检测
   */
  private async performSeasonDetection(
    imageBuffer: Buffer,
    metadata: { width: number; height: number; format: string },
    imageIndex: number,
    position?: string,
    imageType?: string
  ): Promise<{
    detectedSeason: Season;
    seasonMatchesCurrent: boolean;
    seasonMismatchReason?: string;
    seasonConfidence: number;
  }> {
    // 默认值（模型禁用或检测跳过时返回）
    const defaultResult = {
      detectedSeason: "unknown" as Season,
      seasonMatchesCurrent: true,
      seasonMismatchReason: undefined,
      seasonConfidence: 0,
    };

    // 检查模型总开关
    if (!MODEL_CONFIG.ENABLE_MODEL) {
      validationLogger.debug(`[图片 #${imageIndex}] AI 模型已禁用，跳过检测`);
      return defaultResult;
    }

    // 检查是否为内部照片 - 内部照片跳过季节检测
    // 使用 imageType 判断，支持不同任务类型的动态列配置
    if (imageType === '内部') {
      validationLogger.info(`[图片 #${imageIndex}] 跳过季节检测: 内部照片不需要季节判定`);
      return defaultResult;
    }

    // 预筛选：只对足够大的图片进行检测
    const shouldCheck = SeasonValidator.shouldCheckSeason(metadata);
    validationLogger.debug(`[图片 #${imageIndex}] 尺寸: ${metadata.width}x${metadata.height}, 预筛选: ${shouldCheck ? '通过' : '跳过'}`);

    if (!shouldCheck) {
      return defaultResult;
    }

    try {
      // 1. 先用 YOLO 检测是否有人物/植物
      const { getYoloDetector } = await import("../services/yolo-detector");
      const yoloDetector = getYoloDetector();
      const detections = await yoloDetector.detect(imageBuffer);

      const personDetections = detections.filter(d => d.class === "person");
      const hasPerson = personDetections.length > 0;
      const hasPlant = detections.some(d => d.class === "potted plant");
      
      // 输出检测到的类别（用于诊断）
      const detectedClasses = [...new Set(detections.map(d => d.class))];
      if (detectedClasses.length > 0) {
        validationLogger.info(`[图片 #${imageIndex}] YOLO 检测到: ${detectedClasses.join(", ")} (人物=${hasPerson}, 植物=${hasPlant})`);
      }

      // 如果没有人也没有植物，跳过季节检测
      if (!hasPerson && !hasPlant) {
        validationLogger.debug(`[图片 #${imageIndex}] 无人物无植物，跳过季节检测`);
        return defaultResult;
      }

      // 2. 多人物融合检测：对多个人物分别检测，使用投票机制确定最终季节
      const clipDetector = getClipDetector();
      const currentSeason = SeasonValidator.getCurrentSeason(); // 用于 3% 容差判断
      let finalClipResult: Awaited<ReturnType<typeof clipDetector.detect>> = null;

      if (hasPerson) {
        // 按面积排序，取最大的 3 个人物
        const sortedPersons = [...personDetections].sort((a, b) => {
          const areaA = a.bbox.width * a.bbox.height;
          const areaB = b.bbox.width * b.bbox.height;
          return areaB - areaA;
        }).slice(0, 3);

        if (sortedPersons.length === 1) {
          // 单人：检查人物面积是否足够大
          const person = sortedPersons[0];
          const areaRatio = (person.bbox.width * person.bbox.height) / (metadata.width * metadata.height) * 100;
          
          // 最小人物面积阈值（原始图片中的占比）
          // 如果人物太小，裁剪后的图片质量太差，无法可靠检测
          const MIN_CROP_AREA_PERCENT = 3.0; // 3%
          
          if (areaRatio < MIN_CROP_AREA_PERCENT) {
            validationLogger.info(`[图片 #${imageIndex}] 人物面积太小 (${areaRatio.toFixed(1)}% < ${MIN_CROP_AREA_PERCENT}%)，跳过季节检测`);
            return defaultResult;
          }
          
          try {
            const croppedBuffer = await yoloDetector.cropObject(imageBuffer, person, 0.15);
            validationLogger.info(`[图片 #${imageIndex}] 已裁剪人物区域 (占比: ${areaRatio.toFixed(1)}%)`);
            // 裁剪后人物占满区域，设置 personAreaRatio 为 1.0
            finalClipResult = await clipDetector.detect(croppedBuffer, { hasPerson, hasPlant, personAreaRatio: 1.0 }, currentSeason);
          } catch {
            // 裁剪失败时使用原始图片，传递原始面积比例
            validationLogger.warn(`[图片 #${imageIndex}] 人物区域裁剪失败，使用原始图片`);
            finalClipResult = await clipDetector.detect(imageBuffer, { hasPerson, hasPlant, personAreaRatio: areaRatio / 100 }, currentSeason);
          }
        } else {
          // 多人：分别检测后投票
          validationLogger.info(`[图片 #${imageIndex}] 检测到 ${sortedPersons.length} 人，启用投票机制`);
          const seasonVotes: Record<string, { count: number; totalScore: number }> = {};
          
          for (let i = 0; i < sortedPersons.length; i++) {
            const person = sortedPersons[i];
            try {
              const croppedBuffer = await yoloDetector.cropObject(imageBuffer, person, 0.15);
              // 裁剪后人物占满区域
              const result = await clipDetector.detect(croppedBuffer, { hasPerson: true, hasPlant: false, personAreaRatio: 1.0 }, currentSeason);
              
              if (result && result.detectedSeason !== "unknown") {
                const season = result.detectedSeason;
                if (!seasonVotes[season]) {
                  seasonVotes[season] = { count: 0, totalScore: 0 };
                }
                seasonVotes[season].count += 1;
                seasonVotes[season].totalScore += result.seasonConfidence;
                validationLogger.debug(`[图片 #${imageIndex}] 人物 ${i + 1}: ${season} (${result.seasonConfidence.toFixed(1)}%)`);
              }
            } catch {
              validationLogger.warn(`[图片 #${imageIndex}] 人物 ${i + 1} 裁剪失败，跳过`);
            }
          }

          // 检查是否有人被检测为当前季节（只要有一个人符合就通过）
          const hasCurrentSeasonMatch = Object.keys(seasonVotes).includes(currentSeason);
          
          // 投票结果排序备用
          const sortedVotes = Object.entries(seasonVotes).sort((a, b) => {
            if (b[1].count !== a[1].count) return b[1].count - a[1].count;
            return (b[1].totalScore / b[1].count) - (a[1].totalScore / a[1].count);
          });
          
          if (hasCurrentSeasonMatch) {
            // 有人被检测为当前季节，直接使用当前季节
            const matchData = seasonVotes[currentSeason];
            const avgConfidence = matchData.totalScore / matchData.count;
            validationLogger.info(`[图片 #${imageIndex}] ✓ 检测到当前季节(${currentSeason}): ${matchData.count}/${sortedPersons.length}人, 平均置信度: ${avgConfidence.toFixed(1)}%`);
            
            finalClipResult = {
              detectedSeason: currentSeason,
              seasonConfidence: avgConfidence,
              clothingSeason: currentSeason,
              hasPerson: true,
              hasPlant,
              rawScores: {},
            };
          } else if (sortedVotes.length > 0) {
            // 没有人匹配当前季节，使用投票最多的季节
            const [winnerSeason, winnerData] = sortedVotes[0];
            const avgConfidence = winnerData.totalScore / winnerData.count;
            const voteRatio = winnerData.count / sortedPersons.length;
            
            validationLogger.info(`[图片 #${imageIndex}] 投票结果: ${winnerSeason} (票数: ${winnerData.count}/${sortedPersons.length}, 平均置信度: ${avgConfidence.toFixed(1)}%)`);
            
            // 弱投票检测：如果投票人数不到一半，且置信度较低，视为不确定
            // 这样可以避免只有 1/3 人投票且置信度低时做出错误判断
            const isWeakVote = voteRatio < 0.5 && avgConfidence < 28;
            
            if (isWeakVote) {
              validationLogger.info(`[图片 #${imageIndex}] 投票信号较弱 (${winnerData.count}/${sortedPersons.length}人, ${avgConfidence.toFixed(1)}% < 28%)，视为不确定`);
              finalClipResult = {
                detectedSeason: "unknown" as Season,
                seasonConfidence: 0,
                clothingSeason: undefined,
                hasPerson: true,
                hasPlant,
                rawScores: {},
              };
            } else {
              finalClipResult = {
                detectedSeason: winnerSeason as Season,
                seasonConfidence: avgConfidence,
                clothingSeason: winnerSeason as Season,
                hasPerson: true,
                hasPlant,
                rawScores: {},
              };
            }
          } else {
            // 所有投票都失败，使用原图检测（传递最大人物的面积比例）
            const maxPersonArea = sortedPersons[0].bbox.width * sortedPersons[0].bbox.height;
            const maxPersonAreaRatio = maxPersonArea / (metadata.width * metadata.height);
            finalClipResult = await clipDetector.detect(imageBuffer, { hasPerson, hasPlant, personAreaRatio: maxPersonAreaRatio }, currentSeason);
          }
        }
      } else {
        // 只有植物没有人物：裁剪植物区域后检测
        const plantDetections = detections.filter(d => d.class === "potted plant");
        
        // 按面积排序，取最大的植物
        const sortedPlants = [...plantDetections].sort((a, b) => {
          const areaA = a.bbox.width * a.bbox.height;
          const areaB = b.bbox.width * b.bbox.height;
          return areaB - areaA;
        });

        if (sortedPlants.length > 0) {
          const plant = sortedPlants[0];
          const areaRatio = (plant.bbox.width * plant.bbox.height) / (metadata.width * metadata.height) * 100;
          
          try {
            const croppedBuffer = await yoloDetector.cropObject(imageBuffer, plant, 0.2);
            validationLogger.info(`[图片 #${imageIndex}] 已裁剪植物区域 (占比: ${areaRatio.toFixed(1)}%)`);
            finalClipResult = await clipDetector.detect(croppedBuffer, { hasPerson: false, hasPlant: true }, currentSeason);
          } catch {
            // 裁剪失败时使用原始图片
            validationLogger.warn(`[图片 #${imageIndex}] 植物区域裁剪失败，使用原始图片`);
            finalClipResult = await clipDetector.detect(imageBuffer, { hasPerson: false, hasPlant }, currentSeason);
          }
        } else {
          // 无法获取植物检测结果，使用原图
          finalClipResult = await clipDetector.detect(imageBuffer, { hasPerson: false, hasPlant }, currentSeason);
        }
      }

      if (!finalClipResult) {
        validationLogger.warn(`[图片 #${imageIndex}] CLIP 检测返回 null（模型可能未初始化）`);
        return defaultResult;
      }

      // 4. 验证季节是否符合当前月份
      const seasonValidation = SeasonValidator.validate(finalClipResult);

      validationLogger.info(`[图片 #${imageIndex}] 最终结果: 季节=${finalClipResult.detectedSeason}, 穿着=${finalClipResult.clothingSeason || '无'}, 匹配当前=${seasonValidation.matchesCurrent}`);

      return {
        detectedSeason: finalClipResult.detectedSeason,
        seasonMatchesCurrent: seasonValidation.matchesCurrent,
        seasonMismatchReason: seasonValidation.mismatchReason,
        seasonConfidence: finalClipResult.seasonConfidence,
      };
    } catch (error) {
      validationLogger.error(`[图片 #${imageIndex}] 季节检测失败:`, error);
      return defaultResult;
    }
  }

  /**
   * 构建最终验证结果
   * 提取公共逻辑，避免代码重复
   */
  private buildValidationResult(
    isBlurry: boolean,
    blurScore: number,
    duplicateResult: { isDuplicate: boolean; duplicateOf?: number; duplicateOfPosition?: string },
    metadata: { width: number; height: number; format: string; size: number; megapixels: number; exif?: Record<string, unknown> },
    borderResult: BorderDetectionResult,
    seasonResult: {
      detectedSeason: Season;
      seasonMatchesCurrent: boolean;
      seasonMismatchReason?: string;
      seasonConfidence: number;
    }
  ): ImageValidationResult {
    // 可疑度评分（移除水印相关参数）
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
      hasWatermark: false,
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
      hasBorder: borderResult.hasBorder,
      borderSides: borderResult.borderSides,
      borderWidth: borderResult.borderWidth,
      detectedSeason: seasonResult.detectedSeason,
      seasonMatchesCurrent: seasonResult.seasonMatchesCurrent,
      seasonMismatchReason: seasonResult.seasonMismatchReason,
      seasonConfidence: seasonResult.seasonConfidence,
    };
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
    const hashResult = await calculateBlockhash(imageBuffer, this.BLOCKHASH_BITS);
    const hash = hashResult.hash;
    this.imageHashes.set(imageIndex, hash);

    // 4. 检测重复（使用与 PC Worker 一致的十六进制汉明距离）
    const duplicateResult = this.checkDuplicate(hash, imageIndex);

    // 5. 边框检测
    const borderResult = await this.imageProcessor.detectBorder(imageBuffer);

    // 6. 季节检测 - 使用提取的公共方法
    const seasonResult = await this.performSeasonDetection(imageBuffer, metadata, imageIndex, position);

    // 7. 构建并返回结果 - 使用提取的公共方法
    return this.buildValidationResult(
      isBlurry,
      blurScore,
      duplicateResult,
      metadata,
      borderResult,
      seasonResult
    );
  }

  /**
   * 阶段一：预计算所有图片的哈希（必须顺序执行以保证重复检测正确）
   * @returns 返回哈希数组，索引与图片索引对应
   */
  async precomputeHashes(
    images: Array<{ buffer: Buffer; position?: string }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> {
    const hashes: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      // 存储位置映射
      if (img.position) {
        this.imagePositions.set(i, img.position);
      }

      // 计算哈希
      const hashResult = await calculateBlockhash(
        img.buffer,
        this.BLOCKHASH_BITS
      );
      const hash = hashResult.hash;
      this.imageHashes.set(i, hash);
      hashes.push(hash);

      onProgress?.(i + 1, images.length);
    }

    return hashes;
  }

  /**
   * 阶段二：并行验证图片（假设哈希已通过 precomputeHashes 计算完毕）
   * @param imageBuffer 图片 Buffer
   * @param imageIndex 图片索引
   * @param precomputedHash 已预计算的哈希
   * @param position 图片位置描述，如 "行5 列M"
   * @param imageType 图片类型，如 "门头"/"内部"/"图片" - 用于内部照片跳过季节检测
   * @param enableModelCapabilities 是否启用模型能力（YOLO/CLIP季节检测等），默认true，为false时跳过季节检测
   * @returns 验证结果
   */
  async validateImageWithPrecomputedHash(
    imageBuffer: Buffer,
    imageIndex: number,
    precomputedHash: string,
    position?: string,
    imageType?: string,
    enableModelCapabilities?: boolean
  ): Promise<ImageValidationResult> {
    // 1. 并行执行：元数据获取、模糊检测、边框检测
    const [metadata, blurScore, borderResult] = await Promise.all([
      this.imageProcessor.getImageMetadata(imageBuffer),
      this.imageProcessor.detectBlur(imageBuffer),
      this.imageProcessor.detectBorder(imageBuffer),
    ]);

    if (!metadata) {
      throw new Error("Failed to read image metadata");
    }

    // 2. 模糊判断（Laplacian 方法）
    const isBlurry = blurScore < this.BLUR_THRESHOLD;

    // 3. 检测重复（使用预计算的哈希）
    const duplicateResult = this.checkDuplicate(precomputedHash, imageIndex);

    // 4. 季节检测 - 使用提取的公共方法，传递 position 和 imageType
    // 如果 enableModelCapabilities 为 false，跳过季节检测
    let seasonResult;
    if (enableModelCapabilities === false) {
      validationLogger.debug(`[图片 #${imageIndex}] 模型能力已关闭，跳过季节检测`);
      seasonResult = {
        detectedSeason: "unknown" as Season,
        seasonMatchesCurrent: true,
        seasonMismatchReason: undefined,
        seasonConfidence: 0,
      };
    } else {
      seasonResult = await this.performSeasonDetection(imageBuffer, metadata, imageIndex, position, imageType);
    }

    // 5. 构建并返回结果 - 使用提取的公共方法
    return this.buildValidationResult(
      isBlurry,
      blurScore,
      duplicateResult,
      metadata,
      borderResult,
      seasonResult
    );
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
    // 调试日志：仅输出前几张图片
    if (currentIndex < 5) {
      validationLogger.debug(`图片 #${currentIndex} 哈希: ${hash} (长度: ${hash.length})`);
    }

    for (const [index, existingHash] of this.imageHashes) {
      if (index >= currentIndex) continue; // 只与之前的图片比较

      // 使用与 PC Worker 一致的十六进制汉明距离算法
      const distance = calculateHammingDistanceHex(hash, existingHash);

      // 调试日志：输出前几张图片的比较结果
      if (currentIndex < 10 && index < 5) {
        validationLogger.debug(`比较 #${currentIndex} vs #${index}: 汉明距离 = ${distance}`);
      }

      if (distance <= this.DUPLICATE_THRESHOLD) {
        // 获取原始图片的位置信息
        const duplicateOfPosition = this.imagePositions.get(index) || `图片 #${index + 1}`;
        validationLogger.info(`发现重复! 图片 #${currentIndex} 与 ${duplicateOfPosition} 重复，汉明距离: ${distance}`);
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

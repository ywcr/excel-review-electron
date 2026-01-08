/**
 * 物体重复检测服务
 * 使用 YOLO 检测物体 + CLIP 特征匹配 来检测多张图片中的重复物体
 * 
 * 功能：
 * - 检测人物重复（同一个人出现在多张照片中）
 * - 检测车辆重复（相同的汽车、电动车、自行车等）
 * - 检测摆放物品重复（相同的展示品、道具、装饰物等）
 */

import { getYoloDetector } from "./yolo-detector";
import { getClipDetector } from "./clip-detector";
import { getReidDetector } from "./reid-detector";
import { duplicateLogger } from "../utils/logger";
import type { 
  DetectedObject,
  ObjectFeature,
  ObjectDuplicateMatch,
  ObjectDuplicateResult,
} from "../../shared/types/detection";

// ==================== 配置 ====================

/** 物体重复检测配置 */
export const OBJECT_DUPLICATE_CONFIG = {
  /** 默认相似度阈值：超过此值判定为同一物体 */
  SIMILARITY_THRESHOLD: 0.85, // 降低以检测更多重复

  /** 不同物体类型的相似度阈值 */
  CLASS_SIMILARITY_THRESHOLDS: {
    // 人物使用 ReID 模型
    // 相似衣着的人可能有 70-85% 相似度，但需要检测同一人
    person: 0.85, // 降低以检测穿着相同的同一人

    // 车辆类 - 需要高阈值，相同颜色车辆容易误报
    car: 0.88,
    truck: 0.88,
    bus: 0.88,

    // 两轮车 - 需要高阈值
    motorcycle: 0.85,
    bicycle: 0.85,

    // 椅子/凳子类 - 降低以检测小凳子
    chair: 0.80,
    bench: 0.80,

    // 其他物品 - 默认阈值
  } as Record<string, number>,
  
  /** 排除的物体类别（现已移除 person，使用 ReID 检测） */
  EXCLUDED_CLASSES: [] as string[],
  
  /** 最小物体面积比例（相对于图片总面积）：低于此值的物体忽略 */
  MIN_OBJECT_AREA_RATIO: 0.002, // 0.2% (更低以检测小物体)
  
  /** 最大物体面积比例：超过此值的物体可能是背景，忽略 */
  MAX_OBJECT_AREA_RATIO: 0.8, // 80%
  
  /** 最小图片数量：至少需要这么多图片才进行检测 */
  MIN_IMAGES: 2,
  
  /** 每张图片最多检测的物体数量（控制内存使用） */
  MAX_OBJECTS_PER_IMAGE: 10,
  
  /** 分批处理大小：每批处理这么多图片后进行特征比较 */
  BATCH_SIZE: 5,
};

// ==================== 类型定义 ====================

/** 图片物体信息（不保存原始 buffer 以节省内存） */
interface ImageObjects {
  imageIndex: number;
  position?: string;  // 如 "行5 列M"
  objects: DetectedObject[];
  features: ObjectFeature[];
}

// ==================== 核心类 ====================

export class ObjectDuplicateDetector {
  private yoloDetector = getYoloDetector();
  private clipDetector = getClipDetector();
  private reidDetector = getReidDetector();
  private isInitialized = false;
  private reidAvailable = false;

  /**
   * 初始化检测器
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      // 确保 CLIP 检测器已初始化
      const clipReady = await this.clipDetector.initialize();
      if (!clipReady) {
        duplicateLogger.warn("CLIP 检测器初始化失败，物体重复检测功能受限");
        return false;
      }
      
      // 尝试初始化 ReID 检测器（可选，用于人物重复检测）
      this.reidAvailable = await this.reidDetector.initialize();
      if (this.reidAvailable) {
        duplicateLogger.success("ReID 检测器初始化成功，人物重复检测已启用");
      } else {
        duplicateLogger.warn("ReID 检测器初始化失败，人物重复检测使用 CLIP 降级模式");
      }
      
      this.isInitialized = true;
      duplicateLogger.success("物体重复检测器初始化成功");
      return true;
    } catch (error) {
      duplicateLogger.error("初始化失败:", error);
      return false;
    }
  }

  /**
   * 检测多张图片中的重复物体
   * 使用分批处理策略，支持任意数量的图片
   * @param images 图片数组，每项包含 buffer 和可选的位置信息
   * @param groupKey 分组键（可选，用于只比较同组图片）
   */
  async detectDuplicates(
    images: Array<{ buffer: Buffer; position?: string }>,
    groupKey?: string
  ): Promise<ObjectDuplicateResult> {
    // 检查最小图片数
    if (images.length < OBJECT_DUPLICATE_CONFIG.MIN_IMAGES) {
      return {
        hasDuplicate: false,
        duplicates: [],
        totalObjectsDetected: 0,
        totalImages: images.length,
      };
    }

    await this.initialize();

    const totalImages = images.length;
    duplicateLogger.info(`开始物体重复检测: ${totalImages} 张图片${groupKey ? ` (分组: ${groupKey})` : ""}`);

    // 使用滑动窗口分批处理，控制内存使用
    const batchSize = OBJECT_DUPLICATE_CONFIG.BATCH_SIZE;
    const allDuplicates: ObjectDuplicateMatch[] = [];
    let totalObjectsDetected = 0;
    
    // 存储已处理图片的简化特征（用于跨批次比较）
    const processedFeatures: Array<{
      imageIndex: number;
      position?: string;
      objectClass: string;
      objectClassCN: string;
      embedding: Float32Array;
      bbox: DetectedObject["bbox"];
    }> = [];

    // 分批处理图片
    for (let batchStart = 0; batchStart < totalImages; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalImages);
      duplicateLogger.debug(`处理批次 ${Math.floor(batchStart / batchSize) + 1}: 图片 ${batchStart + 1}-${batchEnd}`);

      // 提取当前批次的特征
      const batchFeatures: typeof processedFeatures = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const { buffer, position } = images[i];
        try {
          const imageObjects = await this.extractObjectFeatures(buffer, i, position);
          totalObjectsDetected += imageObjects.features.length;

          // 将特征转换为简化格式存储
          for (const feat of imageObjects.features) {
            batchFeatures.push({
              imageIndex: feat.imageIndex,
              position: feat.imagePosition,
              objectClass: feat.object.class,
              objectClassCN: feat.object.classNameCN,
              embedding: feat.embedding,
              bbox: feat.object.bbox,
            });
          }

          duplicateLogger.debug(`图片 ${i + 1}: ${imageObjects.features.length} 个物体特征`);
        } catch (error) {
          duplicateLogger.warn(`图片 ${i + 1} 处理失败:`, error);
        }
      }

      // 批次内比较
      const batchDuplicates = this.compareFeaturesInBatch(batchFeatures);
      allDuplicates.push(...batchDuplicates);

      // 当前批次与之前所有批次比较
      if (processedFeatures.length > 0) {
        const crossBatchDuplicates = this.compareFeaturesCrossBatch(batchFeatures, processedFeatures);
        allDuplicates.push(...crossBatchDuplicates);
      }

      // 添加当前批次特征到已处理列表（只保留必要信息用于后续比较）
      processedFeatures.push(...batchFeatures);

      // 每批次后尝试释放内存
      if (global.gc) {
        global.gc();
      }
    }

    duplicateLogger.info(`检测完成: 发现 ${allDuplicates.length} 组重复物体, 共检测 ${totalObjectsDetected} 个物体`);

    // 清理内存
    processedFeatures.length = 0;
    if (global.gc) {
      global.gc();
    }

    return {
      hasDuplicate: allDuplicates.length > 0,
      duplicates: allDuplicates,
      totalObjectsDetected,
      totalImages,
    };
  }

  /**
   * 在单个批次内比较特征
   */
  private compareFeaturesInBatch(
    features: Array<{
      imageIndex: number;
      position?: string;
      objectClass: string;
      objectClassCN: string;
      embedding: Float32Array;
      bbox: DetectedObject["bbox"];
    }>
  ): ObjectDuplicateMatch[] {
    const duplicates: ObjectDuplicateMatch[] = [];
    const matched = new Set<string>();

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const feat1 = features[i];
        const feat2 = features[j];

        // 跳过同一张图片的物体
        if (feat1.imageIndex === feat2.imageIndex) continue;
        // 只比较同类物体
        if (feat1.objectClass !== feat2.objectClass) continue;
        // 跳过被排除的类别（如 person）
        if (OBJECT_DUPLICATE_CONFIG.EXCLUDED_CLASSES.includes(feat1.objectClass)) continue;

        const matchKey = `${feat1.imageIndex}-${feat2.imageIndex}-${feat1.objectClass}`;
        if (matched.has(matchKey)) continue;

        const similarity = this.cosineSimilarity(feat1.embedding, feat2.embedding);
        // 使用类别特定阈值或默认阈值
        const threshold = OBJECT_DUPLICATE_CONFIG.CLASS_SIMILARITY_THRESHOLDS[feat1.objectClass] 
          || OBJECT_DUPLICATE_CONFIG.SIMILARITY_THRESHOLD;
        if (similarity >= threshold) {
          duplicates.push({
            objectClass: feat1.objectClass,
            objectClassCN: feat1.objectClassCN,
            image1Index: feat1.imageIndex,
            image2Index: feat2.imageIndex,
            image1Position: feat1.position,
            image2Position: feat2.position,
            similarity,
            bbox1: feat1.bbox,
            bbox2: feat2.bbox,
          });
          matched.add(matchKey);

          duplicateLogger.info(
            `发现重复: ${feat1.objectClassCN} ` +
            `(图${feat1.imageIndex + 1}${feat1.position ? ` ${feat1.position}` : ""} ↔ ` +
            `图${feat2.imageIndex + 1}${feat2.position ? ` ${feat2.position}` : ""}) ` +
            `相似度: ${(similarity * 100).toFixed(1)}%`
          );
        }
      }
    }

    return duplicates;
  }

  /**
   * 跨批次比较特征
   */
  private compareFeaturesCrossBatch(
    currentBatch: Array<{
      imageIndex: number;
      position?: string;
      objectClass: string;
      objectClassCN: string;
      embedding: Float32Array;
      bbox: DetectedObject["bbox"];
    }>,
    previousFeatures: Array<{
      imageIndex: number;
      position?: string;
      objectClass: string;
      objectClassCN: string;
      embedding: Float32Array;
      bbox: DetectedObject["bbox"];
    }>
  ): ObjectDuplicateMatch[] {
    const duplicates: ObjectDuplicateMatch[] = [];
    const matched = new Set<string>();

    for (const feat1 of currentBatch) {
      for (const feat2 of previousFeatures) {
        // 只比较同类物体
        if (feat1.objectClass !== feat2.objectClass) continue;
        // 跳过被排除的类别（如 person）
        if (OBJECT_DUPLICATE_CONFIG.EXCLUDED_CLASSES.includes(feat1.objectClass)) continue;

        const matchKey = `${Math.min(feat1.imageIndex, feat2.imageIndex)}-${Math.max(feat1.imageIndex, feat2.imageIndex)}-${feat1.objectClass}`;
        if (matched.has(matchKey)) continue;

        const similarity = this.cosineSimilarity(feat1.embedding, feat2.embedding);
        // 使用类别特定阈值或默认阈值
        const threshold = OBJECT_DUPLICATE_CONFIG.CLASS_SIMILARITY_THRESHOLDS[feat1.objectClass] 
          || OBJECT_DUPLICATE_CONFIG.SIMILARITY_THRESHOLD;
        if (similarity >= threshold) {
          duplicates.push({
            objectClass: feat1.objectClass,
            objectClassCN: feat1.objectClassCN,
            image1Index: feat2.imageIndex, // 之前的图片
            image2Index: feat1.imageIndex, // 当前的图片
            image1Position: feat2.position,
            image2Position: feat1.position,
            similarity,
            bbox1: feat2.bbox,
            bbox2: feat1.bbox,
          });
          matched.add(matchKey);

          duplicateLogger.info(
            `发现跨批次重复: ${feat1.objectClassCN} ` +
            `(图${feat2.imageIndex + 1} ↔ 图${feat1.imageIndex + 1}) ` +
            `相似度: ${(similarity * 100).toFixed(1)}%`
          );
        }
      }
    }

    return duplicates;
  }

  /**
   * 提取单张图片中的物体特征
   */
  private async extractObjectFeatures(
    imageBuffer: Buffer,
    imageIndex: number,
    position?: string
  ): Promise<ImageObjects> {
    // 1. YOLO 检测物体
    const allDetections = await this.yoloDetector.detect(imageBuffer);
    const movableObjects = this.yoloDetector.getMovableObjects(allDetections);

    // 📋 诊断日志：输出 YOLO 检测到的所有可移动物体
    if (movableObjects.length > 0) {
      const objList = movableObjects.map(o => `${o.classNameCN}(${(o.confidence * 100).toFixed(0)}%)`).join(", ");
      duplicateLogger.debug(`[图${imageIndex + 1}] YOLO检测到: ${objList}`);
    }

    // 2. 过滤太小或太大的物体
    const metadata = await require("sharp")(imageBuffer).metadata();
    const imageArea = (metadata.width || 640) * (metadata.height || 640);
    
    let filteredObjects = movableObjects.filter(obj => {
      const objArea = obj.bbox.width * obj.bbox.height;
      const ratio = objArea / imageArea;
      const pass = ratio >= OBJECT_DUPLICATE_CONFIG.MIN_OBJECT_AREA_RATIO 
          && ratio <= OBJECT_DUPLICATE_CONFIG.MAX_OBJECT_AREA_RATIO;
      
      // 📋 诊断日志：输出被过滤掉的物体
      if (!pass) {
        duplicateLogger.debug(`[图${imageIndex + 1}] ⚠️ ${obj.classNameCN}被过滤: 面积比=${(ratio * 100).toFixed(2)}% (阈值: ${OBJECT_DUPLICATE_CONFIG.MIN_OBJECT_AREA_RATIO * 100}%-${OBJECT_DUPLICATE_CONFIG.MAX_OBJECT_AREA_RATIO * 100}%)`);
      }
      return pass;
    });

    // 📋 诊断日志：输出过滤后保留的物体
    if (filteredObjects.length > 0) {
      const objList = filteredObjects.map(o => o.classNameCN).join(", ");
      duplicateLogger.debug(`[图${imageIndex + 1}] 过滤后保留: ${objList}`);
    } else if (movableObjects.length > 0) {
      duplicateLogger.debug(`[图${imageIndex + 1}] 所有物体都被面积过滤掉了`);
    }

    // 限制每张图片的物体数量，优先保留置信度高的
    if (filteredObjects.length > OBJECT_DUPLICATE_CONFIG.MAX_OBJECTS_PER_IMAGE) {
      filteredObjects = filteredObjects
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, OBJECT_DUPLICATE_CONFIG.MAX_OBJECTS_PER_IMAGE);
    }

    // 3. 对每个物体提取特征（person 使用 ReID，其他使用 CLIP）
    const features: ObjectFeature[] = [];
    
    for (const obj of filteredObjects) {
      try {
        // 裁剪物体区域
        const croppedBuffer = await this.yoloDetector.cropObject(imageBuffer, obj, 0.1);
        
        let embedding: Float32Array | null = null;
        
        if (obj.class === 'person' && this.reidAvailable) {
          // 人物使用 ReID 模型
          embedding = await this.reidDetector.getPersonEmbedding(croppedBuffer);
          if (embedding) {
            duplicateLogger.debug(`[ReID] 提取人物特征成功 (图${imageIndex + 1})`);
          }
        } else {
          // 其他物体使用 CLIP
          embedding = await this.clipDetector.getImageEmbedding(croppedBuffer);
        }
        
        if (embedding) {
          features.push({
            imageIndex,
            imagePosition: position,
            object: obj,
            embedding,
          });
        }
      } catch (error) {
        duplicateLogger.debug(`物体特征提取失败 (${obj.class}):`, error);
      }
    }

    return {
      imageIndex,
      position,
      objects: filteredObjects,
      features,
    };
  }

  

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// ==================== 单例 ====================

let objectDuplicateDetector: ObjectDuplicateDetector | null = null;

export function getObjectDuplicateDetector(): ObjectDuplicateDetector {
  if (!objectDuplicateDetector) {
    objectDuplicateDetector = new ObjectDuplicateDetector();
  }
  return objectDuplicateDetector;
}


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
  /** 相似度阈值：超过此值判定为同一物体 */
  SIMILARITY_THRESHOLD: 0.85,
  
  /** 最小物体面积比例（相对于图片总面积）：低于此值的物体忽略 */
  MIN_OBJECT_AREA_RATIO: 0.01, // 1%
  
  /** 最大物体面积比例：超过此值的物体可能是背景，忽略 */
  MAX_OBJECT_AREA_RATIO: 0.8, // 80%
  
  /** 最小图片数量：至少需要这么多图片才进行检测 */
  MIN_IMAGES: 2,
  
  /** 并行处理批量大小 */
  BATCH_SIZE: 5,
};

// ==================== 类型定义 ====================

/** 图片物体信息 */
interface ImageObjects {
  imageIndex: number;
  imageBuffer: Buffer;
  position?: string;  // 如 "行5 列M"
  objects: DetectedObject[];
  features: ObjectFeature[];
}

// ==================== 核心类 ====================

export class ObjectDuplicateDetector {
  private yoloDetector = getYoloDetector();
  private clipDetector = getClipDetector();
  private isInitialized = false;

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
   * @param images 图片数组，每项包含 buffer 和可选的位置信息
   * @param groupKey 分组键（可选，用于只比较同组图片）
   */
  async detectDuplicates(
    images: Array<{ buffer: Buffer; position?: string }>,
    groupKey?: string
  ): Promise<ObjectDuplicateResult> {
    if (images.length < OBJECT_DUPLICATE_CONFIG.MIN_IMAGES) {
      return {
        hasDuplicate: false,
        duplicates: [],
        totalObjectsDetected: 0,
        totalImages: images.length,
      };
    }

    await this.initialize();

    duplicateLogger.info(`开始物体重复检测: ${images.length} 张图片${groupKey ? ` (分组: ${groupKey})` : ""}`);

    // 1. 对每张图片进行物体检测和特征提取
    const imageObjectsList: ImageObjects[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const { buffer, position } = images[i];
      try {
        const imageObjects = await this.extractObjectFeatures(buffer, i, position);
        imageObjectsList.push(imageObjects);
        duplicateLogger.debug(`图片 ${i + 1}: 检测到 ${imageObjects.objects.length} 个物体, ${imageObjects.features.length} 个有效特征`);
      } catch (error) {
        duplicateLogger.warn(`图片 ${i + 1} 处理失败:`, error);
      }
    }

    // 2. 跨图片比较物体特征
    const duplicates = await this.findDuplicates(imageObjectsList);

    // 3. 统计结果
    const totalObjects = imageObjectsList.reduce((sum, img) => sum + img.features.length, 0);
    
    duplicateLogger.info(`检测完成: 发现 ${duplicates.length} 组重复物体, 共检测 ${totalObjects} 个物体`);

    return {
      hasDuplicate: duplicates.length > 0,
      duplicates,
      totalObjectsDetected: totalObjects,
      totalImages: images.length,
    };
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

    // 2. 过滤太小或太大的物体
    const metadata = await require("sharp")(imageBuffer).metadata();
    const imageArea = (metadata.width || 640) * (metadata.height || 640);
    
    const filteredObjects = movableObjects.filter(obj => {
      const objArea = obj.bbox.width * obj.bbox.height;
      const ratio = objArea / imageArea;
      return ratio >= OBJECT_DUPLICATE_CONFIG.MIN_OBJECT_AREA_RATIO 
          && ratio <= OBJECT_DUPLICATE_CONFIG.MAX_OBJECT_AREA_RATIO;
    });

    // 3. 对每个物体提取 CLIP 特征
    const features: ObjectFeature[] = [];
    
    for (const obj of filteredObjects) {
      try {
        // 裁剪物体区域
        const croppedBuffer = await this.yoloDetector.cropObject(imageBuffer, obj, 0.1);
        
        // 获取 CLIP 嵌入
        const embedding = await this.clipDetector.getImageEmbedding(croppedBuffer);
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
      imageBuffer,
      position,
      objects: filteredObjects,
      features,
    };
  }

  /**
   * 在图片之间查找重复物体
   */
  private async findDuplicates(
    imageObjectsList: ImageObjects[]
  ): Promise<ObjectDuplicateMatch[]> {
    const duplicates: ObjectDuplicateMatch[] = [];
    const matched = new Set<string>(); // 避免重复匹配

    // 两两比较图片
    for (let i = 0; i < imageObjectsList.length; i++) {
      for (let j = i + 1; j < imageObjectsList.length; j++) {
        const img1 = imageObjectsList[i];
        const img2 = imageObjectsList[j];

        // 比较同类物体
        for (const feat1 of img1.features) {
          for (const feat2 of img2.features) {
            // 只比较同类物体
            if (feat1.object.class !== feat2.object.class) continue;

            // 检查是否已匹配过
            const matchKey = `${i}-${j}-${feat1.object.class}-${feat1.object.bbox.x.toFixed(0)}-${feat2.object.bbox.x.toFixed(0)}`;
            if (matched.has(matchKey)) continue;

            // 计算特征相似度
            const similarity = this.cosineSimilarity(feat1.embedding, feat2.embedding);

            if (similarity >= OBJECT_DUPLICATE_CONFIG.SIMILARITY_THRESHOLD) {
              duplicates.push({
                objectClass: feat1.object.class,
                objectClassCN: feat1.object.classNameCN,
                image1Index: i,
                image2Index: j,
                image1Position: img1.position,
                image2Position: img2.position,
                similarity,
                bbox1: feat1.object.bbox,
                bbox2: feat2.object.bbox,
              });
              matched.add(matchKey);
              
              duplicateLogger.info(
                `发现重复: ${feat1.object.classNameCN} ` +
                `(图${i + 1}${img1.position ? ` ${img1.position}` : ""} ↔ ` +
                `图${j + 1}${img2.position ? ` ${img2.position}` : ""}) ` +
                `相似度: ${(similarity * 100).toFixed(1)}%`
              );
            }
          }
        }
      }
    }

    return duplicates;
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


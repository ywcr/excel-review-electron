/**
 * 检测相关类型定义
 * 集中管理 CLIP、YOLO 等模型检测的类型定义
 */

// ==================== 季节相关 ====================

/** 季节定义（中国北方） */
export type Season = "spring" | "summer" | "autumn" | "winter" | "unknown";

/** 季节中文名称映射 */
export const SEASON_NAMES: Record<Season, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
  unknown: "未知",
};

/** 中国北方季节月份映射 */
export const SEASON_MONTHS: Record<Season, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
  unknown: [],
};

// ==================== CLIP 检测结果 ====================

/** CLIP 季节检测结果（精简版，只包含季节检测） */
export interface ClipDetectionResult {
  // 季节检测
  detectedSeason: Season;
  seasonConfidence: number;

  // 细分季节来源
  clothingSeason?: Season;    // 基于穿着判断的季节
  scenerySeason?: Season;     // 基于植物/场景判断的季节

  // 检测元信息
  hasPerson: boolean;         // 是否检测到人物
  hasPlant: boolean;          // 是否检测到植物

  // 原始分数（调试用）
  rawScores?: Record<string, number>;
}

// ==================== 季节验证结果 ====================

/** 季节验证结果 */
export interface SeasonValidationResult {
  /** 是否符合当前季节 */
  matchesCurrent: boolean;
  /** 当前季节 */
  currentSeason: Season;
  /** 检测到的季节 */
  detectedSeason: Season;
  /** 不符原因（如果不符） */
  mismatchReason?: string;
  /** 置信度 */
  confidence: number;
}

// ==================== YOLO 检测结果 ====================

/** YOLO 检测到的物体 */
export interface DetectedObject {
  class: string;
  classNameCN: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** 可移动物体类别（用于重复检测） */
export const MOVABLE_OBJECT_CLASSES = [
  // 人物
  "person",
  // 车辆
  "bicycle", "car", "motorcycle", "bus", "truck",
  // 常见摆放物品
  "bottle", "cup", "chair", "potted plant",
  "backpack", "handbag", "suitcase", "umbrella",
  // 动物
  "cat", "dog", "bird",
] as const;

export type MovableObjectClass = typeof MOVABLE_OBJECT_CLASSES[number];

// ==================== 物体重复检测结果 ====================

/** 物体特征（用于跨图片匹配） */
export interface ObjectFeature {
  imageIndex: number;
  imagePosition?: string;      // 如 "行5 列M"
  object: DetectedObject;
  embedding: Float32Array;     // CLIP 嵌入向量
}

/** 物体重复匹配结果 */
export interface ObjectDuplicateMatch {
  objectClass: string;         // 物体类别
  objectClassCN: string;       // 物体类别中文名
  image1Index: number;
  image2Index: number;
  image1Position?: string;
  image2Position?: string;
  similarity: number;          // 相似度 0-1
  bbox1: DetectedObject["bbox"];
  bbox2: DetectedObject["bbox"];
}

/** 物体重复检测总结果 */
export interface ObjectDuplicateResult {
  hasDuplicate: boolean;
  duplicates: ObjectDuplicateMatch[];
  totalObjectsDetected: number;
  totalImages: number;
}

// ==================== 图片元数据 ====================

/** 图片元数据 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  megapixels: number;
  exif?: Record<string, unknown>;
}

// ==================== 边框检测结果 ====================

/** 边框检测结果 */
export interface BorderDetectionResult {
  hasBorder: boolean;
  borderSides: string[];
  borderWidth: Record<string, number>;
}

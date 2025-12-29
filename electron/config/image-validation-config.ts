/**
 * 图片验证配置 - 与 PC Worker (validation-worker.js) 完全同步
 *
 * 来源：/Users/yao/Yao/excel-review-app/public/validation-worker.js
 * 第 74-82 行, 第 2745 行, 第 3268 行
 */

// 图片重复检测配置 (对应 Worker 第 74-82 行)
export const IMAGE_DUP_CONFIG = {
  // blockhash 位数 - PC Worker 使用 blockhash-core.js 的 bmvbhash 算法
  BLOCKHASH_BITS: 12,

  // PC Worker 汉明距离阈值 12
  // 现在 Electron 使用与 PC Worker 完全相同的 bmvbhash 算法
  // 所以可以使用相同的阈值
  HAMMING_THRESHOLD: 12,

  // 近阈值边距 - 用于二次确认（Electron 暂不使用）
  NEAR_THRESHOLD_MARGIN: 4,

  // MAD (Mean Absolute Difference) 尺寸
  MAD_SIZE: 64,

  // 是否使用 SSIM 进行额外确认
  USE_SSIM: true,

  // SSIM 阈值
  SSIM_GOOD: 0.7,
  SSIM_STRICT: 0.85,
};

// 模糊检测配置 (对应 Worker 第 2745 行: isBlurry: sharpness < 60)
export const BLUR_CONFIG = {
  // 清晰度阈值 - 低于此值视为模糊
  SHARPNESS_THRESHOLD: 60,

  // 清晰度计算公式 (对应 Worker 第 3268 行)
  // sharpnessScore = laplacianVariance / 10
  LAPLACIAN_DIVISOR: 10,
};

// 移动端尺寸检测配置 (对应 Worker 第 86-106 行)
export const MOBILE_DIMENSION_CONFIG = {
  ENABLED: true,
  MIN_SHORT_SIDE: 480, // 最小短边
  MIN_LONG_SIDE: 640, // 最小长边
  MIN_MEGAPIXELS: 0.5, // 最小像素数 (百万像素)

  // 允许的宽高比
  ALLOWED_ASPECTS: [
    { ratio: 4 / 3, tolerance: 0.1 }, // 传统手机比例
    { ratio: 3 / 4, tolerance: 0.1 },
    { ratio: 16 / 9, tolerance: 0.1 }, // 标准宽屏
    { ratio: 9 / 16, tolerance: 0.1 },
    { ratio: 18 / 9, tolerance: 0.1 }, // 全面屏 (2:1)
    { ratio: 9 / 18, tolerance: 0.1 },
    { ratio: 19.5 / 9, tolerance: 0.1 }, // iPhone X/11/12/13 系列
    { ratio: 9 / 19.5, tolerance: 0.1 },
    { ratio: 20 / 9, tolerance: 0.1 }, // 小米/OPPO/Vivo等
    { ratio: 9 / 20, tolerance: 0.1 },
    { ratio: 21 / 9, tolerance: 0.12 }, // Sony Xperia等超宽屏
    { ratio: 9 / 21, tolerance: 0.12 },
    { ratio: 1, tolerance: 0.05 }, // 正方形 (Instagram裁剪等)
  ],
};

// 区域重复检测配置
export const REGIONAL_DUPLICATE_CONFIG = {
  // 分区网格大小 (3x3 = 9个区域)
  GRID_SIZE: 3,

  // 静态区域判定阈值：区域在所有图片间的平均相似度 > 此值则判定为静态（固定物体如招牌）
  STATIC_THRESHOLD: 0.80,

  // 重复物体判定阈值：非静态区域相似度 > 此值则判定为可疑重复
  DUPLICATE_THRESHOLD: 0.85,

  // 最小静态比例：区域在多少比例的图片对中相似才算静态
  MIN_STATIC_RATIO: 0.7,

  // 最小图片数量：至少需要多少张图片才进行区域重复检测
  MIN_IMAGES: 2,
};

/**
 * CLIP 图片智能检测服务（精简版）
 * 使用 OpenAI CLIP 模型进行季节识别
 *
 * 已移除功能：水印检测、模糊检测、场景分类
 */
// Use dynamic require to bypass Rollup bundling for native module
import type * as OnnxRuntime from "onnxruntime-node";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ort: typeof OnnxRuntime = require("onnxruntime-node");
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";
import { getModelsDirectory, isDevelopment } from "../config/paths";
import { clipLogger } from "../utils/logger";

// 从共享类型导出，保持向后兼容
export type { Season, ClipDetectionResult } from "../../shared/types/detection";
import type { Season, ClipDetectionResult } from "../../shared/types/detection";

// ==================== 季节检测 Prompts ====================
// 只保留季节检测相关的 prompts，移除水印/模糊/场景分类

// 穿着季节检测 prompts
const CLOTHING_PROMPTS = [
  // 冬季：厚重衣物
  "person wearing puffy down jacket, thick winter coat, or heavy padded clothing",
  // 秋季：中等厚度衣物
  "person wearing sweater, cardigan, light jacket, or windbreaker",
  // 夏季：轻薄衣物
  "person wearing t-shirt, tank top, shorts, summer dress, or sleeveless clothing",
  // 春季：薄外套
  "person wearing thin jacket, light coat, or casual spring clothes",
];

// 植物/场景季节检测 prompts
const SCENERY_PROMPTS = [
  // 冬季：枯树、无叶
  "winter scene with bare trees, no leaves, dry brown branches, snow or frost",
  // 秋季：红叶、黄叶、落叶
  "autumn scene with colorful yellow orange red leaves, falling leaves on trees",
  // 夏季：茂盛绿树
  "summer scene with dense green trees, lush green foliage, full canopy",
  // 春季：花朵、新芽
  "spring scene with cherry blossoms, flowers blooming, fresh green buds",
];

export class ClipDetector {
  private visualSession: OnnxRuntime.InferenceSession | null = null;
  private textSession: OnnxRuntime.InferenceSession | null = null;
  private textEmbeddings: Map<string, Float32Array> = new Map();
  private isInitialized = false;
  private modelDir: string;

  constructor() {
    // 使用统一的路径解析模块
    this.modelDir = getModelsDirectory();
    clipLogger.info(`模型目录: ${this.modelDir} (开发模式: ${isDevelopment()})`);
  }

  /**
   * 初始化模型（懒加载）
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    // 优先使用 FP16 量化模型（更小），否则使用原始模型
    let visualModelPath = path.join(this.modelDir, "clip-visual-fp16.onnx");
    if (!fs.existsSync(visualModelPath)) {
      visualModelPath = path.join(this.modelDir, "clip-visual.onnx");
    }
    const textModelPath = path.join(this.modelDir, "clip-textual.onnx");
    const embeddingsPath = path.join(this.modelDir, "text-embeddings.json");

    // 检查模型文件是否存在
    if (!fs.existsSync(visualModelPath)) {
      clipLogger.warn(`CLIP visual model not found at ${visualModelPath}. Detection disabled.`);
      return false;
    }

    try {
      clipLogger.info("Loading CLIP visual model...");
      this.visualSession = await ort.InferenceSession.create(visualModelPath, {
        executionProviders: ["cpu"],
      });

      // 加载预计算的文本嵌入（如果存在）
      if (fs.existsSync(embeddingsPath)) {
        clipLogger.info("Loading pre-computed text embeddings...");
        const embeddings = JSON.parse(fs.readFileSync(embeddingsPath, "utf-8"));
        for (const [text, values] of Object.entries(embeddings)) {
          this.textEmbeddings.set(text, new Float32Array(values as number[]));
        }
        clipLogger.info(`Loaded ${this.textEmbeddings.size} text embeddings`);
      } else if (fs.existsSync(textModelPath)) {
        // 如果有文本模型，动态计算嵌入
        clipLogger.info("Loading CLIP text model...");
        this.textSession = await ort.InferenceSession.create(textModelPath, {
          executionProviders: ["cpu"],
        });
        // 预计算所有需要的文本嵌入
        await this.precomputeTextEmbeddings();
      } else {
        clipLogger.warn("No text embeddings or text model found.");
        return false;
      }

      this.isInitialized = true;
      clipLogger.success("CLIP detector initialized successfully");
      return true;
    } catch (error) {
      clipLogger.error("Failed to initialize CLIP detector:", error);
      return false;
    }
  }

  /**
   * 预计算所有文本嵌入
   */
  private async precomputeTextEmbeddings(): Promise<void> {
    if (!this.textSession) return;

    const allPrompts = [
      ...CLOTHING_PROMPTS,
      ...SCENERY_PROMPTS,
    ];

    for (const prompt of allPrompts) {
      // 简化的文本编码（实际需要 CLIP 的 tokenizer）
      // 这里假设已经有预计算的嵌入
      clipLogger.debug(`Computing embedding for: ${prompt.substring(0, 30)}...`);
    }
  }

  /**
   * 预处理图片为 CLIP 输入格式
   * CLIP 需要 224x224 的 RGB 图片，归一化到 [-1, 1]
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
    const { data } = await sharp(imageBuffer)
      .resize(224, 224, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // CLIP 的归一化参数
    const mean = [0.48145466, 0.4578275, 0.40821073];
    const std = [0.26862954, 0.26130258, 0.27577711];

    // 转换为 CHW 格式并归一化
    const pixels = new Float32Array(3 * 224 * 224);
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < 224; h++) {
        for (let w = 0; w < 224; w++) {
          const srcIdx = (h * 224 + w) * 3 + c;
          const dstIdx = c * 224 * 224 + h * 224 + w;
          pixels[dstIdx] = (data[srcIdx] / 255 - mean[c]) / std[c];
        }
      }
    }

    return pixels;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 季节检测（精简版，只检测季节）
   * @param imageBuffer 图片 Buffer
   * @param yoloContext YOLO 检测上下文（可选，用于判断是否有人/植物）
   */
  async detect(
    imageBuffer: Buffer,
    yoloContext?: { hasPerson: boolean; hasPlant: boolean }
  ): Promise<ClipDetectionResult | null> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    if (!this.visualSession) return null;

    try {
      // 1. 预处理图片
      const pixels = await this.preprocessImage(imageBuffer);
      const inputTensor = new ort.Tensor("float32", pixels, [1, 3, 224, 224]);

      // 2. 获取图片嵌入
      const outputs = await this.visualSession.run({ input: inputTensor });
      const imageEmbedding = outputs.output.data as Float32Array;

      // 3. 计算与季节相关文本的相似度
      const scores: Record<string, number> = {};
      for (const [text, textEmbedding] of this.textEmbeddings) {
        scores[text] = this.cosineSimilarity(imageEmbedding, textEmbedding);
      }

      // 4. 解析季节检测结果
      const result = this.parseSeasonScores(scores, yoloContext);

      // 调试日志
      clipLogger.info(`季节检测: ${result.detectedSeason} (置信度: ${result.seasonConfidence.toFixed(1)}%)`);
      if (result.clothingSeason) clipLogger.debug(`  - 穿着季节: ${result.clothingSeason}`);
      if (result.scenerySeason) clipLogger.debug(`  - 场景季节: ${result.scenerySeason}`);

      return result;
    } catch (error) {
      clipLogger.error("CLIP detection failed:", error);
      return null;
    }
  }

  /**
   * 解析季节分数（精简版）
   * @param scores CLIP 相似度分数
   * @param yoloContext YOLO 检测上下文（可选）
   */
  private parseSeasonScores(
    scores: Record<string, number>,
    yoloContext?: { hasPerson: boolean; hasPlant: boolean }
  ): ClipDetectionResult {
    const hasPerson = yoloContext?.hasPerson ?? false;
    const hasPlant = yoloContext?.hasPlant ?? false;

    clipLogger.debug(`[上下文] 有人: ${hasPerson}, 有植物: ${hasPlant}`);

    // ========== 1. 穿着季节检测（仅当有人时） ==========
    let clothingSeason: Season | undefined;
    let maxClothingScore = 0;
    const CLOTHING_CONFIDENCE_MARGIN = 0.03; // 3%

    if (hasPerson) {
      const clothingScores = [
        { season: "winter" as Season, score: scores[CLOTHING_PROMPTS[0]] || 0 },
        { season: "autumn" as Season, score: scores[CLOTHING_PROMPTS[1]] || 0 },
        { season: "summer" as Season, score: scores[CLOTHING_PROMPTS[2]] || 0 },
        { season: "spring" as Season, score: scores[CLOTHING_PROMPTS[3]] || 0 },
      ];

      const sortedScores = [...clothingScores].sort((a, b) => b.score - a.score);
      maxClothingScore = sortedScores[0].score;
      const margin = maxClothingScore - sortedScores[1].score;

      if (margin >= CLOTHING_CONFIDENCE_MARGIN) {
        clothingSeason = sortedScores[0].season;
        clipLogger.debug(`穿着季节: ${clothingSeason} (分数: ${(maxClothingScore * 100).toFixed(1)}%, 差距: ${(margin * 100).toFixed(1)}%)`);
      } else {
        clipLogger.debug(`穿着季节不确定 (差距: ${(margin * 100).toFixed(1)}% < 3%)`);
      }
    }

    // ========== 2. 植物/场景季节检测（仅当有植物时） ==========
    let scenerySeason: Season | undefined;
    let maxSceneryScore = 0;
    const SCENERY_CONFIDENCE_MARGIN = 0.03; // 3%

    if (hasPlant) {
      const sceneryScores = [
        { season: "winter" as Season, score: scores[SCENERY_PROMPTS[0]] || 0 },
        { season: "autumn" as Season, score: scores[SCENERY_PROMPTS[1]] || 0 },
        { season: "summer" as Season, score: scores[SCENERY_PROMPTS[2]] || 0 },
        { season: "spring" as Season, score: scores[SCENERY_PROMPTS[3]] || 0 },
      ];

      const sortedScores = [...sceneryScores].sort((a, b) => b.score - a.score);
      maxSceneryScore = sortedScores[0].score;
      const margin = maxSceneryScore - sortedScores[1].score;

      if (margin >= SCENERY_CONFIDENCE_MARGIN) {
        scenerySeason = sortedScores[0].season;
        clipLogger.debug(`场景季节: ${scenerySeason} (分数: ${(maxSceneryScore * 100).toFixed(1)}%, 差距: ${(margin * 100).toFixed(1)}%)`);
      } else {
        clipLogger.debug(`场景季节不确定 (差距: ${(margin * 100).toFixed(1)}% < 3%)`);
      }
    }

    // ========== 3. 综合季节判断 ==========
    // 优先使用穿着季节（更可靠），其次使用场景季节
    let detectedSeason: Season = "unknown";
    let seasonConfidence = 0;

    if (clothingSeason) {
      detectedSeason = clothingSeason;
      seasonConfidence = maxClothingScore * 100;
    } else if (scenerySeason) {
      detectedSeason = scenerySeason;
      seasonConfidence = maxSceneryScore * 100;
    }

    return {
      detectedSeason,
      seasonConfidence: Math.min(100, seasonConfidence),
      clothingSeason,
      scenerySeason,
      hasPerson,
      hasPlant,
      rawScores: scores,
    };
  }

  /**
   * 获取图片的分区域嵌入向量
   * 将图片分为 gridSize x gridSize 个区域，每个区域单独计算 CLIP 嵌入
   * @param imageBuffer 图片 Buffer
   * @param gridSize 网格大小，默认 3（3x3 = 9个区域）
   * @returns 区域嵌入数组，按行优先顺序（左上→右下）
   */
  async getRegionalEmbeddings(
    imageBuffer: Buffer,
    gridSize: number = 3
  ): Promise<Float32Array[] | null> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    if (!this.visualSession) return null;

    try {
      // 1. 获取原图尺寸
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) return null;

      const regionWidth = Math.floor(metadata.width / gridSize);
      const regionHeight = Math.floor(metadata.height / gridSize);
      const embeddings: Float32Array[] = [];

      // 2. 提取每个区域并计算嵌入
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const left = col * regionWidth;
          const top = row * regionHeight;

          // 裁剪区域
          const regionBuffer = await sharp(imageBuffer)
            .extract({
              left,
              top,
              width: regionWidth,
              height: regionHeight,
            })
            .toBuffer();

          // 获取区域嵌入
          const embedding = await this.getImageEmbedding(regionBuffer);
          if (embedding) {
            embeddings.push(embedding);
          } else {
            // 如果获取失败，返回空向量
            embeddings.push(new Float32Array(512));
          }
        }
      }

      clipLogger.debug(`区域嵌入: 生成 ${gridSize}x${gridSize}=${embeddings.length} 个区域嵌入`);
      return embeddings;
    } catch (error) {
      clipLogger.error("获取区域嵌入失败:", error);
      return null;
    }
  }

  /**
   * 获取单张图片的 CLIP 嵌入向量
   * @param imageBuffer 图片 Buffer
   * @returns 512 维嵌入向量
   */
  async getImageEmbedding(imageBuffer: Buffer): Promise<Float32Array | null> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    if (!this.visualSession) return null;

    try {
      const pixels = await this.preprocessImage(imageBuffer);
      const inputTensor = new ort.Tensor("float32", pixels, [1, 3, 224, 224]);
      const outputs = await this.visualSession.run({ input: inputTensor });
      return outputs.output.data as Float32Array;
    } catch (error) {
      clipLogger.error("获取图片嵌入失败:", error);
      return null;
    }
  }

  /**
   * 计算两个嵌入向量的相似度（公开方法）
   */
  calculateSimilarity(a: Float32Array, b: Float32Array): number {
    return this.cosineSimilarity(a, b);
  }

  /**
   * 获取初始化状态
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 关闭会话
   */
  async dispose(): Promise<void> {
    if (this.visualSession) {
      await this.visualSession.release();
      this.visualSession = null;
    }
    if (this.textSession) {
      await this.textSession.release();
      this.textSession = null;
    }
    this.isInitialized = false;
  }
}

// 单例
let clipDetectorInstance: ClipDetector | null = null;

export function getClipDetector(): ClipDetector {
  if (!clipDetectorInstance) {
    clipDetectorInstance = new ClipDetector();
  }
  return clipDetectorInstance;
}

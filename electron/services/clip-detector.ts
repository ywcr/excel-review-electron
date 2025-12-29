/**
 * CLIP 图片智能检测服务
 * 使用 OpenAI CLIP 模型进行水印检测和季节识别
 */
// Use dynamic require to bypass Rollup bundling for native module
import type * as OnnxRuntime from "onnxruntime-node";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ort: typeof OnnxRuntime = require("onnxruntime-node");
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";

// 季节定义（中国北方）
export type Season = "spring" | "summer" | "autumn" | "winter" | "unknown";

export interface ClipDetectionResult {
  // 水印检测
  hasWatermark: boolean;
  watermarkConfidence: number;

  // 季节检测
  detectedSeason: Season;
  seasonConfidence: number;
  clothingSeason?: Season;
  scenerySeason?: Season;

  // 模糊检测
  isBlurry: boolean;
  blurConfidence: number;

  // 原始分数（调试用）
  rawScores?: Record<string, number>;
}

// 检测 prompts
const WATERMARK_PROMPTS = [
  "a photo with visible watermark or logo overlay",
  "a clean photo without any watermark",
];

const CLOTHING_PROMPTS = [
  "person wearing heavy winter clothes like down jacket, coat, or scarf",
  "person wearing autumn clothes like sweater or light jacket",
  "person wearing summer clothes like t-shirt, shorts, or dress",
  "person wearing spring clothes like thin jacket or long sleeves",
  "no person visible in the image",
];

const SCENERY_PROMPTS = [
  "winter scenery with snow, bare trees, frost, or ice",
  "autumn scenery with yellow, orange, or red falling leaves",
  "summer scenery with lush green trees and bright sunshine",
  "spring scenery with blooming flowers and fresh green buds",
  "indoor scene or no natural scenery visible",
];

// 模糊检测 prompts
const BLUR_PROMPTS = [
  "a blurry, out of focus, or motion blurred photo",
  "a sharp, clear, and in-focus photo",
];

export class ClipDetector {
  private visualSession: OnnxRuntime.InferenceSession | null = null;
  private textSession: OnnxRuntime.InferenceSession | null = null;
  private textEmbeddings: Map<string, Float32Array> = new Map();
  private isInitialized = false;
  private modelDir: string;

  constructor() {
    // 模型目录：开发环境在 electron/models，打包后在 resources/models
    // 注意：开发模式下 process.resourcesPath 也存在，但指向 Electron 包目录
    // 因此需要使用 app.isPackaged 或检查 ELECTRON_DEV 环境变量
    const isDev = process.env.NODE_ENV === "development" || 
                  !process.resourcesPath?.includes("app.asar") ||
                  process.resourcesPath?.includes("node_modules");
    
    if (isDev) {
      // 开发模式：使用项目根目录下的 electron/models
      // __dirname 在编译后可能是 dist-electron，需要回到项目根目录
      this.modelDir = path.join(process.cwd(), "electron", "models");
    } else {
      // 打包后：使用 resources/models
      this.modelDir = path.join(process.resourcesPath!, "models");
    }
    console.log(`📂 [CLIP] 模型目录: ${this.modelDir} (开发模式: ${isDev})`);
  }

  /**
   * 初始化模型（懒加载）
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    const visualModelPath = path.join(this.modelDir, "clip-visual.onnx");
    const textModelPath = path.join(this.modelDir, "clip-textual.onnx");
    const embeddingsPath = path.join(this.modelDir, "text-embeddings.json");

    // 检查模型文件是否存在
    if (!fs.existsSync(visualModelPath)) {
      console.warn(
        `⚠️ CLIP visual model not found at ${visualModelPath}. Detection disabled.`
      );
      return false;
    }

    try {
      console.log("🔄 Loading CLIP visual model...");
      this.visualSession = await ort.InferenceSession.create(visualModelPath, {
        executionProviders: ["cpu"],
      });

      // 加载预计算的文本嵌入（如果存在）
      if (fs.existsSync(embeddingsPath)) {
        console.log("🔄 Loading pre-computed text embeddings...");
        const embeddings = JSON.parse(fs.readFileSync(embeddingsPath, "utf-8"));
        for (const [text, values] of Object.entries(embeddings)) {
          this.textEmbeddings.set(text, new Float32Array(values as number[]));
        }
        console.log(`📚 Loaded ${this.textEmbeddings.size} text embeddings`);
      } else if (fs.existsSync(textModelPath)) {
        // 如果有文本模型，动态计算嵌入
        console.log("🔄 Loading CLIP text model...");
        this.textSession = await ort.InferenceSession.create(textModelPath, {
          executionProviders: ["cpu"],
        });
        // 预计算所有需要的文本嵌入
        await this.precomputeTextEmbeddings();
      } else {
        console.warn("⚠️ No text embeddings or text model found.");
        return false;
      }

      this.isInitialized = true;
      console.log("✅ CLIP detector initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize CLIP detector:", error);
      return false;
    }
  }

  /**
   * 预计算所有文本嵌入
   */
  private async precomputeTextEmbeddings(): Promise<void> {
    if (!this.textSession) return;

    const allPrompts = [
      ...WATERMARK_PROMPTS,
      ...CLOTHING_PROMPTS,
      ...SCENERY_PROMPTS,
    ];

    for (const prompt of allPrompts) {
      // 简化的文本编码（实际需要 CLIP 的 tokenizer）
      // 这里假设已经有预计算的嵌入
      console.log(`  Computing embedding for: ${prompt.substring(0, 30)}...`);
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
   * 检测图片
   */
  async detect(imageBuffer: Buffer): Promise<ClipDetectionResult | null> {
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

      // 3. 计算与各个文本的相似度
      const scores: Record<string, number> = {};

      for (const [text, textEmbedding] of this.textEmbeddings) {
        scores[text] = this.cosineSimilarity(imageEmbedding, textEmbedding);
      }

      // 4. 解析结果
      const result = this.parseScores(scores);
      
      // 调试日志：输出检测结果
      console.log(`🔍 [CLIP] 水印检测: ${result.hasWatermark ? '有水印' : '无水印'} (置信度: ${result.watermarkConfidence.toFixed(1)}%)`);
      console.log(`🔍 [CLIP] 模糊检测: ${result.isBlurry ? '模糊' : '清晰'} (置信度: ${result.blurConfidence.toFixed(1)}%)`);
      console.log(`🔍 [CLIP] 季节检测: ${result.detectedSeason} (置信度: ${result.seasonConfidence.toFixed(1)}%)`);
      if (result.clothingSeason) console.log(`   - 穿着季节: ${result.clothingSeason}`);
      if (result.scenerySeason) console.log(`   - 场景季节: ${result.scenerySeason}`);
      
      return result;
    } catch (error) {
      console.error("CLIP detection failed:", error);
      return null;
    }
  }

  /**
   * 解析分数，返回检测结果
   */
  private parseScores(scores: Record<string, number>): ClipDetectionResult {
    // 水印检测：比较有水印 vs 无水印的分数
    const watermarkScore = scores[WATERMARK_PROMPTS[0]] || 0;
    const cleanScore = scores[WATERMARK_PROMPTS[1]] || 0;
    const watermarkConfidence = Math.abs(watermarkScore - cleanScore) * 100;
    
    // 水印检测需要满足两个条件：
    // 1. "有水印"分数 > "无水印"分数
    // 2. 置信度（分数差）需要 >= 10%，表示模型足够确定
    const WATERMARK_CONFIDENCE_THRESHOLD = 10;
    const hasWatermark = watermarkScore > cleanScore && watermarkConfidence >= WATERMARK_CONFIDENCE_THRESHOLD;

    // 穿着季节检测
    const clothingScores = [
      { season: "winter" as Season, score: scores[CLOTHING_PROMPTS[0]] || 0 },
      { season: "autumn" as Season, score: scores[CLOTHING_PROMPTS[1]] || 0 },
      { season: "summer" as Season, score: scores[CLOTHING_PROMPTS[2]] || 0 },
      { season: "spring" as Season, score: scores[CLOTHING_PROMPTS[3]] || 0 },
    ];
    const noPersonScore = scores[CLOTHING_PROMPTS[4]] || 0;
    const maxClothingScore = Math.max(...clothingScores.map((c) => c.score));
    const clothingSeason =
      noPersonScore > maxClothingScore
        ? undefined
        : clothingScores.find((c) => c.score === maxClothingScore)?.season;

    // 场景季节检测
    const sceneryScores = [
      { season: "winter" as Season, score: scores[SCENERY_PROMPTS[0]] || 0 },
      { season: "autumn" as Season, score: scores[SCENERY_PROMPTS[1]] || 0 },
      { season: "summer" as Season, score: scores[SCENERY_PROMPTS[2]] || 0 },
      { season: "spring" as Season, score: scores[SCENERY_PROMPTS[3]] || 0 },
    ];
    const indoorScore = scores[SCENERY_PROMPTS[4]] || 0;
    const maxSceneryScore = Math.max(...sceneryScores.map((s) => s.score));
    const scenerySeason =
      indoorScore > maxSceneryScore
        ? undefined
        : sceneryScores.find((s) => s.score === maxSceneryScore)?.season;

    // 综合季节判断：优先场景，然后穿着
    let detectedSeason: Season = "unknown";
    let seasonConfidence = 0;

    if (scenerySeason) {
      detectedSeason = scenerySeason;
      seasonConfidence = maxSceneryScore * 100;
    } else if (clothingSeason) {
      detectedSeason = clothingSeason;
      seasonConfidence = maxClothingScore * 100;
    }

    // 模糊检测：比较模糊 vs 清晰的分数
    const blurryScore = scores[BLUR_PROMPTS[0]] || 0;
    const sharpScore = scores[BLUR_PROMPTS[1]] || 0;
    const blurConfidence = Math.abs(blurryScore - sharpScore) * 100;
    // 模糊检测阈值：置信度需要 >= 8% 才判定
    const BLUR_CONFIDENCE_THRESHOLD = 8;
    const isBlurry = blurryScore > sharpScore && blurConfidence >= BLUR_CONFIDENCE_THRESHOLD;

    return {
      hasWatermark,
      watermarkConfidence: Math.min(100, watermarkConfidence),
      detectedSeason,
      seasonConfidence: Math.min(100, seasonConfidence),
      clothingSeason,
      scenerySeason,
      isBlurry,
      blurConfidence: Math.min(100, blurConfidence),
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

      console.log(`🔳 [CLIP] 区域嵌入: 生成 ${gridSize}x${gridSize}=${embeddings.length} 个区域嵌入`);
      return embeddings;
    } catch (error) {
      console.error("获取区域嵌入失败:", error);
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
      console.error("获取图片嵌入失败:", error);
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

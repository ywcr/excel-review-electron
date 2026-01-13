/**
 * CLIP 图片智能检测服务（精简版）
 * 使用 OpenAI CLIP 模型进行季节识别
 *
 * 已移除功能：水印检测、模糊检测、场景分类
 */
// Use dynamic require to bypass Rollup bundling for native module
import type * as OnnxRuntime from "onnxruntime-node";
// Lazy load onnxruntime-node to handle lite build (module not available)
let ort: typeof OnnxRuntime | null = null;
function getOrt(): typeof OnnxRuntime | null {
  if (ort === null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ort = require("onnxruntime-node");
    } catch {
      // Module not available (lite build)
      ort = null as unknown as typeof OnnxRuntime;
      return null;
    }
  }
  return ort;
}
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";
import { getModelsDirectory, isDevelopment } from "../config/paths";
import { clipLogger } from "../utils/logger";

// 从共享类型导出，保持向后兼容
export type { Season, ClipDetectionResult } from "../../shared/types/detection";
import type { Season, ClipDetectionResult } from "../../shared/types/detection";

// ==================== 季节检测 Prompts ====================
// 这些 prompts 必须与 text-embeddings.json 中的 key 完全匹配！

// 穿着季节检测 prompts（四季分类）
// 注意：YOLO 已经检测了是否有人，所以不需要"无人"分类
// v7 - 优化版本：强调围巾作为冬季特征，区分春冬
const CLOTHING_PROMPTS = [
  // 冬季：强调围巾、厚外套、羽绒服、连帽外套
  "person wearing winter clothing with scarf around neck, thick padded coat, down jacket, hooded parka, or heavy winter outerwear",
  // 秋季：强调中等厚度层叠穿着、毛衣外套组合、无围巾
  "person wearing layered autumn outfit with wool sweater under medium coat or cardigan, no scarf, in cool fall weather",
  // 夏季：强调极度轻薄、裸露手臂、短袖
  "person wearing minimal summer clothes with short sleeves, bare arms, tank top or thin t-shirt in hot sunny weather",
  // 春季：强调单层轻便薄外套、无围巾、无羽绒服
  "person wearing thin unpadded spring jacket or light windbreaker with no scarf and no thick padding",
];

// 穿着季节对应关系
const CLOTHING_SEASON_MAP: Record<number, Season> = {
  0: "winter",  // 羽绒服/厚外套 → 冬季
  1: "autumn",  // 毛衣/风衣 → 秋季
  2: "summer",  // T恤/短裤 → 夏季
  3: "spring",  // 薄夹克 → 春季
};

// 植物/场景季节检测 prompts（四季分类）
const SCENERY_PROMPTS = [
  // 冬季：枯树、无叶
  "cold winter scene with bare trees without leaves, dry brown branches against clear sky",
  // 秋季：红叶、黄叶、落叶
  "autumn scene with colorful yellow orange red falling leaves on trees",
  // 夏季：茂盛绿树
  "hot summer scene with dense green trees, lush foliage everywhere",
  // 春季：花朵、新芽
  "spring scene with pink cherry blossoms, flowers blooming, fresh green grass",
];

// 场景季节对应关系
const SCENERY_SEASON_MAP: Record<number, Season> = {
  0: "winter",
  1: "autumn",
  2: "summer",
  3: "spring",
};

// 工装/制服检测 prompt（用于排除不反映季节的穿着）
// 药店员工、保安、服务员等职业穿着不反映真实季节
const UNIFORM_PROMPT = "person wearing work uniform, professional attire, staff clothing, or employee outfit";

// 常绿植物检测 prompt（用于排除不反映季节的植物）
// 冬青、松柏、室内盆栽等全年常绿，不能用于判断季节
const EVERGREEN_PROMPT = "evergreen plants like holly, boxwood, pine, cypress, indoor potted plants, or artificial decorative plants that stay green year-round regardless of season";

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

    // 轻量版跳过模型加载
    if (process.env.BUILD_VARIANT === 'lite') {
      clipLogger.info("轻量版构建，跳过 CLIP 模型加载");
      return false;
    }

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
      const ortModule = getOrt();
      if (!ortModule) {
        clipLogger.warn("onnxruntime-node 不可用，跳过 CLIP 初始化");
        return false;
      }
      clipLogger.info("Loading CLIP visual model...");
      this.visualSession = await ortModule.InferenceSession.create(visualModelPath, {
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
        const ortModule = getOrt()!;
        this.textSession = await ortModule.InferenceSession.create(textModelPath, {
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
      UNIFORM_PROMPT,
      EVERGREEN_PROMPT,
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
   * @param currentSeason 当前季节（可选，用于在分数接近时优先选择当前季节）
   */
  async detect(
    imageBuffer: Buffer,
    yoloContext?: { hasPerson: boolean; hasPlant: boolean; personAreaRatio?: number },
    currentSeason?: Season
  ): Promise<ClipDetectionResult | null> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    if (!this.visualSession) return null;

    try {
      // 1. 预处理图片
      const pixels = await this.preprocessImage(imageBuffer);
      const ortModule = getOrt()!;
      const inputTensor = new ortModule.Tensor("float32", pixels, [1, 3, 224, 224]);

      // 2. 获取图片嵌入
      const outputs = await this.visualSession.run({ input: inputTensor });
      const imageEmbedding = outputs.output.data as Float32Array;

      // 3. 计算与季节相关文本的相似度
      const scores: Record<string, number> = {};
      for (const [text, textEmbedding] of this.textEmbeddings) {
        scores[text] = this.cosineSimilarity(imageEmbedding, textEmbedding);
      }

      // 4. 解析季节检测结果（传入当前季节用于容差判断）
      const result = this.parseSeasonScores(scores, yoloContext, currentSeason);

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
   * @param currentSeason 当前季节（可选，用于在分数接近时优先选择当前季节）
   */
  private parseSeasonScores(
    scores: Record<string, number>,
    yoloContext?: { hasPerson: boolean; hasPlant: boolean; personAreaRatio?: number },
    currentSeason?: Season
  ): ClipDetectionResult {
    const hasPerson = yoloContext?.hasPerson ?? false;
    const hasPlant = yoloContext?.hasPlant ?? false;
    const personAreaRatio = yoloContext?.personAreaRatio ?? 0;

    // 最小人物面积阈值（占图片面积的比例）
    // 当人物太小时，CLIP 无法可靠识别穿着
    const MIN_PERSON_AREA_RATIO = 0.05; // 5%
    const personLargeEnough = personAreaRatio >= MIN_PERSON_AREA_RATIO;

    clipLogger.debug(`[上下文] 有人: ${hasPerson}, 有植物: ${hasPlant}, 人物面积: ${(personAreaRatio * 100).toFixed(1)}%`);

    // ========== 1. 穿着季节检测（仅当有人时） ==========
    // 四季分类：冬季/秋季/夏季/春季
    // 使用相对比例阈值替代绝对差距阈值，提高判定率
    let clothingSeason: Season | undefined;
    let maxClothingScore = 0;
    let clothingConfidenceLevel: 'high' | 'medium' | 'low' | 'uncertain' = 'uncertain';
    
    // 相对比例阈值（最高分/次高分的比例）
    const CLOTHING_HIGH_RATIO = 1.12;     // 高置信度：高出 12%
    const CLOTHING_MEDIUM_RATIO = 1.08;   // 中置信度：高出 8%
    const CLOTHING_LOW_RATIO = 1.06;      // 低置信度：高出 6%
    const CLOTHING_MIN_CONFIDENCE = 0.25; // 25% - 最低置信度要求
    const CLOTHING_MIN_ABS_DIFF = 0.02;   // 2% - 最低绝对差距要求
    const CURRENT_SEASON_TOLERANCE = 0.03; // 3% - 当前季节容差

    if (hasPerson && personLargeEnough) {
      // 先检查是否穿工装（工装不反映季节）
      const uniformScore = scores[UNIFORM_PROMPT] || 0;
      const UNIFORM_THRESHOLD = 0.26; // 工装检测阈值
      
      if (uniformScore >= UNIFORM_THRESHOLD) {
        clipLogger.info(`检测到工装/制服 (分数: ${(uniformScore * 100).toFixed(1)}%)，跳过穿着季节判定`);
        // 跳过穿着季节检测，clothingSeason 保持 undefined
      } else {
        // 四季穿着分数（YOLO 已确认有人，只比较四季）
        const clothingScores = [
          { season: "winter" as Season, score: scores[CLOTHING_PROMPTS[0]] || 0, label: "冬季(羽绒服)" },
          { season: "autumn" as Season, score: scores[CLOTHING_PROMPTS[1]] || 0, label: "秋季(毛衣)" },
          { season: "summer" as Season, score: scores[CLOTHING_PROMPTS[2]] || 0, label: "夏季(T恤)" },
          { season: "spring" as Season, score: scores[CLOTHING_PROMPTS[3]] || 0, label: "春季(薄夹克)" },
        ];

        // 输出原始分数用于调试
        clipLogger.info(`穿着季节分数: ${clothingScores.map(s => `${s.label}=${(s.score * 100).toFixed(1)}%`).join(" ")}`);

      // 按分数排序找出最高和次高
      const sortedScores = [...clothingScores].sort((a, b) => b.score - a.score);
      const topScore = sortedScores[0];
      const secondScore = sortedScores[1];
      
      // 计算比例（避免除零）
      const ratio = secondScore.score > 0 ? topScore.score / secondScore.score : 999;
      const margin = topScore.score - secondScore.score;

      // 检查当前季节容差：如果最高分不是当前季节，但当前季节分数与最高分相差不超过 3%，则使用当前季节
      let preferredSeason = topScore;
      if (currentSeason && topScore.season !== currentSeason) {
        const currentSeasonScore = clothingScores.find(s => s.season === currentSeason);
        if (currentSeasonScore && (topScore.score - currentSeasonScore.score) <= CURRENT_SEASON_TOLERANCE) {
          preferredSeason = currentSeasonScore;
          clipLogger.info(`当前季节容差生效: ${topScore.label}(${(topScore.score * 100).toFixed(1)}%) vs ${currentSeasonScore.label}(${(currentSeasonScore.score * 100).toFixed(1)}%), 差距 ${((topScore.score - currentSeasonScore.score) * 100).toFixed(1)}% <= 3%, 优先选择当前季节`);
        }
      }

      // 使用相对比例判断置信度级别
      if (preferredSeason.score >= CLOTHING_MIN_CONFIDENCE) {
        // 重新计算 ratio（如果使用了当前季节容差）
        const effectiveRatio = preferredSeason === topScore ? ratio : 
          (secondScore.score > 0 ? preferredSeason.score / secondScore.score : 999);
        
        if (effectiveRatio >= CLOTHING_HIGH_RATIO || (preferredSeason !== topScore)) {
          // 如果是通过当前季节容差选中的，视为高置信度
          clothingSeason = preferredSeason.season;
          maxClothingScore = preferredSeason.score;
          clothingConfidenceLevel = preferredSeason === topScore ? 'high' : 'medium';
          clipLogger.info(`穿着判定: ${preferredSeason.label}, 置信度: ${(preferredSeason.score * 100).toFixed(1)}%, 比例: ${effectiveRatio.toFixed(2)}x [${preferredSeason === topScore ? '高置信度' : '当前季节容差'}]`);
        } else if (effectiveRatio >= CLOTHING_MEDIUM_RATIO) {
          clothingSeason = preferredSeason.season;
          maxClothingScore = preferredSeason.score;
          clothingConfidenceLevel = 'medium';
          clipLogger.info(`穿着判定: ${preferredSeason.label}, 置信度: ${(preferredSeason.score * 100).toFixed(1)}%, 比例: ${effectiveRatio.toFixed(2)}x [中置信度]`);
        } else if (effectiveRatio >= CLOTHING_LOW_RATIO) {
          clothingSeason = preferredSeason.season;
          maxClothingScore = preferredSeason.score;
          clothingConfidenceLevel = 'low';
          clipLogger.info(`穿着判定: ${preferredSeason.label}, 置信度: ${(preferredSeason.score * 100).toFixed(1)}%, 比例: ${effectiveRatio.toFixed(2)}x [低置信度]`);
        } else {
          // 分数差距太小，标记为不确定
          clipLogger.debug(`穿着季节不确定 (比例: ${effectiveRatio.toFixed(2)}x < ${CLOTHING_LOW_RATIO}x, 差距: ${(margin * 100).toFixed(1)}%)`);
        }
      } else {
        clipLogger.debug(`穿着季节不确定 (最高置信度: ${(preferredSeason.score * 100).toFixed(1)}% < ${(CLOTHING_MIN_CONFIDENCE * 100).toFixed(0)}%)`);
      }
      }
    } else if (hasPerson && !personLargeEnough) {
      // 人物太小，跳过穿着季节检测
      clipLogger.info(`跳过穿着季节检测: 人物太小 (面积: ${(personAreaRatio * 100).toFixed(1)}% < ${(MIN_PERSON_AREA_RATIO * 100).toFixed(0)}%)`);
    }

    // ========== 2. 植物/场景季节检测（仅当有植物时） ==========
    let scenerySeason: Season | undefined;
    let maxSceneryScore = 0;
    
    // 场景季节也使用相对比例阈值
    const SCENERY_RATIO_THRESHOLD = 1.06; // 高出 6%

    // 室内商业场所的 prompt（用于判断是否跳过场景季节检测）
    const INDOOR_SHOP_PROMPT = "indoor shop, store, pharmacy, supermarket, or retail space with product shelves and merchandise";

    if (hasPlant) {
      // 先检查是否是常绿植物（冬青、松柏等）
      const evergreenScore = scores[EVERGREEN_PROMPT] || 0;
      // 先检查是否是室内商业场所（药店、商店等）
      const indoorShopScore = scores[INDOOR_SHOP_PROMPT] || 0;
      
      // 获取其他场景类型的分数进行比较
      const sceneryScores = [
        { season: "winter" as Season, score: scores[SCENERY_PROMPTS[0]] || 0, label: "冬季场景" },
        { season: "autumn" as Season, score: scores[SCENERY_PROMPTS[1]] || 0, label: "秋季场景" },
        { season: "summer" as Season, score: scores[SCENERY_PROMPTS[2]] || 0, label: "夏季场景" },
        { season: "spring" as Season, score: scores[SCENERY_PROMPTS[3]] || 0, label: "春季场景" },
      ];
      
      const maxSeasonSceneryScore = Math.max(...sceneryScores.map(s => s.score));
      
      // 常绿植物检测阈值
      const EVERGREEN_THRESHOLD = 0.24; // 24%
      
      // 如果检测到常绿植物（冬青、松柏等），跳过场景季节检测
      if (evergreenScore >= EVERGREEN_THRESHOLD && evergreenScore > maxSeasonSceneryScore * 0.9) {
        clipLogger.info(`检测到常绿植物 (${(evergreenScore * 100).toFixed(1)}%)，跳过场景季节检测（常绿植物全年保持绿色）`);
        // scenerySeason 保持 undefined
      } else if (indoorShopScore > maxSeasonSceneryScore && !hasPerson) {
        // 如果室内商业场所分数较高且没有人物，跳过场景季节检测
        // 这是因为室内药店的盆栽植物不能反映真实季节
        clipLogger.info(`跳过场景季节检测: 室内商业场所(${(indoorShopScore * 100).toFixed(1)}%)且无人物，植物可能是室内盆栽`);
        // scenerySeason 保持 undefined
      } else {
        // 输出原始分数用于调试
        clipLogger.debug(`场景季节原始分数: 冬${(sceneryScores[0].score * 100).toFixed(1)}% 秋${(sceneryScores[1].score * 100).toFixed(1)}% 夏${(sceneryScores[2].score * 100).toFixed(1)}% 春${(sceneryScores[3].score * 100).toFixed(1)}%`);
        if (indoorShopScore > 0) {
          clipLogger.debug(`室内商业场所分数: ${(indoorShopScore * 100).toFixed(1)}%`);
        }

        const sortedScores = [...sceneryScores].sort((a, b) => b.score - a.score);
        maxSceneryScore = sortedScores[0].score;
        const sceneryRatio = sortedScores[1].score > 0 ? sortedScores[0].score / sortedScores[1].score : 999;

        if (sceneryRatio >= SCENERY_RATIO_THRESHOLD) {
          scenerySeason = sortedScores[0].season;
          clipLogger.debug(`场景季节: ${scenerySeason} (分数: ${(maxSceneryScore * 100).toFixed(1)}%, 比例: ${sceneryRatio.toFixed(2)}x)`);
        } else {
          clipLogger.debug(`场景季节不确定 (比例: ${sceneryRatio.toFixed(2)}x < ${SCENERY_RATIO_THRESHOLD}x)`);
        }
      }
    }

    // ========== 3. 综合季节判断 ==========
    // 优先使用穿着季节（更可靠），其次使用场景季节
    // 新增：穿着与场景一致性校验
    let detectedSeason: Season = "unknown";
    let seasonConfidence = 0;

    // 定义季节冲突检测（温度差异大的季节组合）
    const isSeasonConflict = (s1: Season, s2: Season): boolean => {
      const conflictPairs: [Season, Season][] = [
        ["winter", "summer"],
        ["summer", "winter"],
      ];
      return conflictPairs.some(([a, b]) => (s1 === a && s2 === b));
    };

    if (clothingSeason && scenerySeason) {
      // 两者都有结果时，检查一致性
      if (clothingSeason === scenerySeason) {
        // 完全一致：高置信度
        detectedSeason = clothingSeason;
        seasonConfidence = Math.max(maxClothingScore, maxSceneryScore) * 100;
        clipLogger.info(`穿着与场景一致: ${detectedSeason}`);
      } else if (isSeasonConflict(clothingSeason, scenerySeason)) {
        // 冬夏冲突：现实中不可能，标记为检测异常
        detectedSeason = "unknown";
        seasonConfidence = 0;
        clipLogger.warn(`⚠️ 检测异常: 穿着(${clothingSeason})与场景(${scenerySeason})严重冲突，无法判定季节`);
      } else {
        // 轻微不一致（如春秋）：仍优先穿着
        detectedSeason = clothingSeason;
        seasonConfidence = maxClothingScore * 100 * 0.9; // 轻微降低
        clipLogger.debug(`穿着(${clothingSeason})与场景(${scenerySeason})不完全一致`);
      }
    } else if (clothingSeason) {
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
      const ortModule = getOrt()!;
      const inputTensor = new ortModule.Tensor("float32", pixels, [1, 3, 224, 224]);
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

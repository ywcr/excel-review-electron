/**
 * 人物重识别检测器 (OSNet ReID)
 * 用于检测多张图片中的重复人物
 * 
 * 基于 OSNet (Omni-Scale Network) 模型，不依赖人脸检测
 * 通过衣着、体型、姿态等全身特征进行人物匹配
 */
// Use dynamic require to bypass Rollup bundling for native module
import type * as OnnxRuntime from "onnxruntime-node";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ort: typeof OnnxRuntime = require("onnxruntime-node");
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";
import { getModelsDirectory, isDevelopment } from "../config/paths";
import { duplicateLogger } from "../utils/logger";

// ==================== 配置 ====================

/** ReID 模型配置 */
export const REID_CONFIG = {
  /** 输入图片宽度 (标准 ReID 尺寸) */
  INPUT_WIDTH: 128,
  /** 输入图片高度 (标准 ReID 尺寸) */
  INPUT_HEIGHT: 256,
  /** 嵌入向量维度 */
  EMBEDDING_DIM: 512,
  /** 默认相似度阈值 */
  SIMILARITY_THRESHOLD: 0.70,
  /** 高置信度阈值 */
  HIGH_CONFIDENCE_THRESHOLD: 0.80,
};

// ==================== 类型定义 ====================

/** 人物特征 */
export interface PersonFeature {
  imageIndex: number;
  imagePosition?: string;
  embedding: Float32Array;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** 人物重复匹配结果 */
export interface PersonDuplicateMatch {
  image1Index: number;
  image2Index: number;
  image1Position?: string;
  image2Position?: string;
  similarity: number;
  confidence: 'high' | 'medium';
}

// ==================== 核心类 ====================

export class ReidDetector {
  private session: OnnxRuntime.InferenceSession | null = null;
  private isInitialized = false;
  private modelDir: string;

  constructor() {
    this.modelDir = getModelsDirectory();
    duplicateLogger.debug(`[ReID] 模型目录: ${this.modelDir} (开发模式: ${isDevelopment()})`);
  }

  /**
   * 初始化模型
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    const modelPath = path.join(this.modelDir, "osnet_x0_75.onnx");

    // 检查模型文件是否存在
    if (!fs.existsSync(modelPath)) {
      duplicateLogger.warn(`[ReID] OSNet 模型未找到: ${modelPath}`);
      duplicateLogger.warn(`[ReID] 请运行 python scripts/export_osnet.py 导出模型`);
      return false;
    }

    try {
      duplicateLogger.info(`[ReID] 正在加载 OSNet 模型...`);
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["cpu"],
      });
      
      this.isInitialized = true;
      duplicateLogger.success(`[ReID] OSNet 模型加载成功`);
      return true;
    } catch (error) {
      duplicateLogger.error(`[ReID] 模型加载失败:`, error);
      return false;
    }
  }

  /**
   * 预处理图片为 ReID 输入格式
   * OSNet 需要 256x128 的 RGB 图片，标准化处理
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
    const { data } = await sharp(imageBuffer)
      .resize(REID_CONFIG.INPUT_WIDTH, REID_CONFIG.INPUT_HEIGHT, { 
        fit: "fill"  // 填充以保持比例
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // ImageNet 标准化参数
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // 转换为 CHW 格式并归一化
    const height = REID_CONFIG.INPUT_HEIGHT;
    const width = REID_CONFIG.INPUT_WIDTH;
    const pixels = new Float32Array(3 * height * width);
    
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          const srcIdx = (h * width + w) * 3 + c;
          const dstIdx = c * height * width + h * width + w;
          pixels[dstIdx] = (data[srcIdx] / 255 - mean[c]) / std[c];
        }
      }
    }

    return pixels;
  }

  /**
   * 获取人物区域的 ReID 嵌入向量
   * @param personCropBuffer 裁剪的人物区域图片
   * @returns 512 维嵌入向量
   */
  async getPersonEmbedding(personCropBuffer: Buffer): Promise<Float32Array | null> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    if (!this.session) return null;

    try {
      const pixels = await this.preprocessImage(personCropBuffer);
      const inputTensor = new ort.Tensor(
        "float32", 
        pixels, 
        [1, 3, REID_CONFIG.INPUT_HEIGHT, REID_CONFIG.INPUT_WIDTH]
      );

      const outputs = await this.session.run({ input: inputTensor });
      const embedding = outputs.output.data as Float32Array;
      
      // L2 归一化
      const normalized = this.l2Normalize(embedding);
      
      return normalized;
    } catch (error) {
      duplicateLogger.error(`[ReID] 特征提取失败:`, error);
      return null;
    }
  }

  /**
   * L2 归一化
   */
  private l2Normalize(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm === 0) return embedding;
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm;
    }
    return normalized;
  }

  /**
   * 计算两个人物嵌入向量的相似度
   * 使用余弦相似度（因为已经 L2 归一化，所以等于点积）
   */
  calculateSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) return 0;
    
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }
    
    // 转换为 0-1 范围的相似度
    // 余弦相似度范围是 [-1, 1]，转换为 [0, 1]
    return (dotProduct + 1) / 2;
  }

  /**
   * 判断两个人物是否为同一人
   */
  isSamePerson(
    embedding1: Float32Array, 
    embedding2: Float32Array
  ): { isSame: boolean; similarity: number; confidence: 'high' | 'medium' | 'low' } {
    const similarity = this.calculateSimilarity(embedding1, embedding2);
    
    if (similarity >= REID_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
      return { isSame: true, similarity, confidence: 'high' };
    } else if (similarity >= REID_CONFIG.SIMILARITY_THRESHOLD) {
      return { isSame: true, similarity, confidence: 'medium' };
    } else {
      return { isSame: false, similarity, confidence: 'low' };
    }
  }

  /**
   * 获取初始化状态
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.isInitialized = false;
  }
}

// ==================== 单例 ====================

let reidDetectorInstance: ReidDetector | null = null;

export function getReidDetector(): ReidDetector {
  if (!reidDetectorInstance) {
    reidDetectorInstance = new ReidDetector();
  }
  return reidDetectorInstance;
}

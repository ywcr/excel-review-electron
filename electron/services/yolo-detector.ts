/**
 * YOLO 物体检测器
 * 使用 YOLOv8n ONNX 模型检测图片中的物体
 */
import * as ort from "onnxruntime-node";
import * as path from "path";
import sharp from "sharp";
import { app } from "electron";

// COCO 数据集的 80 个类别
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
  "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
  "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

// 中文类别名
const CLASS_NAMES_CN: Record<string, string> = {
  "person": "人",
  "bicycle": "自行车",
  "car": "汽车",
  "motorcycle": "摩托车/电动车",
  "bus": "公交车",
  "truck": "卡车",
  "traffic light": "交通灯",
  "stop sign": "停车标志",
  "fire hydrant": "消防栓",
  "bench": "长椅",
  "bird": "鸟",
  "cat": "猫",
  "dog": "狗",
  "umbrella": "雨伞",
  "handbag": "手提包",
  "backpack": "背包",
  "potted plant": "盆栽",
  "chair": "椅子",
  "couch": "沙发",
  "dining table": "餐桌",
  "tv": "电视",
  "laptop": "笔记本电脑",
  "cell phone": "手机",
  "bottle": "瓶子",
  "cup": "杯子",
  "clock": "时钟",
};

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

export class YoloDetector {
  private session: ort.InferenceSession | null = null;
  private readonly modelPath: string;
  private readonly inputSize = 640;
  private readonly confidenceThreshold = 0.5;
  private readonly iouThreshold = 0.45;

  constructor() {
    // 根据环境选择模型路径
    const isDev = !app.isPackaged;
    if (isDev) {
      this.modelPath = path.join(process.cwd(), "electron", "models", "yolov8n.onnx");
    } else {
      this.modelPath = path.join(process.resourcesPath, "models", "yolov8n.onnx");
    }
  }

  async initialize(): Promise<boolean> {
    try {
      console.log("[YOLO] 正在加载模型:", this.modelPath);
      
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ["cpu"],
        graphOptimizationLevel: "all",
      });

      console.log("[YOLO] 模型加载成功");
      console.log("[YOLO] 输入:", this.session.inputNames);
      console.log("[YOLO] 输出:", this.session.outputNames);
      
      return true;
    } catch (error) {
      console.error("[YOLO] 模型加载失败:", error);
      return false;
    }
  }

  /**
   * 检测图片中的物体
   */
  async detect(imageBuffer: Buffer): Promise<DetectedObject[]> {
    if (!this.session) {
      const initialized = await this.initialize();
      if (!initialized) return [];
    }

    try {
      // 预处理图片
      const { tensor, originalWidth, originalHeight } = await this.preprocessImage(imageBuffer);

      // 推理
      const feeds = { images: tensor };
      const results = await this.session!.run(feeds);

      // 后处理
      const output = results[this.session!.outputNames[0]];
      const detections = this.postprocess(
        output.data as Float32Array,
        originalWidth,
        originalHeight
      );

      return detections;
    } catch (error) {
      console.error("[YOLO] 检测失败:", error);
      return [];
    }
  }

  /**
   * 预处理图片
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<{
    tensor: ort.Tensor;
    originalWidth: number;
    originalHeight: number;
  }> {
    // 获取原始尺寸
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 640;
    const originalHeight = metadata.height || 640;

    // 调整大小并获取 RGB 数据
    const { data } = await sharp(imageBuffer)
      .resize(this.inputSize, this.inputSize, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 转换为 NCHW 格式并归一化 [0, 255] -> [0, 1]
    const float32Data = new Float32Array(3 * this.inputSize * this.inputSize);
    const pixelCount = this.inputSize * this.inputSize;

    for (let i = 0; i < pixelCount; i++) {
      float32Data[i] = data[i * 3] / 255.0; // R
      float32Data[pixelCount + i] = data[i * 3 + 1] / 255.0; // G
      float32Data[2 * pixelCount + i] = data[i * 3 + 2] / 255.0; // B
    }

    const tensor = new ort.Tensor("float32", float32Data, [1, 3, this.inputSize, this.inputSize]);

    return { tensor, originalWidth, originalHeight };
  }

  /**
   * 后处理检测结果
   */
  private postprocess(
    output: Float32Array,
    originalWidth: number,
    originalHeight: number
  ): DetectedObject[] {
    // YOLOv8 输出格式: [1, 84, 8400]
    // 84 = 4 (bbox) + 80 (classes)
    const numClasses = 80;
    const numDetections = 8400;
    const detections: DetectedObject[] = [];

    for (let i = 0; i < numDetections; i++) {
      // 获取类别分数
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let c = 0; c < numClasses; c++) {
        const score = output[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      if (maxScore < this.confidenceThreshold) continue;

      // 获取边界框 (cx, cy, w, h)
      const cx = output[0 * numDetections + i];
      const cy = output[1 * numDetections + i];
      const w = output[2 * numDetections + i];
      const h = output[3 * numDetections + i];

      // 转换为 (x, y, width, height) 并缩放到原始图片尺寸
      const scaleX = originalWidth / this.inputSize;
      const scaleY = originalHeight / this.inputSize;

      const className = COCO_CLASSES[maxClassId];
      
      detections.push({
        class: className,
        classNameCN: CLASS_NAMES_CN[className] || className,
        confidence: maxScore,
        bbox: {
          x: (cx - w / 2) * scaleX,
          y: (cy - h / 2) * scaleY,
          width: w * scaleX,
          height: h * scaleY,
        },
      });
    }

    // NMS 非极大值抑制
    return this.nms(detections);
  }

  /**
   * 非极大值抑制
   */
  private nms(detections: DetectedObject[]): DetectedObject[] {
    // 按置信度排序
    detections.sort((a, b) => b.confidence - a.confidence);

    const result: DetectedObject[] = [];

    while (detections.length > 0) {
      const best = detections.shift()!;
      result.push(best);

      detections = detections.filter(det => {
        if (det.class !== best.class) return true;
        const iou = this.calculateIoU(best.bbox, det.bbox);
        return iou < this.iouThreshold;
      });
    }

    return result;
  }

  /**
   * 计算 IoU
   */
  private calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  /**
   * 比较两张图片检测到的相同物体
   */
  compareDetections(
    detections1: DetectedObject[],
    detections2: DetectedObject[]
  ): {
    commonObjects: string[];
    score: number;
  } {
    const classes1 = new Set(detections1.map(d => d.class));
    const classes2 = new Set(detections2.map(d => d.class));

    const commonObjects = [...classes1].filter(c => classes2.has(c));
    
    // 计算相似度分数
    const totalClasses = new Set([...classes1, ...classes2]).size;
    const score = totalClasses > 0 ? commonObjects.length / totalClasses : 0;

    return {
      commonObjects,
      score,
    };
  }
}

// 单例
let yoloDetector: YoloDetector | null = null;

export function getYoloDetector(): YoloDetector {
  if (!yoloDetector) {
    yoloDetector = new YoloDetector();
  }
  return yoloDetector;
}

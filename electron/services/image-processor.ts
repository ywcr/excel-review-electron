import sharp from "sharp";

/**
 * 图片处理器 - 使用 Sharp 实现高性能图片分析
 */
export class ImageProcessor {
  /**
   * 计算图片的感知哈希（Blockhash 算法）
   * 用于检测重复图片
   */
  async calculateBlockhash(imageBuffer: Buffer): Promise<string> {
    try {
      // 1. 调整为 16x16 灰度图
      const { data, info } = await sharp(imageBuffer)
        .resize(16, 16, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // 2. 计算平均值
      let total = 0;
      for (let i = 0; i < data.length; i++) {
        total += data[i];
      }
      const average = total / data.length;

      // 3. 生成哈希: 大于平均值为1，小于为0
      let hash = "";
      for (let i = 0; i < data.length; i++) {
        hash += data[i] >= average ? "1" : "0";
      }

      return hash;
    } catch (error) {
      console.error("Blockhash calculation failed:", error);
      return "";
    }
  }

  /**
   * 计算两个哈希之间的汉明距离
   * 用于判断图片相似度
   */
  hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
  }

  /**
   * 检测图片模糊度（与 PC Worker calculateImageSharpness 完全一致）
   * 使用 Laplacian 方差方法
   * 返回 0-100 的清晰度分数，< 60 认为是模糊
   */
  async detectBlur(imageBuffer: Buffer): Promise<number> {
    try {
      // 获取图片尺寸
      const metadata = await sharp(imageBuffer).metadata();
      const originalWidth = metadata.width || 256;
      const originalHeight = metadata.height || 256;

      // 与 PC Worker 一致：缩放到短边不超过 256px
      const scale = Math.min(256 / Math.min(originalWidth, originalHeight), 1);
      const width = Math.floor(originalWidth * scale);
      const height = Math.floor(originalHeight * scale);

      // 获取灰度图像数据
      const { data } = await sharp(imageBuffer)
        .resize(width, height, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // 与 PC Worker 完全一致的 Laplacian 卷积核 (3x3)
      // [[0, -1, 0], [-1, 4, -1], [0, -1, 0]]
      const laplacian = [
        [0, -1, 0],
        [-1, 4, -1],
        [0, -1, 0],
      ];

      let variance = 0;
      let count = 0;

      // 应用 Laplacian 卷积（跳过边界像素，与 PC Worker 一致）
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let sum = 0;
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const px = x + kx - 1;
              const py = y + ky - 1;
              sum += data[py * width + px] * laplacian[ky][kx];
            }
          }
          variance += sum * sum;
          count++;
        }
      }

      // 计算方差
      const laplacianVariance = count > 0 ? variance / count : 0;

      // 与 PC Worker 完全一致: 将方差映射到 0-100 的清晰度分数
      // 经验值：方差 > 500 通常是清晰图片，< 100 通常是模糊图片
      const sharpnessScore = Math.min(100, Math.max(0, laplacianVariance / 10));

      return sharpnessScore;
    } catch (error) {
      console.error("Blur detection failed:", error);
      return 50; // 与 PC Worker 一致：默认中等清晰度
    }
  }

  /**
   * 计算数据方差
   */
  private calculateVariance(data: Buffer): number {
    let sum = 0;
    let sumSquared = 0;
    const length = data.length;

    for (let i = 0; i < length; i++) {
      const value = data[i];
      sum += value;
      sumSquared += value * value;
    }

    const mean = sum / length;
    const variance = sumSquared / length - mean * mean;
    return variance;
  }

  /**
   * 获取图片元数据
   */
  async getImageMetadata(imageBuffer: Buffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || "unknown",
        size: imageBuffer.length,
        megapixels:
          metadata.width && metadata.height
            ? (metadata.width * metadata.height) / 1_000_000
            : 0,
        exif: metadata.exif ? this.parseExif(metadata.exif) : null,
      };
    } catch (error) {
      console.error("Failed to get image metadata:", error);
      return null;
    }
  }

  /**
   * 简化的 EXIF 解析
   */
  private parseExif(exifBuffer: Buffer): any {
    try {
      // Sharp 的 metadata.exif 包含原始 EXIF 数据
      // 这里简化处理，只提取关键字段
      return {
        hasExif: true,
        // 可以使用 exif-reader 库进一步解析
        // 暂时标记为有 EXIF
      };
    } catch (error) {
      return { hasExif: false };
    }
  }

  /**
   * 检测图片边框（与 PC 端一致的算法）
   * 分析边缘像素判断是否有明显边框
   */
  async detectBorder(imageBuffer: Buffer): Promise<{
    hasBorder: boolean;
    borderSides: string[];
    borderWidth: Record<string, number>;
  }> {
    // 边框检测配置（调整后更敏感）
    const BORDER_CONFIG = {
      BORDER_MIN_WIDTH: 1,        // 最小边框宽度（像素）- 检测1px边框
      BORDER_MAX_WIDTH: 40,       // 最大边框宽度（像素）
      BORDER_COLOR_TOLERANCE: 20, // 颜色容差（0-255）- 适当放宽
      BORDER_CONSISTENCY_RATIO: 0.85, // 边框一致性比例（85%的像素需要符合条件）
      BORDER_BRIGHTNESS_DIFF: 25, // 边框与内容的最小亮度差异 - 降低以检测更多边框
    };

    try {
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height, channels } = info;
      const borderSides: string[] = [];
      const borderWidth: Record<string, number> = {};

      // 检测上边框
      const topBorderWidth = this.detectBorderEdge(data, width, height, channels, "top", BORDER_CONFIG);
      if (topBorderWidth >= BORDER_CONFIG.BORDER_MIN_WIDTH && topBorderWidth <= BORDER_CONFIG.BORDER_MAX_WIDTH) {
        borderSides.push("top");
        borderWidth.top = topBorderWidth;
      }

      // 检测下边框
      const bottomBorderWidth = this.detectBorderEdge(data, width, height, channels, "bottom", BORDER_CONFIG);
      if (bottomBorderWidth >= BORDER_CONFIG.BORDER_MIN_WIDTH && bottomBorderWidth <= BORDER_CONFIG.BORDER_MAX_WIDTH) {
        borderSides.push("bottom");
        borderWidth.bottom = bottomBorderWidth;
      }

      // 检测左边框
      const leftBorderWidth = this.detectBorderEdge(data, width, height, channels, "left", BORDER_CONFIG);
      if (leftBorderWidth >= BORDER_CONFIG.BORDER_MIN_WIDTH && leftBorderWidth <= BORDER_CONFIG.BORDER_MAX_WIDTH) {
        borderSides.push("left");
        borderWidth.left = leftBorderWidth;
      }

      // 检测右边框
      const rightBorderWidth = this.detectBorderEdge(data, width, height, channels, "right", BORDER_CONFIG);
      if (rightBorderWidth >= BORDER_CONFIG.BORDER_MIN_WIDTH && rightBorderWidth <= BORDER_CONFIG.BORDER_MAX_WIDTH) {
        borderSides.push("right");
        borderWidth.right = rightBorderWidth;
      }

      return {
        hasBorder: borderSides.length > 0,
        borderSides,
        borderWidth,
      };
    } catch (error) {
      console.error("Border detection failed:", error);
      return { hasBorder: false, borderSides: [], borderWidth: {} };
    }
  }

  /**
   * 检测单条边的边框（与 PC 端一致的算法）
   * @param data 图片像素数据
   * @param width 图片宽度
   * @param height 图片高度
   * @param channels 颜色通道数
   * @param side 检测的边（'top', 'bottom', 'left', 'right'）
   * @param config 边框检测配置
   * @returns 边框宽度（像素数），如果不存在边框返回0
   */
  private detectBorderEdge(
    data: Buffer,
    width: number,
    height: number,
    channels: number,
    side: "top" | "bottom" | "left" | "right",
    config: {
      BORDER_COLOR_TOLERANCE: number;
      BORDER_CONSISTENCY_RATIO: number;
      BORDER_BRIGHTNESS_DIFF: number;
    }
  ): number {
    const tolerance = config.BORDER_COLOR_TOLERANCE;
    const consistencyRatio = config.BORDER_CONSISTENCY_RATIO;

    // 根据边的位置确定扫描参数
    let maxScanDepth: number;
    let getPixelIndex: (depth: number, offset: number) => number;
    let scanLength: number;

    switch (side) {
      case "top":
        maxScanDepth = Math.min(height, 50); // 最多扫描50行
        scanLength = width;
        getPixelIndex = (depth, offset) => (depth * width + offset) * channels;
        break;
      case "bottom":
        maxScanDepth = Math.min(height, 50);
        scanLength = width;
        getPixelIndex = (depth, offset) => ((height - 1 - depth) * width + offset) * channels;
        break;
      case "left":
        maxScanDepth = Math.min(width, 50); // 最多扫描50列
        scanLength = height;
        getPixelIndex = (depth, offset) => (offset * width + depth) * channels;
        break;
      case "right":
        maxScanDepth = Math.min(width, 50);
        scanLength = height;
        getPixelIndex = (depth, offset) => (offset * width + (width - 1 - depth)) * channels;
        break;
    }

    let lastLineBrightness: number | null = null;

    // 从外向内逐行/列扫描
    for (let depth = 0; depth < maxScanDepth; depth++) {
      // 获取当前行/列的所有像素颜色
      const colors: number[][] = [];
      for (let offset = 0; offset < scanLength; offset++) {
        const idx = getPixelIndex(depth, offset);
        colors.push([data[idx], data[idx + 1], data[idx + 2]]);
      }

      // 计算当前行/列的平均亮度
      const currentBrightness = colors.reduce((sum, color) =>
        sum + (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]), 0
      ) / colors.length;

      // 检查这行/列是否是纯色边框
      if (this.isSolidColorLine(colors, tolerance, consistencyRatio)) {
        lastLineBrightness = currentBrightness;
        continue;
      } else {
        // 遇到非纯色行/列
        if (depth === 0) {
          // 第一行/列就不是纯色，无边框
          return 0;
        }

        // 检查边框与内容的对比度（避免将内部的白色区域误判为边框）
        if (lastLineBrightness !== null) {
          const brightnessDiff = Math.abs(currentBrightness - lastLineBrightness);
          // 如果亮度差异很小，说明不是真正的边界，可能是内部区域
          if (brightnessDiff < config.BORDER_BRIGHTNESS_DIFF) {
            return 0;
          }
        }

        return depth;
      }
    }

    // 如果扫描到最大深度都是纯色，可能不是边框而是大面积纯色区域
    // 返回0表示不认为是边框
    return 0;
  }

  /**
   * 检查一行/列像素是否为纯色（与 PC 端一致的算法）
   * @param colors 像素颜色数组 [[r,g,b], [r,g,b], ...]
   * @param tolerance 颜色容差
   * @param consistencyRatio 一致性比例阈值
   * @returns 是否为纯色
   */
  private isSolidColorLine(
    colors: number[][],
    tolerance: number,
    consistencyRatio: number
  ): boolean {
    if (colors.length === 0) return false;

    // 计算平均颜色
    const avgColor = [0, 0, 0];
    for (const color of colors) {
      avgColor[0] += color[0];
      avgColor[1] += color[1];
      avgColor[2] += color[2];
    }
    avgColor[0] = Math.round(avgColor[0] / colors.length);
    avgColor[1] = Math.round(avgColor[1] / colors.length);
    avgColor[2] = Math.round(avgColor[2] / colors.length);

    // 检查有多少像素在容差范围内
    let consistentPixels = 0;
    for (const color of colors) {
      const rDiff = Math.abs(color[0] - avgColor[0]);
      const gDiff = Math.abs(color[1] - avgColor[1]);
      const bDiff = Math.abs(color[2] - avgColor[2]);

      // 使用最大色差作为判断标准（允许轻微渐变）
      if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
        consistentPixels++;
      }
    }

    // 检查一致性比例是否达到阈值
    const ratio = consistentPixels / colors.length;
    return ratio >= consistencyRatio;
  }

  /**
   * 生成缩略图（用于图片预览）
   * @param imageBuffer 原始图片数据
   * @param maxSide 最大边长（默认 512）
   * @param quality JPEG 质量（默认 85）
   * @returns Base64 编码的缩略图数据和 MIME 类型
   */
  async createThumbnail(
    imageBuffer: Buffer,
    maxSide: number = 512,
    quality: number = 85
  ): Promise<{ data: string; mimeType: string } | null> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // 计算缩放比例
      const scale = Math.min(maxSide / Math.max(width, height), 1);
      const newWidth = Math.max(1, Math.floor(width * scale));
      const newHeight = Math.max(1, Math.floor(height * scale));

      // 生成 JPEG 缩略图
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, { fit: "inside" })
        .jpeg({ quality })
        .toBuffer();

      // 转换为 Base64
      const base64 = thumbnailBuffer.toString("base64");

      return {
        data: `data:image/jpeg;base64,${base64}`,
        mimeType: "image/jpeg",
      };
    } catch (error) {
      console.error("缩略图生成失败:", error);
      return null;
    }
  }
}

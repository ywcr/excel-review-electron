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
   * 检测图片边框
   * 分析边缘像素判断是否有明显边框
   */
  async detectBorder(imageBuffer: Buffer): Promise<{
    hasBorder: boolean;
    borderSides: string[];
    borderWidth: Record<string, number>;
  }> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height, channels } = info;
      const borderSides: string[] = [];
      const borderWidth: Record<string, number> = {};

      // 检测上边框
      if (this.hasBorderOnSide(data, width, height, channels, "top")) {
        borderSides.push("top");
        borderWidth.top = this.measureBorderWidth(
          data,
          width,
          height,
          channels,
          "top"
        );
      }

      // 检测下边框
      if (this.hasBorderOnSide(data, width, height, channels, "bottom")) {
        borderSides.push("bottom");
        borderWidth.bottom = this.measureBorderWidth(
          data,
          width,
          height,
          channels,
          "bottom"
        );
      }

      // 检测左边框
      if (this.hasBorderOnSide(data, width, height, channels, "left")) {
        borderSides.push("left");
        borderWidth.left = this.measureBorderWidth(
          data,
          width,
          height,
          channels,
          "left"
        );
      }

      // 检测右边框
      if (this.hasBorderOnSide(data, width, height, channels, "right")) {
        borderSides.push("right");
        borderWidth.right = this.measureBorderWidth(
          data,
          width,
          height,
          channels,
          "right"
        );
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
   * 检测某一侧是否有边框
   */
  private hasBorderOnSide(
    data: Buffer,
    width: number,
    height: number,
    channels: number,
    side: string
  ): boolean {
    const threshold = 10; // 像素差异阈值
    const sampleSize = Math.min(
      10,
      side === "top" || side === "bottom" ? width : height
    );

    // 简化：检查边缘像素是否统一（接近纯色）
    const pixels: number[] = [];

    for (let i = 0; i < sampleSize; i++) {
      let index = 0;
      if (side === "top") {
        index = i * channels;
      } else if (side === "bottom") {
        index = (height - 1) * width * channels + i * channels;
      } else if (side === "left") {
        index = i * width * channels;
      } else if (side === "right") {
        index = i * width * channels + (width - 1) * channels;
      }

      pixels.push(data[index]);
    }

    // 计算方差，如果很小则认为是边框
    const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance =
      pixels.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      pixels.length;

    return variance < threshold;
  }

  /**
   * 测量边框宽度
   */
  private measureBorderWidth(
    data: Buffer,
    width: number,
    height: number,
    channels: number,
    side: string
  ): number {
    // 简化实现：返回估计值
    return 1;
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

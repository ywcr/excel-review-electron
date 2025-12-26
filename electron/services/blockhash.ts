/**
 * Blockhash 算法 - 与 PC Worker (blockhash-core.js) 完全一致
 *
 * 来源：/Users/yao/Yao/excel-review-app/public/blockhash-core.js
 *
 * 这是感知哈希算法的 Node.js 实现，用于检测视觉相似的图片。
 * 算法步骤：
 * 1. 将图片分成 bits×bits 个块
 * 2. 计算每个块的 RGB 亮度总和
 * 3. 按四个水平带的中位数将亮度值转换为 0/1
 * 4. 将二进制数组转换为十六进制字符串
 */

import sharp from "sharp";

/**
 * 计算中位数
 */
function median(data: number[]): number {
  const mdarr = data.slice(0).sort((a, b) => a - b);

  if (mdarr.length % 2 === 0) {
    return (mdarr[mdarr.length / 2 - 1] + mdarr[mdarr.length / 2]) / 2.0;
  }

  return mdarr[Math.floor(mdarr.length / 2)];
}

/**
 * 将亮度块转换为二进制位
 */
function translateBlocksToBits(blocks: number[], pixelsPerBlock: number): void {
  const halfBlockValue = (pixelsPerBlock * 256 * 3) / 2;
  const bandsize = blocks.length / 4;

  // 按四个水平带比较中位数
  for (let i = 0; i < 4; i++) {
    const m = median(blocks.slice(i * bandsize, (i + 1) * bandsize));
    for (let j = i * bandsize; j < (i + 1) * bandsize; j++) {
      const v = blocks[j];

      // 如果块亮度大于中位数则输出 1
      // 处理中位数为 0 或最大值的边缘情况
      blocks[j] = Number(v > m || (Math.abs(v - m) < 1 && m > halfBlockValue));
    }
  }
}

/**
 * 将二进制位数组转换为十六进制哈希字符串
 */
function bitsToHexhash(bitsArray: number[]): string {
  const hex: string[] = [];

  for (let i = 0; i < bitsArray.length; i += 4) {
    const nibble = bitsArray.slice(i, i + 4);
    hex.push(parseInt(nibble.join(""), 2).toString(16));
  }

  return hex.join("");
}

/**
 * 偶数尺寸图片的 bmvbhash 计算
 */
function bmvbhashEven(
  data: Uint8Array,
  width: number,
  height: number,
  bits: number
): string {
  const blocksizeX = Math.floor(width / bits);
  const blocksizeY = Math.floor(height / bits);

  const result: number[] = [];

  for (let y = 0; y < bits; y++) {
    for (let x = 0; x < bits; x++) {
      let total = 0;

      for (let iy = 0; iy < blocksizeY; iy++) {
        for (let ix = 0; ix < blocksizeX; ix++) {
          const cx = x * blocksizeX + ix;
          const cy = y * blocksizeY + iy;
          const ii = (cy * width + cx) * 4;

          const alpha = data[ii + 3];
          total += alpha === 0 ? 765 : data[ii] + data[ii + 1] + data[ii + 2];
        }
      }

      result.push(total);
    }
  }

  translateBlocksToBits(result, blocksizeX * blocksizeY);

  return bitsToHexhash(result);
}

/**
 * bmvbhash 算法 - Block Mean Value Based perceptual Hash
 * 与 PC Worker 的 blockhash-core.js 完全一致
 */
function bmvbhash(
  data: Uint8Array,
  width: number,
  height: number,
  bits: number
): string {
  const result: number[] = [];

  const evenX = width % bits === 0;
  const evenY = height % bits === 0;

  if (evenX && evenY) {
    return bmvbhashEven(data, width, height, bits);
  }

  // 初始化块数组
  const blocks: number[][] = [];
  for (let i = 0; i < bits; i++) {
    blocks.push([]);
    for (let j = 0; j < bits; j++) {
      blocks[i].push(0);
    }
  }

  const blockWidth = width / bits;
  const blockHeight = height / bits;

  for (let y = 0; y < height; y++) {
    let blockTop: number, blockBottom: number;
    let weightTop: number, weightBottom: number;

    if (evenY) {
      blockTop = blockBottom = Math.floor(y / blockHeight);
      weightTop = 1;
      weightBottom = 0;
    } else {
      const yMod = (y + 1) % blockHeight;
      const yFrac = yMod - Math.floor(yMod);
      const yInt = yMod - yFrac;

      weightTop = 1 - yFrac;
      weightBottom = yFrac;

      if (yInt > 0 || y + 1 === height) {
        blockTop = blockBottom = Math.floor(y / blockHeight);
      } else {
        blockTop = Math.floor(y / blockHeight);
        blockBottom = Math.ceil(y / blockHeight);
      }
    }

    for (let x = 0; x < width; x++) {
      const ii = (y * width + x) * 4;

      const alpha = data[ii + 3];
      const avgvalue =
        alpha === 0 ? 765 : data[ii] + data[ii + 1] + data[ii + 2];

      let blockLeft: number, blockRight: number;
      let weightLeft: number, weightRight: number;

      if (evenX) {
        blockLeft = blockRight = Math.floor(x / blockWidth);
        weightLeft = 1;
        weightRight = 0;
      } else {
        const xMod = (x + 1) % blockWidth;
        const xFrac = xMod - Math.floor(xMod);
        const xInt = xMod - xFrac;

        weightLeft = 1 - xFrac;
        weightRight = xFrac;

        if (xInt > 0 || x + 1 === width) {
          blockLeft = blockRight = Math.floor(x / blockWidth);
        } else {
          blockLeft = Math.floor(x / blockWidth);
          blockRight = Math.ceil(x / blockWidth);
        }
      }

      // 按权重添加像素值到相关块
      blocks[blockTop][blockLeft] += avgvalue * weightTop * weightLeft;
      blocks[blockTop][blockRight] += avgvalue * weightTop * weightRight;
      blocks[blockBottom][blockLeft] += avgvalue * weightBottom * weightLeft;
      blocks[blockBottom][blockRight] += avgvalue * weightBottom * weightRight;
    }
  }

  for (let i = 0; i < bits; i++) {
    for (let j = 0; j < bits; j++) {
      result.push(blocks[i][j]);
    }
  }

  translateBlocksToBits(result, blockWidth * blockHeight);

  return bitsToHexhash(result);
}

/**
 * 计算十六进制哈希的汉明距离
 * 与 PC Worker 的 calculateHammingDistanceHex 完全一致
 */
export function calculateHammingDistanceHex(
  hash1: string,
  hash2: string
): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;

    // 计算 XOR 结果中 1 的个数（汉明距离）
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * 从图片 Buffer 计算 bmvbhash
 * @param imageBuffer 图片数据
 * @param bits 哈希位数（默认 12，与 PC Worker 一致）
 * @returns 十六进制哈希字符串
 */
export async function calculateBlockhash(
  imageBuffer: Buffer,
  bits: number = 12
): Promise<{ hash: string; width: number; height: number }> {
  try {
    // 使用 Sharp 获取原始像素数据
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha() // 确保有 alpha 通道
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(
      `📷 [Blockhash] 图片尺寸: ${info.width}x${info.height}, 通道: ${info.channels}, 像素数据长度: ${data.length}`
    );

    const hash = bmvbhash(data, info.width, info.height, bits);

    // 验证哈希格式
    const expectedLength = (bits * bits) / 4; // 12x12/4 = 36
    console.log(
      `📷 [Blockhash] 生成哈希: ${hash} (长度: ${hash.length}, 期望: ${expectedLength})`
    );

    if (hash.length !== expectedLength) {
      console.error(
        `📷 [Blockhash] ⚠️ 哈希长度异常! 期望 ${expectedLength}, 实际 ${hash.length}`
      );
    }

    return {
      hash,
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    console.error("Blockhash 计算失败:", error);
    return { hash: "", width: 0, height: 0 };
  }
}

export default {
  bmvbhash,
  calculateBlockhash,
  calculateHammingDistanceHex,
};

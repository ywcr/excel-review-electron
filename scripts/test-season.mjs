/**
 * 快速测试 CLIP 季节检测
 * 用法: node scripts/test-season.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testClipSeason() {
  // 动态导入编译后的模块
  const clipModule = await import("../dist-electron/services/clip-detector.js");
  const yoloModule = await import("../dist-electron/services/yolo-detector.js");

  const clipDetector = clipModule.getClipDetector();
  const yoloDetector = yoloModule.getYoloDetector();

  // 测试图片 - 被误判的图片
  const testImages = [
    "debug_images/image2.jpeg",  // 无人药店
    "debug_images/image3.jpeg",  // 羽绒服（应该是冬季）
    "debug_images/image6.jpeg",  // 药店内部
    "debug_images/image9.jpeg",  // 另一张
  ];

  console.log("=== CLIP 季节检测快速测试 ===\n");

  for (const imagePath of testImages) {
    const fullPath = path.join(__dirname, "..", imagePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ 文件不存在: ${imagePath}\n`);
      continue;
    }

    console.log(`📷 测试图片: ${imagePath}`);
    const imageBuffer = fs.readFileSync(fullPath);

    try {
      // YOLO 检测
      const yoloResult = await yoloDetector.detect(imageBuffer);
      const hasPerson = yoloResult.some((obj) => obj.label === "person");
      const hasPlant = yoloResult.some((obj) => 
        obj.label === "potted plant" || obj.label === "plant"
      );
      console.log(`   YOLO: 有人=${hasPerson}, 有植物=${hasPlant}`);

      // CLIP 检测
      const clipResult = await clipDetector.detect(imageBuffer);
      if (clipResult) {
        console.log(`   场景类型: ${clipResult.sceneType}`);
        console.log(`   季节跳过: ${clipResult.seasonSkipped} ${clipResult.seasonSkipReason || ""}`);
        console.log(`   穿着季节: ${clipResult.clothingSeason || "未检测"}`);
        console.log(`   场景季节: ${clipResult.scenerySeason || "未检测"}`);
        console.log(`   最终季节: ${clipResult.detectedSeason} (置信度: ${clipResult.seasonConfidence.toFixed(1)}%)`);
      } else {
        console.log("   ❌ CLIP 检测失败");
      }
    } catch (err) {
      console.log(`   ❌ 错误: ${err.message}`);
    }
    console.log("");
  }
}

testClipSeason().catch(console.error);

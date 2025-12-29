/**
 * 添加模糊检测 prompts 到 text-embeddings.json
 * 运行: node add-blur-embeddings.cjs
 */
const fs = require("fs");
const path = require("path");

async function addBlurEmbeddings() {
  const embeddingsPath = path.join(__dirname, "electron", "models", "text-embeddings.json");
  
  // 检查文件是否存在
  if (!fs.existsSync(embeddingsPath)) {
    console.error("❌ text-embeddings.json 不存在");
    return;
  }

  // 加载现有嵌入
  const embeddings = JSON.parse(fs.readFileSync(embeddingsPath, "utf-8"));
  console.log(`📚 现有嵌入数量: ${Object.keys(embeddings).length}`);

  // 检查是否已有模糊检测嵌入
  const blurPrompts = [
    "a blurry, out of focus, or motion blurred photo",
    "a sharp, clear, and in-focus photo",
  ];

  const missingPrompts = blurPrompts.filter(p => !embeddings[p]);
  
  if (missingPrompts.length === 0) {
    console.log("✅ 模糊检测嵌入已存在，无需添加");
    return;
  }

  console.log(`⚠️ 缺少 ${missingPrompts.length} 个模糊检测嵌入，需要使用 Python 生成`);
  console.log("\n请运行以下 Python 脚本生成嵌入：");
  console.log(`
import torch
import json
from transformers import CLIPModel, CLIPTokenizer

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")

# 加载现有嵌入
with open("electron/models/text-embeddings.json", "r") as f:
    embeddings = json.load(f)

# 新增模糊检测 prompts
new_texts = [
    "a blurry, out of focus, or motion blurred photo",
    "a sharp, clear, and in-focus photo",
]

for text in new_texts:
    if text not in embeddings:
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            text_embeds = model.get_text_features(**inputs)
            embeddings[text] = text_embeds[0].tolist()
        print(f"Added: {text}")

# 保存
with open("electron/models/text-embeddings.json", "w") as f:
    json.dump(embeddings, f)

print(f"Total embeddings: {len(embeddings)}")
  `);
}

addBlurEmbeddings().catch(console.error);

"""
更新 text-embeddings.json，添加新的水印检测 prompts
使用 safetensors 加载模型以兼容较老的 torch 版本
"""
import os
import json
import torch
from transformers import CLIPModel, CLIPTokenizer

# 输出目录
OUTPUT_DIR = "electron/models"
EMBEDDINGS_PATH = os.path.join(OUTPUT_DIR, "text-embeddings.json")

print("🔄 加载 CLIP 模型 (使用 safetensors)...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", use_safetensors=True)
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
model.eval()

# 新增的 prompts
new_texts = [
    "a photo with semi-transparent text or logo watermark",
    "a photo with faint watermark in the corner",
    # 新增的季节检测提示词（春夏秋冬四季）
    "winter scenery with bare leafless trees, snow, frost, dry branches or cold weather",
    "autumn scenery with golden yellow and orange leaves falling from trees",
    "summer scenery with dense green foliage, bright sunshine and blue sky",
    "spring scenery with cherry blossoms, colorful flowers blooming, and fresh green leaves",
]

# 需要删除的旧提示词
old_texts_to_remove = [
    "winter scenery with snow, bare trees, frost, or ice",
    "autumn scenery with yellow, orange, or red falling leaves",
    "summer scenery with lush green trees and bright sunshine",
    "spring scenery with blooming flowers and fresh green buds",
]

# 加载现有的嵌入
existing_embeddings = {}
if os.path.exists(EMBEDDINGS_PATH):
    with open(EMBEDDINGS_PATH, "r", encoding="utf-8") as f:
        existing_embeddings = json.load(f)
    print(f"📚 已加载 {len(existing_embeddings)} 个现有嵌入")

# 删除旧的提示词嵌入
for old_text in old_texts_to_remove:
    if old_text in existing_embeddings:
        del existing_embeddings[old_text]
        print(f"  🗑️ 已删除旧嵌入: {old_text[:40]}...")

# 计算新的嵌入
print("📝 计算新的文本嵌入...")
for text in new_texts:
    if text in existing_embeddings:
        print(f"  ⏭️ 跳过 (已存在): {text[:40]}...")
        continue
    
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        text_embeds = model.get_text_features(**inputs)
        # 归一化
        text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)
        existing_embeddings[text] = text_embeds[0].tolist()
    print(f"  ✓ {text[:50]}...")

# 保存更新后的嵌入
with open(EMBEDDINGS_PATH, "w", encoding="utf-8") as f:
    json.dump(existing_embeddings, f)
print(f"✅ 文本嵌入已保存: {EMBEDDINGS_PATH} ({len(existing_embeddings)} 个)")

print("\n🎉 完成!")

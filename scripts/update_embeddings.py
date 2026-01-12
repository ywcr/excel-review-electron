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
    # 季节检测提示词（春夏秋冬四季）- 场景
    "winter scenery with bare leafless trees, snow, frost, dry branches or cold weather",
    "autumn scenery with golden yellow and orange leaves falling from trees",
    "summer scenery with dense green foliage, bright sunshine and blue sky",
    "spring scenery with cherry blossoms, colorful flowers blooming, and fresh green leaves",
    # 模糊检测 prompts
    "a blurry, out of focus, or motion blurred photo",
    "a sharp, clear, and in-focus photo",
    # 场景类型检测 prompts
    "indoor shop, store, pharmacy, supermarket, or retail space with product shelves and merchandise",
    "urban city street scene with buildings, roads, sidewalks, and no trees or plants visible",
    "outdoor natural scene with trees, plants, grass, flowers, or green vegetation",
    "other scene or mixed environment",
    # 穿着季节 prompts (v8 - 强调围巾区分冬春)
    "person wearing winter clothing with scarf around neck, thick padded coat, down jacket, hooded parka, or heavy winter outerwear",
    "person wearing layered autumn outfit with wool sweater under medium coat or cardigan, no scarf, in cool fall weather",
    "person wearing minimal summer clothes with short sleeves, bare arms, tank top or thin t-shirt in hot sunny weather",
    "person wearing thin unpadded spring jacket or light windbreaker with no scarf and no thick padding",
    "no person in the image",
    # 工装/制服检测 prompt（用于排除不反映季节的穿着）
    "person wearing work uniform, professional attire, staff clothing, or employee outfit",
    # 常绿植物检测 prompt（用于排除不反映季节的植物）
    "evergreen plants like holly, boxwood, pine, cypress, indoor potted plants, or artificial decorative plants that stay green year-round regardless of season",
]

# 需要删除的旧提示词
old_texts_to_remove = [
    "winter scenery with snow, bare trees, frost, or ice",
    "autumn scenery with yellow, orange, or red falling leaves",
    "summer scenery with lush green trees and bright sunshine",
    "spring scenery with blooming flowers and fresh green buds",
    # 旧的穿着季节 prompts (所有历史版本)
    "person wearing heavy winter down jacket with fur hood or collar, thick puffer coat, scarf, gloves, or beanie",
    "person wearing light spring clothes like thin jacket, hoodie, light cardigan, or casual wear",
    "person wearing thick puffy winter coat, bulky down jacket, padded puffer jacket, heavy insulated outerwear",
    "person wearing thin spring jacket, light windbreaker, or single layer casual clothes without thick padding",
    "person wearing very thick puffy inflated down jacket, oversized bulky puffer coat with visible quilted padding, heavy winter outerwear",
    "person wearing thin fitted jacket, light unpadded windbreaker, slim casual clothes, no thick puffy outerwear",
    "no person visible in the image",
    # v4 旧版 prompts (需要删除)
    "person in puffy down jacket or thick winter coat",
    "person in sweater, cardigan, or light coat",
    "person in t-shirt, shorts, or summer dress",
    "person in thin jacket or light clothes",
    # v5 旧版 prompts (需要删除)
    "person wearing very thick heavy puffy down jacket bundled up for freezing cold winter weather",
    "person wearing wool sweater or medium weight jacket in cool autumn weather with layered outfit",
    "person wearing short sleeve t-shirt or tank top with bare arms in hot summer weather",
    "person wearing light spring cardigan or thin windbreaker in mild pleasant weather",
    # v6 旧版冬季 prompt (需要删除)
    "person wearing extremely bulky thick quilted puffy down parka jacket with visible padding, bundled up tightly for freezing cold winter snow weather",
    # v7 旧版 prompts (需要删除)
    "person wearing thick winter coat, down jacket, puffy parka, or padded jacket with scarf or wrapped up warmly for cold winter weather",
    "person wearing layered autumn outfit with wool sweater under medium weight coat or cardigan in cool fall weather",
    "person wearing single layer light spring jacket or thin unpadded windbreaker in mild pleasant weather",
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

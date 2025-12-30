"""
CLIP 模型转换脚本
将 OpenAI CLIP 模型转换为 ONNX 格式，并预计算文本嵌入
"""
import os
import json
import torch
from transformers import CLIPModel, CLIPTokenizer, CLIPProcessor

# 输出目录
OUTPUT_DIR = "electron/models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🔄 加载 CLIP 模型...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
model.eval()

# ===== 1. 导出视觉编码器 =====
print("📦 导出视觉编码器到 ONNX...")

class VisualEncoder(torch.nn.Module):
    def __init__(self, clip_model):
        super().__init__()
        self.vision_model = clip_model.vision_model
        self.visual_projection = clip_model.visual_projection
    
    def forward(self, pixel_values):
        vision_outputs = self.vision_model(pixel_values)
        image_embeds = vision_outputs.pooler_output
        image_embeds = self.visual_projection(image_embeds)
        # 归一化
        image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
        return image_embeds

visual_encoder = VisualEncoder(model)
dummy_image = torch.randn(1, 3, 224, 224)

visual_onnx_path = os.path.join(OUTPUT_DIR, "clip-visual.onnx")
torch.onnx.export(
    visual_encoder,
    dummy_image,
    visual_onnx_path,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=14
)
print(f"✅ 视觉编码器已保存: {visual_onnx_path}")

# ===== 2. 预计算文本嵌入 =====
print("📝 预计算文本嵌入...")

texts = [
    # 水印检测
    "a photo with visible watermark or logo overlay",
    "a clean photo without any watermark",
    # 穿着季节
    "person wearing heavy winter clothes like down jacket, coat, or scarf",
    "person wearing autumn clothes like sweater or light jacket",
    "person wearing summer clothes like t-shirt, shorts, or dress",
    "person wearing spring clothes like thin jacket or long sleeves",
    "no person visible in the image",
    # 场景季节
    "winter scenery with snow, bare trees, frost, or ice",
    "autumn scenery with yellow, orange, or red falling leaves",
    "summer scenery with lush green trees and bright sunshine",
    "spring scenery with blooming flowers and fresh green buds",
    "indoor scene or no natural scenery visible",
]

embeddings = {}
for text in texts:
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        text_embeds = model.get_text_features(**inputs)
        # 归一化
        text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)
        embeddings[text] = text_embeds[0].tolist()
    print(f"  ✓ {text[:50]}...")

embeddings_path = os.path.join(OUTPUT_DIR, "text-embeddings.json")
with open(embeddings_path, "w", encoding="utf-8") as f:
    json.dump(embeddings, f, indent=2)
print(f"✅ 文本嵌入已保存: {embeddings_path}")

# ===== 3. 验证 =====
print("\n📊 模型文件大小:")
for fname in ["clip-visual.onnx", "text-embeddings.json"]:
    fpath = os.path.join(OUTPUT_DIR, fname)
    if os.path.exists(fpath):
        size_mb = os.path.getsize(fpath) / (1024 * 1024)
        print(f"  {fname}: {size_mb:.2f} MB")

print("\n🎉 转换完成!")

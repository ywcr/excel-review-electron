"""
快速测试 CLIP 季节检测 (直接计算版)
用法: python scripts/test_season.py
"""
import os
import numpy as np
from PIL import Image

# 尝试导入必要库
try:
    import onnxruntime as ort
    import torch
    from transformers import CLIPModel, CLIPTokenizer
except ImportError as e:
    print(f"缺少依赖: {e}")
    print("请安装: pip install onnxruntime torch transformers")
    exit(1)

# 路径
SCRIPT_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(SCRIPT_DIR, "..", "electron", "models")
VISUAL_MODEL = os.path.join(MODEL_DIR, "clip-visual-fp16.onnx")

# 穿着季节 prompts (简化版)
CLOTHING_PROMPTS = [
    "person in puffy down jacket or thick winter coat",
    "person in sweater, cardigan, or light coat",
    "person in t-shirt, shorts, or summer dress",
    "person in thin jacket or light clothes",
    "no person in the image",
]

SEASONS = ["winter", "autumn", "summer", "spring", "no_person"]

# 预处理图片
def preprocess_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_array = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.48145466, 0.4578275, 0.40821073])
    std = np.array([0.26862954, 0.26130258, 0.27577711])
    img_array = (img_array - mean) / std
    img_array = img_array.transpose(2, 0, 1)
    img_array = np.expand_dims(img_array, axis=0).astype(np.float32)
    return img_array

def test_image(visual_session, text_embeddings, image_path):
    print(f"\n📷 测试: {os.path.basename(image_path)}")
    
    input_tensor = preprocess_image(image_path)
    outputs = visual_session.run(None, {"input": input_tensor})
    image_embedding = outputs[0][0]
    image_embedding = image_embedding / np.linalg.norm(image_embedding)
    
    print("   穿着季节分数:")
    scores = []
    for i, prompt in enumerate(CLOTHING_PROMPTS):
        text_emb = text_embeddings[i]
        similarity = np.dot(image_embedding, text_emb)
        scores.append(similarity)
        print(f"   {SEASONS[i]:10s}: {similarity*100:.1f}%")
    
    max_idx = np.argmax(scores[:4])
    no_person_score = scores[4]
    max_clothing_score = scores[max_idx]
    
    if no_person_score > max_clothing_score:
        print(f"   -> 结果: 无人 (no_person: {no_person_score*100:.1f}% > 最高服饰: {max_clothing_score*100:.1f}%)")
    else:
        print(f"   -> 结果: {SEASONS[max_idx]} ({max_clothing_score*100:.1f}%)")

def main():
    print("=== CLIP 季节检测快速测试 (直接计算版) ===")
    
    # 加载文本编码器
    print("加载 CLIP 文本编码器...")
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", use_safetensors=True)
    tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
    clip_model.eval()
    
    # 计算文本 embeddings
    print("计算穿着季节文本 embeddings...")
    text_embeddings = []
    for prompt in CLOTHING_PROMPTS:
        inputs = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            text_embeds = clip_model.get_text_features(**inputs)
            text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)
            text_embeddings.append(text_embeds[0].numpy())
    
    # 加载视觉模型
    print(f"加载 CLIP 视觉模型...")
    visual_session = ort.InferenceSession(VISUAL_MODEL, providers=["CPUExecutionProvider"])
    print("模型加载成功!")
    
    # 测试图片
    test_images = [
        "debug_images/image2.jpeg",
        "debug_images/image3.jpeg",
        "debug_images/image6.jpeg",
        "debug_images/image9.jpeg",
    ]
    
    base_dir = os.path.join(SCRIPT_DIR, "..")
    
    for img in test_images:
        full_path = os.path.join(base_dir, img)
        if os.path.exists(full_path):
            test_image(visual_session, text_embeddings, full_path)
        else:
            print(f"\n❌ 文件不存在: {img}")

if __name__ == "__main__":
    main()

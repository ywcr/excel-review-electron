# 模型设置指南

本项目使用 CLIP 模型进行水印检测和季节识别，YOLO 模型进行物体检测。

## 模型文件结构

```
electron/models/
├── clip-visual-fp16.onnx   # CLIP 视觉编码器 FP16 量化版 (~170MB)
├── text-embeddings.json    # 预计算的文本嵌入 (~180KB)
└── yolov8s.onnx            # YOLOv8s 物体检测模型 (~44MB)
```

## 方式一：使用预转换的 ONNX 模型

从 HuggingFace 下载已转换的 CLIP ONNX 模型：

1. 访问 https://huggingface.co/models?search=clip+onnx
2. 下载 `clip-vit-base-patch32` 的 ONNX 版本
3. 将 visual encoder 模型重命名为 `clip-visual.onnx`
4. 放入 `electron/models/` 目录

## 方式二：自行转换 PyTorch 模型

需要 Python 环境和 PyTorch。

### 1. 安装依赖

```bash
pip install torch transformers onnx onnxruntime
```

### 2. 运行转换脚本

```python
# convert_clip.py
import torch
from transformers import CLIPModel, CLIPProcessor

# 加载模型
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# 导出视觉编码器
model.eval()
dummy_image = torch.randn(1, 3, 224, 224)

# 仅导出视觉部分
class VisualEncoder(torch.nn.Module):
    def __init__(self, clip_model):
        super().__init__()
        self.vision_model = clip_model.vision_model
        self.visual_projection = clip_model.visual_projection

    def forward(self, pixel_values):
        vision_outputs = self.vision_model(pixel_values)
        image_embeds = vision_outputs.pooler_output
        image_embeds = self.visual_projection(image_embeds)
        return image_embeds

visual_encoder = VisualEncoder(model)
torch.onnx.export(
    visual_encoder,
    dummy_image,
    "electron/models/clip-visual.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=14
)

print("Visual encoder exported!")
```

### 3. 预计算文本嵌入

```python
# compute_embeddings.py
import torch
import json
from transformers import CLIPModel, CLIPTokenizer

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")

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
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        text_embeds = model.get_text_features(**inputs)
        embeddings[text] = text_embeds[0].tolist()

with open("electron/models/text-embeddings.json", "w") as f:
    json.dump(embeddings, f)

print("Text embeddings saved!")
```

## 验证模型

启动应用后，查看控制台日志：

- `✅ CLIP detector initialized successfully` = 模型加载成功
- `⚠️ CLIP visual model not found` = 模型文件缺失

## 注意事项

1. 模型文件较大（~350MB），不会包含在 Git 仓库中
2. 打包应用时，模型会自动复制到 `resources/models/` 目录
3. 如果没有模型文件，水印和季节检测功能将被跳过，不影响其他功能

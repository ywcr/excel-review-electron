"""
将 CLIP 模型从 FP32 量化到 FP16
可将模型大小从 335MB 减小到约 170MB
运行: python scripts/quantize_clip_fp16.py
"""
import onnx
from onnxconverter_common import float16
import os

input_model = "electron/models/clip-visual.onnx"
output_model = "electron/models/clip-visual-fp16.onnx"

print(f"正在加载模型: {input_model}")

# 加载外部数据
model = onnx.load(input_model, load_external_data=True)

print("正在转换为 FP16...")
model_fp16 = float16.convert_float_to_float16(model, keep_io_types=True)

print(f"正在保存: {output_model}")
onnx.save(model_fp16, output_model)

size_mb = os.path.getsize(output_model) / 1024 / 1024
print(f"FP16 模型大小: {size_mb:.2f} MB")
print("完成!")

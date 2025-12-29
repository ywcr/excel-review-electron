"""
下载并导出 YOLOv8s 模型到 ONNX 格式
运行: python scripts/export_yolov8s.py
"""
from ultralytics import YOLO
import os
import shutil

# 输出目录
output_dir = "electron/models"
os.makedirs(output_dir, exist_ok=True)

# 下载并导出 YOLOv8s
print("正在下载 YOLOv8s 模型...")
model = YOLO("yolov8s.pt")

print("正在导出到 ONNX 格式...")
model.export(format="onnx", simplify=True, opset=17)

# 移动文件
src = "yolov8s.onnx"
dst = os.path.join(output_dir, "yolov8s.onnx")
if os.path.exists(src):
    shutil.move(src, dst)
    print(f"模型已保存到: {dst}")
    print(f"文件大小: {os.path.getsize(dst) / 1024 / 1024:.2f} MB")

# 清理
if os.path.exists("yolov8s.pt"):
    os.remove("yolov8s.pt")
    print("已删除临时文件 yolov8s.pt")

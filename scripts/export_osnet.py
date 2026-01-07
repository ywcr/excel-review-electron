"""
OSNet ONNX 导出脚本
用于导出 OSNet 人物重识别 (ReID) 模型到 ONNX 格式

使用方法:
    pip install torchreid torch onnx
    python scripts/export_osnet.py

输出:
    electron/models/osnet_x0_75.onnx
"""

import torch
import os
import sys

# 设置环境变量避免 Windows 编码问题
os.environ['PYTHONIOENCODING'] = 'utf-8'

def export_osnet():
    try:
        import torchreid
    except ImportError:
        print("请先安装 torchreid: pip install torchreid")
        sys.exit(1)
    
    # 模型配置
    model_name = 'osnet_x0_75'
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'electron', 'models')
    output_path = os.path.join(output_dir, f'{model_name}.onnx')
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"正在加载 {model_name} 模型...")
    
    # 构建模型 (pretrained on ImageNet)
    model = torchreid.models.build_model(
        name=model_name,
        num_classes=1000,  # 预训练模型的类别数
        pretrained=True
    )
    
    # 设置为评估模式
    model.eval()
    
    # 移除分类层，只保留特征提取部分
    # OSNet 的特征维度是 512
    model.classifier = torch.nn.Identity()
    
    # 创建示例输入 (batch_size=1, channels=3, height=256, width=128)
    # ReID 标准输入尺寸
    dummy_input = torch.randn(1, 3, 256, 128)
    
    print(f"正在导出到 {output_path}...")
    
    # 使用旧版导出 API (dynamo=False) 避免编码问题
    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            },
            dynamo=False  # 使用旧版导出，避免 Windows 编码问题
        )
    
    # 验证模型
    import onnx
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    
    # 获取文件大小
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    
    print(f"导出成功!")
    print(f"   模型路径: {output_path}")
    print(f"   文件大小: {file_size:.2f} MB")
    print(f"   输入尺寸: [batch, 3, 256, 128]")
    print(f"   输出维度: [batch, 512]")

if __name__ == '__main__':
    export_osnet()

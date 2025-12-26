# Electron 项目 - 开发和测试指南

## 项目已创建完成 ✅

所有核心文件已就绪：

- ✅ Electron 主进程 (main.ts, preload.ts)
- ✅ Excel 流式处理 (excel-processor.ts)
- ✅ **完整验证器** (row-validator.ts) - 支持所有验证规则
- ✅ React UI (App.tsx)
- ✅ 类型定义和验证规则
- ✅ 构建配置

## 🚀 快速开始

### 1. 复制项目到目标位置

```bash
cd /Users/yao/Yao
cp -r excel-review-app/electron-template excel-review-electron
cd excel-review-electron
```

### 2. 安装依赖

```bash
npm install
```

预计需要 1-2 分钟。如果 `sharp` 安装失败，可以先跳过：

```bash
npm install --ignore-scripts
```

### 3. 启动开发模式

```bash
npm run dev
```

应用会自动打开 Electron 窗口。

### 4. 测试验证功能

1. 点击"选择文件"
2. 选择一个 Excel 文件
3. 选择任务类型（如"药店拜访"）
4. 点击"开始审核"
5. 观察进度和结果

## 📝 已实现的验证规则

| 规则类型          | 说明                          |
| ----------------- | ----------------------------- |
| required          | 必填项检查                    |
| dateFormat        | 日期格式验证                  |
| duration          | 时长验证（分钟数）            |
| timeRange         | 时间范围（如 8:00-19:00）     |
| prohibitedContent | 禁用词检测                    |
| medicalLevel      | 医疗类型验证                  |
| unique            | 唯一性验证（按天或全局）      |
| dateInterval      | 日期间隔（如 7 天内不能重复） |
| frequency         | 频次限制（如每天不超过 5 次） |
| sameImplementer   | 同一目标需由同一人拜访        |

## 🐛 调试

开发模式下会自动打开 DevTools。查看控制台输出：

- 文件处理进度
- 验证结果
- 错误信息

## 📦 构建安装包

### macOS

```bash
npm run build:mac
```

### Windows

```bash
npm run build:win
```

安装包会生成在 `release/` 目录。

## ⚠️ 已知限制

1. **图片检测未实现** - 需要使用 Sharp 实现
2. **部分高级规则** - crossTaskValidation 等需要多文件上下文
3. **TypeScript 警告** - 需要完善类型定义（不影响运行）

## 下一步改进

1. 添加图片检测功能
2. 完善错误提示
3. 添加导出功能
4. 优化进度反馈粒度

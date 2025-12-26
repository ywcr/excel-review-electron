# Excel 审核系统 - Electron 版

支持处理超大 Excel 文件（3GB+）的桌面应用。

## 功能特点

- ✅ 流式 Excel 处理，无内存限制
- ✅ 支持所有验证规则
- ✅ 实时进度反馈
- ✅ 跨平台支持 (Windows / macOS / Linux)

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run dev
```

## 构建应用

### macOS

```bash
npm run build:mac
```

### Windows

```bash
npm run build:win
```

构建完成后，安装包在 `release` 目录中。

## 技术栈

- **Electron 33+** - 桌面应用框架
- **React 18** - UI 框架
- **Vite** - 构建工具
- **exceljs** - Excel 流式处理
- **TypeScript** - 类型安全

## 与 Web 版本的区别

| 特性         | Web 版         | Electron 版 |
| ------------ | -------------- | ----------- |
| 文件大小限制 | 2-3GB          | 无限制      |
| Excel 处理   | 全部加载到内存 | 流式读取    |
| 安装         | 无需安装       | 需要安装    |
| 更新         | 自动           | 自动更新    |

## 项目结构

```
electron-template/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主入口
│   ├── preload.ts        # 预加载脚本
│   └── services/         # 后台服务
│       └── excel-processor.ts  # Excel 流式处理
├── src/                  # React 渲染进程
│   ├── App.tsx          # 主应用
│   ├── hooks/           # React Hooks
│   └── styles/          # 样式
├── shared/              # 共享代码
│   ├── types/           # TypeScript 类型
│   └── validation-rules/# 验证规则
└── package.json
```

## 迁移说明

本项目从 Web 版本迁移而来，保留了核心审核功能：

- 所有验证规则 ✅
- 多种任务模板 ✅
- 错误提示和报告 ✅

**未迁移功能**（Web 版特有）：

- 登录系统
- 多文件批量审核
- 在线更新

## License

MIT

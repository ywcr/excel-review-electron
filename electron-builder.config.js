/**
 * Electron Builder 配置文件
 * 支持 lite（轻量版）和 full（完整版）两种构建模式
 * 
 * 使用方式：
 * - 轻量版：cross-env BUILD_VARIANT=lite electron-builder
 * - 完整版：cross-env BUILD_VARIANT=full electron-builder（默认）
 */

const isLite = process.env.BUILD_VARIANT === 'lite';

// 公共配置
const baseConfig = {
  appId: "com.excel.review",
  productName: isLite ? "BlueGogo-Lite" : "BlueGogo",
  directories: {
    output: isLite ? "out-lite" : "release"
  },
  files: [
    "dist",
    "dist-electron"
  ],
  mac: {
    target: ["dmg", "zip"],
    category: "public.app-category.productivity",
    icon: "build/icon.png"
  },
  win: {
    icon: "build/icon.png",
    target: [
      // NSIS 安装包暂时关闭（避免文件锁定问题）
      // {
      //   target: "nsis",
      //   arch: ["x64"]
      // },
      {
        target: "portable",
        arch: ["x64"]
      }
    ]
  }
};

// 完整版配置：包含模型和 onnxruntime
const fullConfig = {
  ...baseConfig,
  asarUnpack: [
    "node_modules/sharp/**/*",
    "node_modules/onnxruntime-node/**/*"
  ],
  extraResources: [
    {
      from: "electron/models",
      to: "models",
      filter: ["**/*.onnx", "**/*.json"]
    }
  ]
};

// 轻量版配置：不包含模型和 onnxruntime
const liteConfig = {
  ...baseConfig,
  asarUnpack: [
    "node_modules/sharp/**/*"
  ],
  files: [
    "dist",
    "dist-electron",
    // 排除 onnxruntime-node（轻量版不需要 AI 模型推理）
    "!node_modules/onnxruntime-node/**/*"
  ]
  // 不包含 extraResources，不打包模型
};

module.exports = isLite ? liteConfig : fullConfig;

/**
 * 路径解析工具模块
 * 统一处理开发环境和生产环境的路径差异
 */
import * as path from "path";
import { app } from "electron";

/**
 * 判断是否为开发环境
 * 使用 Electron 的 app.isPackaged 属性，这是最可靠的判断方式
 */
export function isDevelopment(): boolean {
  return !app.isPackaged;
}

/**
 * 获取模型目录路径
 * 开发环境：项目根目录/electron/models
 * 生产环境：应用资源目录/models
 */
export function getModelsDirectory(): string {
  if (isDevelopment()) {
    return path.join(process.cwd(), "electron", "models");
  }
  return path.join(process.resourcesPath, "models");
}

/**
 * 获取特定模型文件的完整路径
 * @param modelName 模型文件名（如 "clip-visual-fp16.onnx"）
 */
export function getModelPath(modelName: string): string {
  return path.join(getModelsDirectory(), modelName);
}

/**
 * 获取用户数据目录
 * 用于存储缓存、配置等用户相关数据
 */
export function getUserDataDirectory(): string {
  return app.getPath("userData");
}

/**
 * 获取日志目录
 */
export function getLogsDirectory(): string {
  return path.join(getUserDataDirectory(), "logs");
}

/**
 * 获取缓存目录
 */
export function getCacheDirectory(): string {
  return path.join(getUserDataDirectory(), "cache");
}


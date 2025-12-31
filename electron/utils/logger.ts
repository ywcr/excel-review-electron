/**
 * 统一日志工具
 * 提供可配置的日志级别和格式化输出
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 全局日志级别配置 */
let globalLogLevel: LogLevel = "info";

/**
 * 设置全局日志级别
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

/**
 * 获取当前全局日志级别
 */
export function getGlobalLogLevel(): LogLevel {
  return globalLogLevel;
}

/**
 * 日志类 - 支持带标签的日志输出
 */
export class Logger {
  private tag: string;
  private level: LogLevel | null = null; // null 表示使用全局级别

  constructor(tag: string) {
    this.tag = tag;
  }

  /**
   * 设置此 logger 实例的日志级别
   * 如果不设置，将使用全局级别
   */
  setLevel(level: LogLevel | null): void {
    this.level = level;
  }

  private getEffectiveLevel(): LogLevel {
    return this.level ?? globalLogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.getEffectiveLevel()];
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23);
    return `[${timestamp}] ${this.tag} ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog("debug")) {
      if (data !== undefined) {
        console.log(`🔍 ${this.formatMessage(message)}`, data);
      } else {
        console.log(`🔍 ${this.formatMessage(message)}`);
      }
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog("info")) {
      if (data !== undefined) {
        console.log(`ℹ️ ${this.formatMessage(message)}`, data);
      } else {
        console.log(`ℹ️ ${this.formatMessage(message)}`);
      }
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog("warn")) {
      if (data !== undefined) {
        console.warn(`⚠️ ${this.formatMessage(message)}`, data);
      } else {
        console.warn(`⚠️ ${this.formatMessage(message)}`);
      }
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog("error")) {
      if (data !== undefined) {
        console.error(`❌ ${this.formatMessage(message)}`, data);
      } else {
        console.error(`❌ ${this.formatMessage(message)}`);
      }
    }
  }

  /**
   * 输出成功信息（始终显示，不受级别限制）
   */
  success(message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`✅ ${this.formatMessage(message)}`, data);
    } else {
      console.log(`✅ ${this.formatMessage(message)}`);
    }
  }

  /**
   * 输出进度信息
   */
  progress(current: number, total: number, message?: string): void {
    if (this.shouldLog("info")) {
      const percent = Math.round((current / total) * 100);
      const msg = message ? ` - ${message}` : "";
      console.log(`📊 ${this.formatMessage(`[${current}/${total}] ${percent}%${msg}`)}`);
    }
  }
}

// ==================== 预定义的 Logger 实例 ====================

/** CLIP 模型相关日志 */
export const clipLogger = new Logger("[CLIP]");

/** YOLO 模型相关日志 */
export const yoloLogger = new Logger("[YOLO]");

/** 图片验证相关日志 */
export const validationLogger = new Logger("[验证]");

/** 图片处理相关日志 */
export const imageLogger = new Logger("[图片]");

/** Excel 处理相关日志 */
export const excelLogger = new Logger("[Excel]");

/** 重复检测相关日志 */
export const duplicateLogger = new Logger("[重复检测]");

/** 季节检测相关日志 */
export const seasonLogger = new Logger("[季节]");


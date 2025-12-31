/**
 * 季节一致性验证器
 * 判断图片内容是否符合当前季节（中国北方）
 */
import {
  Season,
  ClipDetectionResult,
  SEASON_MONTHS,
  SEASON_NAMES,
  SeasonValidationResult,
} from "../../shared/types/detection";

// 导出类型供外部使用
export type { SeasonValidationResult } from "../../shared/types/detection";

export class SeasonValidator {
  /**
   * 根据月份获取当前季节（中国北方）
   */
  static getCurrentSeason(date: Date = new Date()): Season {
    const month = date.getMonth() + 1; // JavaScript 月份从 0 开始

    for (const [season, months] of Object.entries(SEASON_MONTHS)) {
      if (months.includes(month)) {
        return season as Season;
      }
    }

    return "unknown";
  }

  /**
   * 验证季节一致性
   */
  static validate(
    detectionResult: ClipDetectionResult,
    referenceDate?: Date
  ): SeasonValidationResult {
    const currentSeason = this.getCurrentSeason(referenceDate);
    const { detectedSeason, seasonConfidence, clothingSeason, scenerySeason, hasPerson, hasPlant } =
      detectionResult;

    // 如果没有人物也没有植物，无法判断季节，认为符合
    if (!hasPerson && !hasPlant) {
      return {
        matchesCurrent: true,
        currentSeason,
        detectedSeason: "unknown",
        mismatchReason: "图片中无人物或植物，跳过季节检测",
        confidence: 0,
      };
    }

    // 如果没有检测到季节信息，认为符合
    if (detectedSeason === "unknown") {
      return {
        matchesCurrent: true,
        currentSeason,
        detectedSeason,
        confidence: 0,
      };
    }

    const matchesCurrent = detectedSeason === currentSeason;

    let mismatchReason: string | undefined;
    if (!matchesCurrent) {
      const parts: string[] = [];

      if (clothingSeason && clothingSeason !== currentSeason) {
        parts.push(`人物穿着为${SEASON_NAMES[clothingSeason]}服饰`);
      }

      if (scenerySeason && scenerySeason !== currentSeason) {
        parts.push(`场景为${SEASON_NAMES[scenerySeason]}景色`);
      }

      if (parts.length > 0) {
        mismatchReason = `${parts.join("、")}，与当前${SEASON_NAMES[currentSeason]}不符`;
      } else {
        mismatchReason = `图片显示${SEASON_NAMES[detectedSeason]}，当前为${SEASON_NAMES[currentSeason]}`;
      }
    }

    return {
      matchesCurrent,
      currentSeason,
      detectedSeason,
      mismatchReason,
      confidence: seasonConfidence,
    };
  }

  /**
   * 判断是否需要进行季节检测（预筛选）
   * 某些图片类型可以跳过季节检测
   */
  static shouldCheckSeason(metadata: {
    width: number;
    height: number;
    format: string;
  }): boolean {
    // 太小的图片跳过（可能是图标、logo）
    if (metadata.width < 200 || metadata.height < 200) {
      return false;
    }

    // 极端比例的图片跳过（可能是 banner、按钮）
    const aspect = Math.max(metadata.width, metadata.height) /
      Math.min(metadata.width, metadata.height);
    if (aspect > 4) {
      return false;
    }

    return true;
  }
}

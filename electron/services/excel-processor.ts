import ExcelJS from "exceljs";
import pLimit from "p-limit";
import type {
  ValidationResult,
  TaskTemplate,
  ImageValidationError,
} from "../../shared/types";
import { TASK_TEMPLATES } from "../../shared/validation-rules";
import { RowValidator } from "../validators/row-validator";
import { ImageValidator } from "../validators/image-validator";
import { WpsImageExtractor } from "./wps-image-extractor";
import { XlsxParser } from "./xlsx-parser";
import { ImageValidationService } from "./image-validation-service";

export class ExcelStreamProcessor {
  private isCancelled = false;
  private xlsxParser: XlsxParser;
  private imageValidationService: ImageValidationService;

  constructor() {
    this.xlsxParser = new XlsxParser();
    this.imageValidationService = new ImageValidationService();
  }

  async validateFile(
    filePath: string,
    taskName: string,
    sheetName?: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ValidationResult> {
    this.isCancelled = false;

    console.log("🚀 [验证开始]", { filePath, taskName, sheetName });
    onProgress?.(0, "[1/6] 正在打开文件...");

    const template = TASK_TEMPLATES[taskName];
    if (!template) {
      console.error("❌ [模板错误] 未找到任务模板:", taskName);
      throw new Error(`未找到任务模板: ${taskName}`);
    }
    console.log("✅ [模板加载]", {
      name: template.name,
      requiredFields: template.requiredFields.length,
      rules: template.validationRules.length,
    });

    // 创建验证器
    const validator = new RowValidator(template.fieldMappings);

    // 创建流式读取器
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      sharedStrings: "cache",
      hyperlinks: "cache",
      worksheets: "emit",
    });

    onProgress?.(10, "[2/6] 正在解析 Excel 结构...");

    const errors: any[] = [];
    let totalRows = 0;
    let targetWorksheet: any = null;
    const availableSheets: Array<{ name: string; hasData: boolean }> = [];

    // 遍历工作表
    console.log("📂 [工作表扫描] 开始遍历工作表...");
    for await (const worksheetReader of workbookReader) {
      const currentSheetName = (worksheetReader as any).name;
      console.log(`📄 [工作表] 发现: "${currentSheetName}"`);

      // 收集所有工作表信息
      let sheetHasData = false;
      let rowCount = 0;

      // 如果指定了工作表名，只处理该工作表
      if (sheetName && currentSheetName !== sheetName) {
        console.log(`⏭️  [跳过] 不是目标工作表，跳过 "${currentSheetName}"`);
        // 重要：需要消费整个工作表才能继续
        for await (const row of worksheetReader) {
          // 空循环，消费数据
        }
        // 仍然需要检查是否有数据
        for await (const row of worksheetReader) {
          rowCount++;
          if (rowCount > 1) {
            sheetHasData = true;
            break;
          }
        }
        availableSheets.push({ name: currentSheetName, hasData: sheetHasData });
        continue;
      }

      // 如果没指定工作表名，尝试匹配模板
      const matchesTemplate =
        !sheetName && this.xlsxParser.matchesTemplate(currentSheetName, template);
      
      console.log(`🔍 [工作表匹配] "${currentSheetName}":`, {
        sheetNameProvided: !!sheetName,
        matchesTemplate,
        templateSheetNames: template.sheetNames,
      });

      if (!sheetName && !matchesTemplate) {
        console.log(`⚠️  [跳过] 工作表 "${currentSheetName}" 不匹配模板`);
        // 不匹配，但收集信息
        for await (const row of worksheetReader) {
          rowCount++;
          if (rowCount > 1) {
            sheetHasData = true;
            break;
          }
        }
        availableSheets.push({ name: currentSheetName, hasData: sheetHasData });
        continue;
      }
      
      console.log(`✅ [工作表选中] 开始处理: "${currentSheetName}"`);

      onProgress?.(20, `[2/6] 正在处理工作表: ${currentSheetName}`);

      // 遍历行查找表头
      let foundHeader = false;
      let headerRow: any[] = [];
      let headerMapping: Record<number, string> = {}; // This variable is declared but not used in the provided snippet. Keeping it as per instruction.
      let headerRowIndex = 0;
      let rowIndex = 0;

      console.log(`🔎 [开始扫描] 工作表 "${currentSheetName}" 查找表头...`);
      for await (const row of worksheetReader) {
        if (this.isCancelled) {
          throw new Error("验证已取消");
        }

        rowIndex++;
        // The original rowCount was for sheetHasData, which is now handled above.
        // This rowCount here seems to be for the current sheet's data rows.
        // Keeping it as per the user's instruction, but it might conflict with the earlier rowCount.
        // Assuming this rowCount is local to the current sheet processing.
        // However, the original code used `totalRows` for actual data rows.
        // I will remove `rowCount++` here to avoid confusion and stick to `totalRows` for data rows.

        if (rowIndex <= 5) {
          console.log(`  行 ${rowIndex}: 正在检查是否为表头...`);
        }

        // 前10行尝试找表头
        if (rowIndex <= 10 && !foundHeader) {
          // Changed `!headerRow` to `!foundHeader`
          const rowData = this.xlsxParser.extractRowData(row);
          // let totalHeaders = 0; // This variable was in the user's snippet but not used. Removing it.

          if (rowIndex <= 5) {
            console.log(`    行 ${rowIndex} 内容:`, rowData.slice(0, 10));
          }

          if (this.xlsxParser.isHeaderRow(rowData, template)) {
            headerRow = rowData;
            headerRowIndex = rowIndex;
            foundHeader = true; // Set foundHeader to true
            onProgress?.(30, "[3/6] 找到表头，开始验证数据...");
            console.log("📋 [表头识别]", {
              sheet: currentSheetName,
              headerRowIndex,
              headerRow,
            });
            continue; // Continue to the next row after finding header
          }
        }

        // 如果找到了表头，继续读取数据行
        if (foundHeader && rowIndex > headerRowIndex) {
          // Use foundHeader here
          const rowArray = this.xlsxParser.extractRowData(row);

          // 检查是否为空行：所有单元格都为空或null
          const isEmptyRow = rowArray.every(
            (cell) =>
              cell === null ||
              cell === undefined ||
              (typeof cell === "string" && cell.trim() === "")
          );

          if (isEmptyRow) {
            // 跳过空行，不计入数据行数，不验证
            continue;
          }

          // 转换为对象格式
          const rowData = this.xlsxParser.arrayToObject(rowArray, headerRow, template);

          // 验证单行
          const rowErrors = validator.validateRow(
            rowIndex,
            rowData,
            template.validationRules
          );
          errors.push(...rowErrors);

          // 添加到验证器缓存（用于跨行验证）
          validator.addRowData(rowIndex, rowData);

          totalRows++;

          // 更频繁地更新进度（每 20 行或前 100 行每 10 行更新一次）
          const updateInterval = totalRows <= 100 ? 10 : 20;
          if (totalRows % updateInterval === 0) {
            // 行验证占 30-70%，使用更平滑的进度计算
            // 假设平均文件有 500 行，动态适应
            const estimatedTotal = Math.max(totalRows * 1.2, 100); // 预估总行数
            const rowProgress = Math.min((totalRows / estimatedTotal) * 40, 40); // 最多 40%
            const progress = Math.min(30 + rowProgress, 70);
            onProgress?.(progress, `[3/6] 正在验证第 ${totalRows} 行...`);
            console.log(`📊 [数据处理] 已验证 ${totalRows} 行，当前错误数: ${errors.length}`);
          }
        }
      }

      console.log("📊 [数据处理完成]", {
        sheet: currentSheetName,
        totalRows,
        errorsFound: errors.length,
        headerRowIndex,
      });
      targetWorksheet = currentSheetName;
      availableSheets.push({ name: currentSheetName, hasData: totalRows > 0 });
      break; // 只处理第一个匹配的工作表
    }

    // 如果没有找到匹配的工作表，返回工作表选择信息
    if (!targetWorksheet) {
      console.log("⚠️ [未找到匹配工作表] 返回工作表选择界面", {
        availableSheets,
        taskName,
        templateSheetNames: template.sheetNames,
      });
      return {
        isValid: false,
        needSheetSelection: true,
        availableSheets,
        errors: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorCount: 0,
        },
      };
    }

    console.log("🔄 [跨行验证开始]", {
      totalRows,
      currentErrors: errors.length,
      crossRowRules: template.validationRules.filter((r) =>
        ["unique", "dateInterval", "frequency", "sameImplementer"].includes(
          r.type
        )
      ).length,
    });
    onProgress?.(70, "[3/6] 正在执行跨行验证...");

    // 执行跨行验证
    const crossRowErrors = validator.validateCrossRows(
      template.validationRules
    );
    console.log("✅ [跨行验证完成]", { crossRowErrors: crossRowErrors.length });
    errors.push(...crossRowErrors);

    // 图片验证
    const imageErrors: ImageValidationError[] = [];
    let imageStats = {
      totalImages: 0,
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
      watermarkedImages: 0,
      seasonMismatchImages: 0,
      borderImages: 0,
    };
    let imageValidationSkipped = false;
    let imageValidationSkipReason = "";

    // 获取文件大小用于日志
    const fs = await import("fs");
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    const fileSizeGB = fileSizeMB / 1024;
    
    console.log("🖼️ [图片验证开始]", {
      filePath,
      targetWorksheet,
      fileSizeMB: fileSizeMB.toFixed(2),
      fileSizeGB: fileSizeGB.toFixed(2),
      timestamp: new Date().toISOString(),
    });

    // 使用 yauzl 流式读取，支持超大文件
    onProgress?.(75, fileSizeGB > 1 ? `[4/6] 正在验证图片 (${fileSizeGB.toFixed(1)}GB 大文件)...` : "[4/6] 正在验证图片...");

    const imageValidationStartTime = Date.now();
    try {
      console.log("🖼️ [图片验证] 开始调用 validateImages...");
      const imageResults = await this.validateImages(
        filePath,
        targetWorksheet,
        onProgress
      );
      
      const imageValidationDuration = Date.now() - imageValidationStartTime;
      console.log("✅ [图片验证完成]", {
        ...imageResults.stats,
        errorsFound: imageResults.errors.length,
        durationMs: imageValidationDuration,
        isNotWpsFormat: imageResults.isNotWpsFormat,
      });
      
      // 检查是否为非 WPS 格式
      if (imageResults.isNotWpsFormat) {
        imageValidationSkipped = true;
        imageValidationSkipReason = "检测到非 WPS 格式文件，图片验证已跳过。请使用 WPS 打开该文件并另存为 xlsx 格式后重新审核。";
      } else {
        imageErrors.push(...imageResults.errors);
        imageStats = imageResults.stats;
      }
    } catch (error) {
      const imageValidationDuration = Date.now() - imageValidationStartTime;
      console.error("❌ [图片验证失败]:", {
        error,
        durationMs: imageValidationDuration,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // 图片验证失败不阻止整体验证
    }

    onProgress?.(95, "[6/6] 正在生成验证报告...");

    // 按行号排序错误
    errors.sort((a, b) => a.row - b.row);

    console.log("📝 [验证汇总]", {
      totalRows,
      dataErrors: errors.length,
      imageErrors: imageErrors.length,
      imageValidationSkipped,
      imageValidationSkipReason: imageValidationSkipReason || undefined,
      affectedRows: new Set(errors.map((e) => e.row)).size,
      isValid: errors.length === 0 && imageErrors.length === 0,
    });

    onProgress?.(100, "✅ 验证完成");

    return {
      isValid: errors.length === 0 && imageErrors.length === 0,
      errors,
      imageErrors,
      summary: {
        totalRows,
        validRows: totalRows - new Set(errors.map((e) => e.row)).size,
        errorCount: errors.length,
        imageStats,
        imageValidationSkipped,
        imageValidationSkipReason: imageValidationSkipReason || undefined,
      },
      usedSheetName: targetWorksheet,
    };
  }

  /**
   * 验证工作表中的所有图片
   */
  /**
   * 验证工作表中的所有图片
   */
  private async validateImages(
    filePath: string,
    sheetName: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    errors: ImageValidationError[];
    stats: {
      totalImages: number;
      blurryImages: number;
      duplicateImages: number;
      suspiciousImages: number;
      watermarkedImages: number;
      seasonMismatchImages: number;
      borderImages: number;
    };
    isNotWpsFormat?: boolean;
  }> {
    const errors: ImageValidationError[] = [];
    const stats = {
      totalImages: 0,
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
      watermarkedImages: 0,
      seasonMismatchImages: 0,
      borderImages: 0,
    };

    try {
      // 1. 尝试 WPS DISPIMG 格式图片提取
      console.log("📷 [图片验证] 尝试 WPS DISPIMG 格式提取...", {
        filePath,
        sheetName,
        timestamp: new Date().toISOString(),
      });
      const wpsExtractor = new WpsImageExtractor();
      const wpsImages = await wpsExtractor.extractImages(filePath, sheetName);

      let imagesToProc: Array<{
        buffer: Buffer;
        positionDesc: string;
        row: number;
        column: string;
        index: number;
      }> = [];

      if (wpsImages.length > 0) {
        console.log(
          `📷 [图片验证] WPS 格式提取成功，发现 ${wpsImages.length} 张图片`
        );
        stats.totalImages = wpsImages.length;
        imagesToProc = wpsImages.map((img, i) => ({
          buffer: img.buffer,
          positionDesc: img.position,
          row: img.row,
          column: img.column,
          index: i,
        }));
      } else {
        // 非 WPS 格式，跳过图片验证并提示用户
        console.log("📷 [图片验证] 非 WPS 格式，跳过图片验证", {
          filePath,
          sheetName,
        });
        return {
          errors: [],
          stats: {
            totalImages: 0,
            blurryImages: 0,
            duplicateImages: 0,
            suspiciousImages: 0,
            watermarkedImages: 0,
            seasonMismatchImages: 0,
            borderImages: 0,
          },
          isNotWpsFormat: true,
        };
      }

      if (imagesToProc.length === 0) {
        return { errors, stats };
      }

      // 3. 调用服务执行验证
      const serviceInput = imagesToProc.map((img) => ({
        buffer: img.buffer,
        range: null,
        positionDesc: img.positionDesc,
      }));

      const { results, stats: serviceStats } =
        await this.imageValidationService.validateImages(
          serviceInput,
          onProgress
        );

      // 合并统计数据
      stats.blurryImages = serviceStats.blurryImages;
      stats.duplicateImages = serviceStats.duplicateImages;
      stats.suspiciousImages = serviceStats.suspiciousImages;
      stats.watermarkedImages = serviceStats.watermarkedImages;
      stats.seasonMismatchImages = serviceStats.seasonMismatchImages;
      stats.borderImages = serviceStats.borderImages;

      // 4. 处理结果
      for (const { index, result, thumbnail } of results) {
        const imageInfo = imagesToProc[index];

        if (result.isBlurry) {
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "blur",
            message: `图片模糊 (清晰度: ${result.blurScore.toFixed(0)})`,
            details: {
              blurScore: result.blurScore,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }

        if (result.isDuplicate) {
          const duplicateOfDesc =
            result.duplicateOfPosition || `图片 #${result.duplicateOf}`;
          
          // 获取原图的缩略图数据（用于左右对比）
          let duplicateOfImageData: string | undefined;
          if (result.duplicateOf !== undefined) {
            const originalResult = results.find(r => r.index === result.duplicateOf);
            if (originalResult?.thumbnail?.data) {
              // 原图已有缩略图
              duplicateOfImageData = originalResult.thumbnail.data;
            } else {
              // 原图没有缩略图（可能因为原图本身没有问题），需要现场生成
              try {
                const originalImageInfo = imagesToProc[result.duplicateOf];
                if (originalImageInfo?.buffer) {
                  const originalThumbnail = await this.imageValidationService.imageValidator.imageProcessor.createThumbnail(
                    originalImageInfo.buffer
                  );
                  if (originalThumbnail) {
                    duplicateOfImageData = originalThumbnail.data;
                  }
                }
              } catch (err) {
                console.warn(`[重复图片对比] 生成原图缩略图失败:`, err);
              }
            }
          }
          
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "duplicate",
            message: `重复图片 (与 ${duplicateOfDesc} 重复)`,
            details: {
              duplicateOf: result.duplicateOf,
              duplicateOfPosition: result.duplicateOfPosition,
              duplicateOfImageData,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }

        if (result.suspicionScore >= 40) {
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "suspicious",
            message: `可疑图片 (${result.suspicionLabel}, 评分: ${result.suspicionScore})`,
            details: {
              suspicionScore: result.suspicionScore,
              suspicionLevel: result.suspicionLevel,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }

        // 水印检测
        if (result.hasWatermark) {
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "watermark",
            message: `检测到水印 (置信度: ${result.watermarkConfidence.toFixed(0)}%)`,
            details: {
              watermarkConfidence: result.watermarkConfidence,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }

        // 季节不符检测
        if (!result.seasonMatchesCurrent && result.detectedSeason !== "unknown") {
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "seasonMismatch",
            message: result.seasonMismatchReason || `图片季节不符 (检测为${result.detectedSeason})`,
            details: {
              detectedSeason: result.detectedSeason,
              seasonMismatchReason: result.seasonMismatchReason,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }

        // 边框检测
        if (result.hasBorder && result.borderSides.length > 0) {
          const sideNames: Record<string, string> = { top: "上", bottom: "下", left: "左", right: "右" };
          const borderDesc = result.borderSides.map(side => {
            const width = result.borderWidth[side];
            return `${sideNames[side] || side}${width ? `(${width}px)` : ""}`;
          }).join("、");
          
          errors.push({
            row: imageInfo.row || 0,
            column: imageInfo.column || "",
            field: "图片",
            imageIndex: index,
            errorType: "border",
            message: `存在边框 (${borderDesc})`,
            details: {
              borderSides: result.borderSides,
              borderWidth: result.borderWidth,
            },
            imageData: thumbnail?.data,
            mimeType: thumbnail?.mimeType,
          });
        }
      }

      this.imageValidationService.reset();
    } catch (error) {
      console.error("Failed to validate images:", error);
    }

    return { errors, stats };
  }
}

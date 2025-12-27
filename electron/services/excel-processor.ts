import ExcelJS from "exceljs";
import type {
  ValidationResult,
  TaskTemplate,
  ImageValidationError,
} from "../../shared/types";
import { TASK_TEMPLATES } from "../../shared/validation-rules";
import { RowValidator } from "../validators/row-validator";
import { ImageValidator } from "../validators/image-validator";
import { WpsImageExtractor } from "./wps-image-extractor";

export class ExcelStreamProcessor {
  private isCancelled = false;

  async validateFile(
    filePath: string,
    taskName: string,
    sheetName?: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ValidationResult> {
    this.isCancelled = false;

    console.log("🚀 [验证开始]", { filePath, taskName, sheetName });
    onProgress?.(0, "正在打开文件...");

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

    onProgress?.(10, "正在解析 Excel 结构...");

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
        !sheetName && this.matchesTemplate(currentSheetName, template);

      if (!sheetName && !matchesTemplate) {
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

      onProgress?.(20, `正在处理工作表: ${currentSheetName}`);

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
          const rowData = this.extractRowData(row);
          // let totalHeaders = 0; // This variable was in the user's snippet but not used. Removing it.

          if (rowIndex <= 5) {
            console.log(`    行 ${rowIndex} 内容:`, rowData.slice(0, 10));
          }

          if (this.isHeaderRow(rowData, template)) {
            headerRow = rowData;
            headerRowIndex = rowIndex;
            foundHeader = true; // Set foundHeader to true
            onProgress?.(30, "找到表头，开始验证数据...");
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
          const rowArray = this.extractRowData(row);

          // 转换为对象格式
          const rowData = this.arrayToObject(rowArray, headerRow, template);

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

          // 定期更新进度（每 50 行更新一次）
          if (totalRows % 50 === 0) {
            // 行验证占 30-70%，使用更平滑的进度计算
            const progress = Math.min(30 + Math.sqrt(totalRows) * 2, 70);
            onProgress?.(progress, `已验证 ${totalRows} 行`);
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
    onProgress?.(70, "正在执行跨行验证...");

    // 执行跨行验证
    const crossRowErrors = validator.validateCrossRows(
      template.validationRules
    );
    console.log("✅ [跨行验证完成]", { crossRowErrors: crossRowErrors.length });
    errors.push(...crossRowErrors);

    console.log("🖼️ [图片验证开始]", {
      filePath,
      targetWorksheet,
      timestamp: new Date().toISOString(),
    });
    onProgress?.(75, "正在验证图片...");

    // 图片验证
    const imageErrors: ImageValidationError[] = [];
    let imageStats = {
      totalImages: 0,
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
    };

    const imageValidationStartTime = Date.now();
    try {
      console.log("🖼️ [图片验证] 创建 ImageValidator...");
      const imageValidator = new ImageValidator();
      
      console.log("🖼️ [图片验证] 开始调用 validateImages...");
      const imageResults = await this.validateImages(
        filePath,
        targetWorksheet,
        imageValidator,
        onProgress
      );
      
      const imageValidationDuration = Date.now() - imageValidationStartTime;
      console.log("✅ [图片验证完成]", {
        ...imageResults.stats,
        errorsFound: imageResults.errors.length,
        durationMs: imageValidationDuration,
      });
      
      imageErrors.push(...imageResults.errors);
      imageStats = imageResults.stats;
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

    onProgress?.(95, "正在生成验证报告...");

    // 按行号排序错误
    errors.sort((a, b) => a.row - b.row);

    console.log("📝 [验证汇总]", {
      totalRows,
      dataErrors: errors.length,
      imageErrors: imageErrors.length,
      affectedRows: new Set(errors.map((e) => e.row)).size,
      isValid: errors.length === 0 && imageErrors.length === 0,
    });

    onProgress?.(100, "验证完成");

    return {
      isValid: errors.length === 0 && imageErrors.length === 0,
      errors,
      imageErrors,
      summary: {
        totalRows,
        validRows: totalRows - new Set(errors.map((e) => e.row)).size,
        errorCount: errors.length,
        imageStats,
      },
      usedSheetName: targetWorksheet,
    };
  }

  /**
   * 验证工作表中的所有图片
   */
  private async validateImages(
    filePath: string,
    sheetName: string,
    imageValidator: ImageValidator,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    errors: ImageValidationError[];
    stats: {
      totalImages: number;
      blurryImages: number;
      duplicateImages: number;
      suspiciousImages: number;
    };
  }> {
    const errors: ImageValidationError[] = [];
    const stats = {
      totalImages: 0,
      blurryImages: 0,
      duplicateImages: 0,
      suspiciousImages: 0,
    };

    try {
      // 首先尝试 WPS DISPIMG 格式图片提取
      console.log("📷 [图片验证] 尝试 WPS DISPIMG 格式提取...", {
        filePath,
        sheetName,
        timestamp: new Date().toISOString(),
      });
      const wpsExtractStartTime = Date.now();
      const wpsExtractor = new WpsImageExtractor();
      const wpsImages = await wpsExtractor.extractImages(filePath, sheetName);
      const wpsExtractDuration = Date.now() - wpsExtractStartTime;
      console.log(`📷 [图片验证] WPS 提取完成`, {
        foundImages: wpsImages.length,
        durationMs: wpsExtractDuration,
      });

      if (wpsImages.length > 0) {
        console.log(
          `📷 [图片验证] WPS 格式提取成功，发现 ${wpsImages.length} 张图片`
        );
        stats.totalImages = wpsImages.length;
        onProgress?.(
          76,
          `发现 ${wpsImages.length} 张 WPS 格式图片，正在验证...`
        );

        // 验证 WPS 图片
        for (let i = 0; i < wpsImages.length; i++) {
          const img = wpsImages[i];

          // 添加位置日志，特别关注 PC 标记的重复位置
          const isTargetPosition = [
            "M8",
            "N11",
            "N8",
            "M10",
            "M4",
            "N4",
            "M5",
          ].includes(img.position);
          if (i < 10 || isTargetPosition) {
            console.log(
              `📷 [图片位置] #${i}: ${img.position} (行${img.row}, 列${
                img.column
              }) ${isTargetPosition ? "⭐ PC重复位置" : ""}`
            );
          }

          try {
            const result = await imageValidator.validateImage(img.buffer, i);

            // 为有问题的图片生成缩略图（用于预览）
            let thumbnail: { data: string; mimeType: string } | null = null;
            const hasError =
              result.isBlurry ||
              result.isDuplicate ||
              result.suspicionScore >= 40;
            if (hasError) {
              thumbnail = await imageValidator.imageProcessor.createThumbnail(
                img.buffer
              );
            }

            if (result.isBlurry) {
              stats.blurryImages++;
              errors.push({
                row: img.row,
                column: img.column,
                field: "图片",
                imageIndex: i,
                errorType: "blur",
                message: `图片模糊 (清晰度: ${result.blurScore.toFixed(0)})`,
                details: { blurScore: result.blurScore },
                imageData: thumbnail?.data,
                mimeType: thumbnail?.mimeType,
              });
            }

            if (result.isDuplicate) {
              stats.duplicateImages++;
              errors.push({
                row: img.row,
                column: img.column,
                field: "图片",
                imageIndex: i,
                errorType: "duplicate",
                message: `重复图片 (与图片 #${result.duplicateOf} 重复)`,
                details: { duplicateOf: result.duplicateOf },
                imageData: thumbnail?.data,
                mimeType: thumbnail?.mimeType,
              });
            }

            if (result.suspicionScore >= 40) {
              stats.suspiciousImages++;
              errors.push({
                row: img.row,
                column: img.column,
                field: "图片",
                imageIndex: i,
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

            // 更新进度（每 3 张或最后一张时更新，图片验证占 76-95%）
            if ((i + 1) % 3 === 0 || i === wpsImages.length - 1) {
              const imgProgress = 76 + Math.floor(((i + 1) / wpsImages.length) * 19);
              onProgress?.(
                imgProgress,
                `已验证 ${i + 1}/${wpsImages.length} 张图片`
              );
            }
          } catch (err) {
            console.error(`验证第 ${i} 张 WPS 图片失败:`, err);
          }
        }

        // 输出 PC 检测到的重复位置信息
        console.log("\n📋 [位置汇总] PC 检测到的重复位置:");
        const targetPositions = ["M8", "N11", "N8", "M10"];
        for (const pos of targetPositions) {
          const img = wpsImages.find((img) => img.position === pos);
          if (img) {
            const idx = wpsImages.indexOf(img);
            console.log(`  ${pos} -> 索引 #${idx}`);
          } else {
            console.log(`  ${pos} -> 未找到!`);
          }
        }
        console.log("📋 PC 检测的重复关系: M8↔N11, N8↔M10\n");

        return { errors, stats };
      }

      console.log("📷 [图片验证] 非 WPS 格式，尝试标准 ExcelJS 提取...", {
        filePath,
        sheetName,
        timestamp: new Date().toISOString(),
      });

      // 回退到 ExcelJS 方式
      const excelJsStartTime = Date.now();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const excelJsLoadDuration = Date.now() - excelJsStartTime;
      console.log("📷 [图片验证] ExcelJS 文件加载完成", {
        durationMs: excelJsLoadDuration,
      });

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        console.log("📷 [图片验证] 未找到目标工作表", { sheetName });
        return { errors, stats };
      }

      // 获取工作表中的图片
      const images = worksheet.getImages();
      stats.totalImages = images.length;
      console.log("📷 [图片验证] ExcelJS 图片提取完成", {
        totalImages: images.length,
        sheetName,
      });

      if (images.length === 0) {
        console.log("📷 [图片验证] 工作表中没有图片");
        return { errors, stats };
      }

      onProgress?.(76, `发现 ${images.length} 张图片，正在验证...`);

      // 验证每张图片
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageId = (image as any).imageId;

        // 从 workbook.model.media 获取图片数据
        const media = (workbook.model as any).media?.find(
          (m: any) => m.index === imageId
        );

        if (!media || !media.buffer) {
          continue;
        }

        try {
          const result = await imageValidator.validateImage(media.buffer, i);

          // 记录统计
          if (result.isBlurry) {
            stats.blurryImages++;
            errors.push({
              row: (image as any).range?.tl?.nativeRow || 0,
              column: (image as any).range?.tl?.nativeCol || 0,
              field: "图片",
              imageIndex: i,
              errorType: "blur",
              message: `图片模糊 (清晰度: ${result.blurScore.toFixed(0)})`,
              details: {
                blurScore: result.blurScore,
              },
            });
          }

          if (result.isDuplicate) {
            stats.duplicateImages++;
            errors.push({
              row: (image as any).range?.tl?.nativeRow || 0,
              column: (image as any).range?.tl?.nativeCol || 0,
              field: "图片",
              imageIndex: i,
              errorType: "duplicate",
              message: `重复图片 (与图片 #${result.duplicateOf} 重复)`,
              details: {
                duplicateOf: result.duplicateOf,
              },
            });
          }

          if (result.suspicionScore >= 40) {
            // 可疑度阈值
            stats.suspiciousImages++;
            errors.push({
              row: (image as any).range?.tl?.nativeRow || 0,
              column: (image as any).range?.tl?.nativeCol || 0,
              field: "图片",
              imageIndex: i,
              errorType: "suspicious",
              message: `可疑图片 (${result.suspicionLabel}, 评分: ${result.suspicionScore})`,
              details: {
                suspicionScore: result.suspicionScore,
                suspicionLevel: result.suspicionLevel,
              },
            });
          }

          // 更新进度
          if ((i + 1) % 5 === 0 || i === images.length - 1) {
            // 图片验证占 76-95%
            const imgProgress = 76 + Math.floor(((i + 1) / images.length) * 19);
            onProgress?.(
              imgProgress,
              `已验证 ${i + 1}/${images.length} 张图片`
            );
          }
        } catch (err) {
          console.error(`Image ${i} validation failed:`, err);
        }
      }

      imageValidator.reset();
    } catch (error) {
      console.error("Failed to validate images:", error);
    }

    return { errors, stats };
  }

  private extractRowData(row: any): any[] {
    const data: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      let value = cell.value;

      // 处理富文本格式
      if (value && typeof value === "object" && value.richText) {
        // richText 是一个数组，包含多个文本片段
        value = value.richText.map((rt: any) => rt.text || "").join("");
        console.log(`  📝 [富文本转换] 列${colNumber}: "${value}"`);
      }

      data[colNumber - 1] = value;
    });
    return data;
  }

  /**
   * 将数组转换为对象（使用字段映射）
   */
  private arrayToObject(
    rowArray: any[],
    headerRow: any[],
    template: TaskTemplate
  ): Record<string, any> {
    const rowData: Record<string, any> = {};

    // 遍历表头，找到对应的字段映射
    headerRow.forEach((header, index) => {
      if (!header) return;

      // 清理表头：移除换行符和多余空格
      const headerStr = header
        .toString()
        .replace(/\n/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const mappedField = template.fieldMappings[headerStr];

      if (mappedField) {
        rowData[mappedField] = rowArray[index];
      }
    });

    return rowData;
  }

  private matchesTemplate(sheetName: string, template: TaskTemplate): boolean {
    return template.sheetNames.some(
      (name) => sheetName.includes(name) || name.includes(sheetName)
    );
  }

  /**
   * 将列字母转换为列索引（0-based）
   */
  private columnLetterToIndex(column: string): number {
    let index = 0;
    for (let i = 0; i < column.length; i++) {
      index = index * 26 + column.charCodeAt(i) - 64;
    }
    return index - 1; // 转换为 0-based
  }

  private isHeaderRow(row: any[], template: TaskTemplate): boolean {
    let matchCount = 0;
    const requiredCount = Math.min(3, template.requiredFields.length);

    console.log("🔍 [表头检查] 开始检查行是否为表头...");

    for (const cell of row) {
      if (!cell) continue;

      // 清理单元格值：移除换行符、多余空格
      const cellStr = String(cell)
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();

      if (!cellStr) continue;

      // 检查是否匹配必需字段
      for (const required of template.requiredFields) {
        const cleanRequired = String(required)
          .replace(/\n/g, "")
          .replace(/\s+/g, "")
          .trim()
          .toLowerCase();

        if (
          cellStr === cleanRequired ||
          cellStr.includes(cleanRequired) ||
          cleanRequired.includes(cellStr)
        ) {
          matchCount++;
          console.log(`  ✅ 匹配字段: "${cell}" -> "${required}"`);
          break;
        }
      }
    }

    const isHeader = matchCount >= requiredCount;
    console.log(
      `📋 [表头判断] 匹配 ${matchCount}/${requiredCount} 个必需字段 -> ${
        isHeader ? "✅ 是表头" : "❌ 不是表头"
      }`
    );
    return isHeader;
  }
}

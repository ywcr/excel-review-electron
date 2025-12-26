import type { ValidationRule } from "../../shared/types";

/**
 * 验证器类 - 实现所有验证规则
 */
export class RowValidator {
  // 存储所有行数据用于跨行验证
  private allRowsData: Map<number, Record<string, any>> = new Map();
  private _fieldMappings: Record<string, string>;

  constructor(fieldMappings: Record<string, string>) {
    this._fieldMappings = fieldMappings;
  }

  /**
   * 添加一行数据到缓存（用于跨行验证）
   */
  addRowData(rowNumber: number, rowData: Record<string, any>) {
    this.allRowsData.set(rowNumber, rowData);
  }

  /**
   * 验证单行数据
   */
  validateRow(
    rowNumber: number,
    rowData: Record<string, any>,
    rules: ValidationRule[]
  ): any[] {
    const errors: any[] = [];
    const singleRowRules = rules.filter(
      (r) =>
        !["unique", "dateInterval", "frequency", "sameImplementer"].includes(
          r.type
        )
    );

    if (rowNumber === 2) {
      console.log(
        `🔍 [规则检查] 第一行数据验证，规则数: ${singleRowRules.length}`
      );
    }

    for (const rule of rules) {
      const fieldValue = rowData[rule.field];

      switch (rule.type) {
        case "required":
          if (this.isEmpty(fieldValue)) {
            console.log(`❌ [必填项] 行${rowNumber} 字段"${rule.field}"为空`);
            errors.push(this.createError(rowNumber, rule, fieldValue));
          }
          break;

        case "dateFormat":
          if (fieldValue && !this.validateDateFormat(fieldValue, rule.params)) {
            errors.push(this.createError(rowNumber, rule, fieldValue));
          }
          break;

        case "duration":
          if (fieldValue && !this.validateDuration(fieldValue, rule.params)) {
            errors.push(this.createError(rowNumber, rule, fieldValue));
          }
          break;

        case "timeRange":
          if (
            rowData.visitStartTime &&
            !this.validateTimeRange(rowData.visitStartTime, rule.params)
          ) {
            errors.push(
              this.createError(rowNumber, rule, rowData.visitStartTime)
            );
          }
          break;

        case "prohibitedContent":
          if (fieldValue && typeof fieldValue === "string") {
            const content = fieldValue.trim();
            if (content && rule.params?.prohibitedTerms) {
              for (const term of rule.params.prohibitedTerms) {
                if (content.includes(term)) {
                  console.log(
                    `❌ [禁用词] 行${rowNumber} 字段"${rule.field}"包含禁用词: ${term}`
                  );
                  errors.push({
                    row: rowNumber,
                    column: rule.field,
                    field: rule.field,
                    value: fieldValue,
                    message: `${rule.message}：发现禁用词汇"${term}"`,
                    errorType: rule.type,
                  });
                  break; // 只报告第一个发现的禁用词
                }
              }
            }
          }
          break;

        case "medicalLevel":
          if (
            fieldValue &&
            !this.validateMedicalLevel(fieldValue, rule.params)
          ) {
            errors.push(this.createError(rowNumber, rule, fieldValue));
          }
          break;

        case "minValue":
          if (fieldValue && !this.validateMinValue(fieldValue, rule.params)) {
            errors.push(this.createError(rowNumber, rule, fieldValue));
          }
          break;
      }
    }

    return errors;
  }

  /**
   * 执行跨行验证（在所有行读取完成后）
   */
  validateCrossRows(rules: ValidationRule[]): any[] {
    const errors: any[] = [];
    console.log(`🔄 [跨行验证] 总数据行数: ${this.allRowsData.size}`);

    for (const rule of rules) {
      const beforeCount = errors.length;
      switch (rule.type) {
        case "unique":
          errors.push(...this.validateUnique(rule));
          break;

        case "dateInterval":
          errors.push(...this.validateDateInterval(rule));
          break;

        case "frequency":
          errors.push(...this.validateFrequency(rule));
          break;

        case "sameImplementer":
          errors.push(...this.validateSameImplementer(rule));
          break;
      }
      const newErrors = errors.length - beforeCount;
      if (newErrors > 0) {
        console.log(`❌ [${rule.type}] 检测到 ${newErrors} 个错误`);
      }
    }

    return errors;
  }

  // ========== 单行验证方法 ==========

  private isEmpty(value: any): boolean {
    return (
      value === null || value === undefined || value.toString().trim() === ""
    );
  }

  /**
   * 日期格式验证 - 与 PC 版本一致
   * 支持 Excel 日期数字和字符串格式
   */
  private validateDateFormat(value: any, params: any): boolean {
    if (!value) return false;

    // Excel日期可能是数字或字符串
    if (typeof value === "number") {
      return value > 0; // Excel日期是正数
    }

    // 检查是否包含时间成分
    if (!params?.allowTimeComponent) {
      const dateStr = value.toString();
      if (dateStr.includes(":") || dateStr.includes("T")) {
        return false;
      }
    }

    // 使用简化的日期解析来验证
    const parsedDate = this.parseSimpleDate(value);
    return parsedDate !== null;
  }

  /**
   * 持续时间验证 - 与 PC 版本一致
   * 使用 parseDuration 支持多种格式
   */
  private validateDuration(
    value: any,
    params: { minMinutes: number }
  ): boolean {
    if (!params || !params.minMinutes) return true;

    const duration = this.parseDuration(value);
    if (duration === null) return false;

    return duration >= params.minMinutes;
  }

  /**
   * 时间范围验证 - 与 PC 版本一致
   * 使用 extractDate 并用 <= 比较
   */
  private validateTimeRange(
    value: any,
    params: { startHour: number; endHour: number }
  ): boolean {
    if (!params || !params.startHour || !params.endHour) return true;

    const date = this.extractDate(value);
    if (!date) return false;

    const hour = date.getHours();
    return hour >= params.startHour && hour <= params.endHour;
  }

  /**
   * 最小值验证 - 与 PC Worker 版本一致
   */
  private validateMinValue(value: any, params: { minValue: number }): boolean {
    if (!value) return true;

    const numValue = Number(value);
    if (isNaN(numValue)) return false;

    return numValue >= params.minValue;
  }

  private validateMedicalLevel(
    value: any,
    params: { allowedLevels: string[] }
  ): boolean {
    const level = value.toString();
    return params.allowedLevels.some((allowed) => level.includes(allowed));
  }

  // ========== 辅助方法 ==========

  /**
   * 解析持续时间 - 与 PC 版本一致
   * 支持: "60", "60分钟", "60 分钟", "1.5小时", "90min", "1h30m" 等
   */
  private parseDuration(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;

    const str = String(value).trim();
    if (!str) return null;

    // 尝试直接转换为数字（纯数字格式）
    const directNumber = Number(str);
    if (!isNaN(directNumber) && directNumber >= 0) {
      return directNumber;
    }

    // 匹配带中文单位的格式
    const chineseMinuteMatch = str.match(
      /^([0-9]+\.?[0-9]*)\s*(?:分钟?|min|mins|minutes?)$/i
    );
    if (chineseMinuteMatch) {
      const minutes = parseFloat(chineseMinuteMatch[1]);
      return !isNaN(minutes) && minutes >= 0 ? minutes : null;
    }

    const chineseHourMatch = str.match(
      /^([0-9]+\.?[0-9]*)\s*(?:小时|时|hour|hours?|h)$/i
    );
    if (chineseHourMatch) {
      const hours = parseFloat(chineseHourMatch[1]);
      return !isNaN(hours) && hours >= 0 ? hours * 60 : null;
    }

    // 匹配复合格式: "1小时30分钟", "1h30m", "1时30分" 等
    const compositeMatch = str.match(
      /^([0-9]+)\s*(?:小时|时|h)\s*([0-9]+)\s*(?:分钟?|m)$/i
    );
    if (compositeMatch) {
      const hours = parseInt(compositeMatch[1], 10);
      const minutes = parseInt(compositeMatch[2], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }

    return null;
  }

  /**
   * 提取日期 - 与 PC 版本一致
   * 支持 Excel 日期序列号、Date 对象、字符串等格式
   */
  private extractDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "number") {
      // Excel日期序列号
      return new Date((value - 25569) * 86400 * 1000);
    }

    if (typeof value === "string") {
      const str = value.trim();

      // 匹配中文日期格式：2025年11月5日 或 2025年11月5
      const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
      if (chineseDateMatch) {
        const year = parseInt(chineseDateMatch[1], 10);
        const month = parseInt(chineseDateMatch[2], 10);
        const day = parseInt(chineseDateMatch[3], 10);
        return new Date(year, month - 1, day);
      }

      // 尝试标准格式
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  /**
   * 简化的日期解析 - 与 PC 版本一致
   */
  private parseSimpleDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    const str = value.toString().trim();

    // Handle Excel date numbers
    if (/^\d+(\.\d+)?$/.test(str)) {
      const excelDate = parseFloat(str);
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle Chinese date format
    const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
    if (chineseDateMatch) {
      const year = parseInt(chineseDateMatch[1], 10);
      const month = parseInt(chineseDateMatch[2], 10);
      const day = parseInt(chineseDateMatch[3], 10);
      return new Date(year, month - 1, day);
    }

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [year, month, day] = str.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    // Try other formats
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  // ========== 跨行验证方法 ==========

  /**
   * 验证唯一性规则 - 与 PC Worker 版本完全一致
   * 支持 scope: "day" 按日期分组验证
   */
  private validateUnique(rule: ValidationRule): any[] {
    const errors: any[] = [];
    const { scope } = rule.params || {};

    if (scope === "day") {
      // 按日期分组的唯一性验证（如：同一药店1日内不能重复拜访）
      const dailyGroups = new Map<string, Set<string>>(); // date -> Set<uniqueKey>
      const rowTracker = new Map<string, number[]>(); // "date_uniqueKey" -> rowNumber[]

      for (const [rowNumber, rowData] of this.allRowsData) {
        const value = rowData[rule.field];
        if (!value) continue;

        // 获取日期字段
        const dateValue =
          rowData.visitStartTime ||
          rowData.surveyTime ||
          rowData["拜访开始时间"] ||
          rowData["拜访日期"];

        if (!dateValue) continue;

        const date = this.extractDate(dateValue);
        if (!date) continue;

        // 格式化日期
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        // 获取地址信息
        const address = rowData.channelAddress || rowData["渠道地址"] || "";

        // 创建唯一标识：结合店铺名称和地址
        const normalizedValue = String(value).trim().toLowerCase();
        const normalizedAddress = String(address).trim().toLowerCase();
        const uniqueKey = `${normalizedValue}|${normalizedAddress}`;

        const trackingKey = `${dateStr}_${uniqueKey}`;

        if (!dailyGroups.has(dateStr)) {
          dailyGroups.set(dateStr, new Set());
        }

        if (!rowTracker.has(trackingKey)) {
          rowTracker.set(trackingKey, []);
        }

        rowTracker.get(trackingKey)!.push(rowNumber);

        // 检查是否重复
        if (dailyGroups.get(dateStr)!.has(uniqueKey)) {
          // 找到第一次出现的行号
          const firstOccurrence = rowTracker.get(trackingKey)![0];

          errors.push({
            row: rowNumber,
            column: rule.field,
            field: rule.field,
            value,
            message: `${
              rule.message
            }（与第${firstOccurrence}行重复，同一店铺：${value}${
              address ? ` - ${address}` : ""
            }）`,
            errorType: "unique",
          });
        } else {
          dailyGroups.get(dateStr)!.add(uniqueKey);
        }
      }
    } else {
      // 全局唯一性验证（global、task 或默认）
      const seenValues = new Set<string>();
      const duplicateValues = new Set<string>();

      // 第一遍：找出所有重复值
      for (const [_, rowData] of this.allRowsData) {
        const value = rowData[rule.field];
        if (value && String(value).trim()) {
          const normalizedValue = String(value).trim().toLowerCase();
          if (seenValues.has(normalizedValue)) {
            duplicateValues.add(normalizedValue);
          } else {
            seenValues.add(normalizedValue);
          }
        }
      }

      // 第二遍：为所有重复值报错
      for (const [rowNumber, rowData] of this.allRowsData) {
        const value = rowData[rule.field];
        if (value && String(value).trim()) {
          const normalizedValue = String(value).trim().toLowerCase();
          if (duplicateValues.has(normalizedValue)) {
            errors.push({
              row: rowNumber,
              column: rule.field,
              field: rule.field,
              value,
              message: rule.message,
              errorType: "unique",
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * 日期间隔验证 - 与 PC Worker 版本完全一致
   * 按实施人+目标分组，检查日期间隔
   * 从 rule.field 读取日期值（而不是通用日期字段）
   */
  private validateDateInterval(rule: ValidationRule): any[] {
    const errors: any[] = [];
    const { days, groupBy } = rule.params;

    // 按 实施人 + 目标(groupBy) 分组
    const groups = new Map<
      string,
      Array<{ row: number; date: Date; target: string; implementer: string }>
    >();

    for (const [rowNumber, rowData] of this.allRowsData) {
      const groupValue = rowData[groupBy];
      const implementer = rowData.implementer || rowData["实施人"];

      // 关键修复：从 rule.field 读取日期值（与 Worker 版本一致）
      const dateValue = rowData[rule.field];

      if (!groupValue || !implementer) continue;
      if (!dateValue) continue;

      const date = this.extractDate(dateValue);
      if (!date) continue;

      // 创建唯一键：实施人+目标
      const groupKey = `${implementer}|${groupValue}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push({
        row: rowNumber,
        date,
        target: groupValue.toString(),
        implementer: implementer.toString(),
      });
    }

    // 检查每组内的日期间隔
    for (const [groupKey, entries] of groups) {
      // 按日期排序
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());

      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        const previous = entries[i - 1];

        const diffDays = Math.floor(
          (current.date.getTime() - previous.date.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (diffDays < days) {
          const [implementer, target] = groupKey.split("|");
          errors.push({
            row: current.row,
            column: rule.field,
            field: rule.field,
            value: target,
            message: `${rule.message}（与第${previous.row}行冲突，实施人：${implementer}，目标：${target}）`,
            errorType: "dateInterval",
          });
        }
      }
    }

    return errors;
  }

  /**
   * 频次验证 - 与 PC Worker 版本完全一致
   * 支持 countBy 参数进行去重计数（如：按药店名称计数）
   */
  private validateFrequency(rule: ValidationRule): any[] {
    const errors: any[] = [];
    const { maxPerDay, groupBy, countBy } = rule.params;

    // 按实施人分组统计每日计数
    const dailyCounts = new Map<string, Map<string, Set<string> | number>>(); // implementer -> Map<dateStr, Set<countByValue> | count>
    const rowTracker = new Map<
      string,
      Array<{ date: string; rowNumber: number }>
    >(); // implementer -> Array<{date, rowNumber}>

    for (const [rowNumber, rowData] of this.allRowsData) {
      // 尽量容错不同列名的实施人字段
      let implementer = rowData[groupBy];
      if (!implementer && groupBy === "implementer") {
        implementer =
          rowData["实施人"] || rowData["执行人"] || rowData["执行人员"];
      }

      if (!implementer) continue;

      // 尝试多个可能的日期字段（与 Worker 一致）
      const dateValue =
        rowData.visitStartTime ||
        rowData["拜访开始时间"] ||
        rowData.surveyTime ||
        rowData["调研时间"] ||
        rowData["拜访日期"];

      if (!dateValue) continue;

      const date = this.extractDate(dateValue);
      if (!date) continue;

      // 格式化日期
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      if (!dailyCounts.has(implementer)) {
        dailyCounts.set(implementer, new Map());
        rowTracker.set(implementer, []);
      }

      const implementerCounts = dailyCounts.get(implementer)!;

      if (countBy) {
        // 使用 countBy 字段进行去重计数（如：按药店名称计数）
        const countByValue = rowData[countBy];
        if (!countByValue) continue;

        if (!implementerCounts.has(dateStr)) {
          implementerCounts.set(dateStr, new Set<string>());
        }

        const dateCountSet = implementerCounts.get(dateStr) as Set<string>;
        const normalizedCountByValue = String(countByValue)
          .trim()
          .toLowerCase();
        dateCountSet.add(normalizedCountByValue);

        const currentCount = dateCountSet.size;

        rowTracker.get(implementer)!.push({ date: dateStr, rowNumber });

        // 只有超过限制时才报错（与服务端一致）
        if (currentCount > maxPerDay) {
          errors.push({
            row: rowNumber,
            column: rule.field,
            field: rule.field,
            value: implementer,
            message: `${rule.message}（${dateStr}当日第${currentCount}家，超过${maxPerDay}家限制）`,
            errorType: "frequency",
          });
        }
      } else {
        // 传统计数方式（每行计数一次）
        const currentCount = (implementerCounts.get(dateStr) as number) || 0;
        implementerCounts.set(dateStr, currentCount + 1);

        rowTracker.get(implementer)!.push({ date: dateStr, rowNumber });

        // 只有超过限制时才报错（与服务端一致）
        if (currentCount + 1 > maxPerDay) {
          errors.push({
            row: rowNumber,
            column: rule.field,
            field: rule.field,
            value: implementer,
            message: `${rule.message}（${dateStr}当日第${
              currentCount + 1
            }家，超过${maxPerDay}家限制）`,
            errorType: "frequency",
          });
        }
      }
    }

    return errors;
  }

  private validateSameImplementer(rule: ValidationRule): any[] {
    const errors: any[] = [];
    const { targetField, implementerField } = rule.params;
    const targetImplementers = new Map<string, string>();

    for (const [rowNumber, rowData] of this.allRowsData) {
      const targetValue = rowData[targetField];
      const implementerValue = rowData[implementerField];

      if (!targetValue || !implementerValue) continue;

      const targetKey = targetValue.toString();

      if (targetImplementers.has(targetKey)) {
        const expectedImplementer = targetImplementers.get(targetKey)!;
        if (implementerValue.toString() !== expectedImplementer) {
          errors.push({
            row: rowNumber,
            column: rule.field,
            field: rule.field,
            value: targetValue,
            message: rule.message,
            errorType: "sameImplementer",
            expectedImplementer,
            actualImplementer: implementerValue.toString(),
          });
        }
      } else {
        targetImplementers.set(targetKey, implementerValue.toString());
      }
    }

    return errors;
  }

  // ========== 辅助方法 ==========

  private getDateKey(dateValue: any): string {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  }

  private createError(rowNumber: number, rule: ValidationRule, value: any) {
    return {
      row: rowNumber,
      column: rule.field,
      field: rule.field,
      value: value,
      message: rule.message,
      errorType: rule.type,
    };
  }
}

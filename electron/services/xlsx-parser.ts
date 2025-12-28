import ExcelJS from "exceljs";
import { TaskTemplate } from "../../shared/types";

export class XlsxParser {
  /**
   * 从行对象中提取数据数组
   */
  extractRowData(row: any): any[] {
    const data: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      let value = cell.value;

      // 处理富文本格式
      if (value && typeof value === "object" && value.richText) {
        // richText 是一个数组，包含多个文本片段
        value = value.richText.map((rt: any) => rt.text || "").join("");
        // console.log(`  📝 [富文本转换] 列${colNumber}: "${value}"`);
      }

      data[colNumber - 1] = value;
    });
    return data;
  }

  /**
   * 判断是否为表头行
   */
  isHeaderRow(row: any[], template: TaskTemplate): boolean {
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
    // console.log(
    //   `📋 [表头判断] 匹配 ${matchCount}/${requiredCount} 个必需字段 -> ${
    //     isHeader ? "✅ 是表头" : "❌ 不是表头"
    //   }`
    // );
    return isHeader;
  }

  /**
   * 将数组转换为对象（使用字段映射）
   */
  arrayToObject(
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

  /**
   * 检查工作表名是否匹配模板
   */
  matchesTemplate(sheetName: string, template: TaskTemplate): boolean {
    return template.sheetNames.some(
      (name) => sheetName.includes(name) || name.includes(sheetName)
    );
  }
}

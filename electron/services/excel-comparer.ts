/**
 * Excel 比较器服务 - Electron 主进程版本
 * 基于 Web 版本的 excel-comparer.ts 简化实现
 */

import ExcelJS from "exceljs";

// 类型定义
export interface SheetChange {
  type: "added" | "deleted" | "renamed";
  oldName?: string;
  newName?: string;
  sheetName: string;
}

export interface CellChange {
  sheet: string;
  cell: string;
  row: number;
  column: string;
  oldValue: any;
  newValue: any;
  changeType: "value" | "formula" | "both";
}

export interface ComparisonResult {
  sheetChanges: SheetChange[];
  cellChanges: CellChange[];
  summary: {
    totalChanges: number;
    sheetsAdded: number;
    sheetsDeleted: number;
    sheetsRenamed: number;
    cellsChanged: number;
  };
}

export type ProgressCallback = (progress: number, message: string) => void;

export class ExcelComparer {
  private beforeWorkbook: ExcelJS.Workbook | null = null;
  private afterWorkbook: ExcelJS.Workbook | null = null;

  /**
   * 加载两个 Excel 文件
   */
  async loadFiles(
    beforePath: string,
    afterPath: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    onProgress?.(10, "加载比较前文件...");
    this.beforeWorkbook = new ExcelJS.Workbook();
    await this.beforeWorkbook.xlsx.readFile(beforePath);

    onProgress?.(30, "加载比较后文件...");
    this.afterWorkbook = new ExcelJS.Workbook();
    await this.afterWorkbook.xlsx.readFile(afterPath);
  }

  /**
   * 执行比较
   */
  async compare(onProgress?: ProgressCallback): Promise<ComparisonResult> {
    if (!this.beforeWorkbook || !this.afterWorkbook) {
      throw new Error("请先加载文件");
    }

    onProgress?.(40, "比较工作表结构...");
    const sheetChanges = this.compareSheets();

    onProgress?.(60, "比较单元格内容...");
    const cellChanges = this.compareCells(onProgress);

    onProgress?.(90, "生成比较报告...");

    const summary = {
      totalChanges: sheetChanges.length + cellChanges.length,
      sheetsAdded: sheetChanges.filter((s) => s.type === "added").length,
      sheetsDeleted: sheetChanges.filter((s) => s.type === "deleted").length,
      sheetsRenamed: sheetChanges.filter((s) => s.type === "renamed").length,
      cellsChanged: cellChanges.length,
    };

    onProgress?.(100, "比较完成");

    return {
      sheetChanges,
      cellChanges,
      summary,
    };
  }

  /**
   * 比较工作表结构
   */
  private compareSheets(): SheetChange[] {
    const changes: SheetChange[] = [];

    const beforeSheets = new Set(
      this.beforeWorkbook!.worksheets.map((ws) => ws.name)
    );
    const afterSheets = new Set(
      this.afterWorkbook!.worksheets.map((ws) => ws.name)
    );

    // 检查新增的工作表
    for (const name of afterSheets) {
      if (!beforeSheets.has(name)) {
        changes.push({
          type: "added",
          sheetName: name,
          newName: name,
        });
      }
    }

    // 检查删除的工作表
    for (const name of beforeSheets) {
      if (!afterSheets.has(name)) {
        changes.push({
          type: "deleted",
          sheetName: name,
          oldName: name,
        });
      }
    }

    return changes;
  }

  /**
   * 比较单元格内容
   */
  private compareCells(onProgress?: ProgressCallback): CellChange[] {
    const changes: CellChange[] = [];

    // 找出共同的工作表
    const beforeSheets = new Set(
      this.beforeWorkbook!.worksheets.map((ws) => ws.name)
    );
    const afterSheets = new Set(
      this.afterWorkbook!.worksheets.map((ws) => ws.name)
    );
    const commonSheets = [...beforeSheets].filter((name) =>
      afterSheets.has(name)
    );

    let sheetIndex = 0;
    for (const sheetName of commonSheets) {
      const baseProgress = 60 + (sheetIndex / commonSheets.length) * 25;
      onProgress?.(baseProgress, `比较工作表: ${sheetName}...`);

      const beforeSheet = this.beforeWorkbook!.getWorksheet(sheetName);
      const afterSheet = this.afterWorkbook!.getWorksheet(sheetName);

      if (!beforeSheet || !afterSheet) continue;

      // 获取所有有值的单元格地址
      const beforeCells = this.getCellAddresses(beforeSheet);
      const afterCells = this.getCellAddresses(afterSheet);
      const allCells = new Set([...beforeCells, ...afterCells]);

      for (const cellAddress of allCells) {
        const beforeCell = beforeSheet.getCell(cellAddress);
        const afterCell = afterSheet.getCell(cellAddress);

        const beforeValue = this.getCellValue(beforeCell);
        const afterValue = this.getCellValue(afterCell);

        if (beforeValue !== afterValue) {
          const match = cellAddress.match(/([A-Z]+)(\d+)/);
          if (match) {
            changes.push({
              sheet: sheetName,
              cell: cellAddress,
              row: parseInt(match[2], 10),
              column: match[1],
              oldValue: beforeValue,
              newValue: afterValue,
              changeType: "value",
            });
          }
        }
      }

      sheetIndex++;
    }

    return changes;
  }

  /**
   * 获取工作表中所有有值的单元格地址
   */
  private getCellAddresses(sheet: ExcelJS.Worksheet): Set<string> {
    const addresses = new Set<string>();

    sheet.eachRow({ includeEmpty: false }, (_row, _rowNumber) => {
      _row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.address) {
          addresses.add(cell.address);
        }
      });
    });

    return addresses;
  }

  /**
   * 获取单元格值（统一为字符串便于比较）
   */
  private getCellValue(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      // 处理富文本、公式等复杂值
      if ("richText" in value) {
        return value.richText.map((r: any) => r.text).join("");
      }
      if ("formula" in value) {
        return String((value as any).result ?? "");
      }
      if ("text" in value) {
        return String(value.text);
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * 导出比较报告到 Excel
   */
  async exportReport(
    result: ComparisonResult,
    outputPath: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // 摘要工作表
    const summarySheet = workbook.addWorksheet("比较摘要");
    summarySheet.columns = [
      { header: "项目", key: "item", width: 20 },
      { header: "数量", key: "count", width: 15 },
    ];
    summarySheet.addRow({
      item: "总变更数",
      count: result.summary.totalChanges,
    });
    summarySheet.addRow({
      item: "工作表新增",
      count: result.summary.sheetsAdded,
    });
    summarySheet.addRow({
      item: "工作表删除",
      count: result.summary.sheetsDeleted,
    });
    summarySheet.addRow({
      item: "工作表重命名",
      count: result.summary.sheetsRenamed,
    });
    summarySheet.addRow({
      item: "单元格变更",
      count: result.summary.cellsChanged,
    });

    // 工作表变更
    if (result.sheetChanges.length > 0) {
      const sheetSheet = workbook.addWorksheet("工作表变更");
      sheetSheet.columns = [
        { header: "变更类型", key: "type", width: 15 },
        { header: "原名称", key: "oldName", width: 25 },
        { header: "新名称", key: "newName", width: 25 },
      ];
      result.sheetChanges.forEach((change) => {
        sheetSheet.addRow({
          type:
            change.type === "added"
              ? "新增"
              : change.type === "deleted"
              ? "删除"
              : "重命名",
          oldName: change.oldName || "",
          newName: change.newName || "",
        });
      });
    }

    // 单元格变更
    if (result.cellChanges.length > 0) {
      const cellSheet = workbook.addWorksheet("单元格变更");
      cellSheet.columns = [
        { header: "工作表", key: "sheet", width: 20 },
        { header: "单元格", key: "cell", width: 10 },
        { header: "原值", key: "oldValue", width: 30 },
        { header: "新值", key: "newValue", width: 30 },
      ];
      result.cellChanges.forEach((change) => {
        cellSheet.addRow({
          sheet: change.sheet,
          cell: change.cell,
          oldValue: String(change.oldValue || ""),
          newValue: String(change.newValue || ""),
        });
      });

      // 设置表头样式
      cellSheet.getRow(1).font = { bold: true };
      cellSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    }

    await workbook.xlsx.writeFile(outputPath);
  }
}

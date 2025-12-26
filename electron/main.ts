import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import ExcelJS from "exceljs";
import { ExcelStreamProcessor } from "./services/excel-processor";
import { ExcelComparer } from "./services/excel-comparer";
import type { ValidationResult } from "../shared/types";

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC 处理器注册
function registerIpcHandlers() {
  // 选择单个文件
  ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // 选择多个文件（批量验证用）
  ipcMain.handle("select-multiple-files", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    });

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  // 验证 Excel
  ipcMain.handle(
    "validate-excel",
    async (event, filePath: string, taskName: string, sheetName?: string) => {
      try {
        const processor = new ExcelStreamProcessor();

        // 发送进度更新
        const progressCallback = (progress: number, message: string) => {
          event.sender.send("validation-progress", { progress, message });
        };

        const result = await processor.validateFile(
          filePath,
          taskName,
          sheetName,
          progressCallback
        );
        return result;
      } catch (error) {
        console.error("Validation error:", error);
        throw error;
      }
    }
  );

  // 取消验证
  ipcMain.handle("cancel-validation", async () => {
    // TODO: 实现取消逻辑
    return true;
  });

  // 导出验证结果到 Excel
  ipcMain.handle(
    "export-validation-result",
    async (
      _event,
      filePath: string,
      taskName: string,
      result: ValidationResult
    ) => {
      try {
        // 选择保存位置
        const originalName = path.basename(filePath, path.extname(filePath));
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const suggestedName = `${originalName}_审核报告_${taskName}_${timestamp}.xlsx`;

        const saveResult = await dialog.showSaveDialog({
          defaultPath: suggestedName,
          filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return { success: false, message: "用户取消导出" };
        }

        // 创建工作簿
        const workbook = new ExcelJS.Workbook();

        // 添加概要工作表
        const summarySheet = workbook.addWorksheet("概要");
        summarySheet.columns = [
          { header: "项目", key: "item", width: 20 },
          { header: "值", key: "value", width: 40 },
        ];
        summarySheet.addRow({ item: "文件名", value: path.basename(filePath) });
        summarySheet.addRow({ item: "任务类型", value: taskName });
        summarySheet.addRow({
          item: "验证状态",
          value: result.isValid ? "通过" : "未通过",
        });
        summarySheet.addRow({
          item: "总行数",
          value: result.summary.totalRows,
        });
        summarySheet.addRow({
          item: "有效行数",
          value: result.summary.validRows,
        });
        summarySheet.addRow({
          item: "错误数量",
          value: result.summary.errorCount,
        });

        if (result.summary.imageStats) {
          summarySheet.addRow({
            item: "总图片数",
            value: result.summary.imageStats.totalImages,
          });
          summarySheet.addRow({
            item: "模糊图片",
            value: result.summary.imageStats.blurryImages,
          });
          summarySheet.addRow({
            item: "重复图片",
            value: result.summary.imageStats.duplicateImages,
          });
          summarySheet.addRow({
            item: "可疑图片",
            value: result.summary.imageStats.suspiciousImages,
          });
        }

        // 添加数据错误工作表
        if (result.errors.length > 0) {
          const errorsSheet = workbook.addWorksheet("数据错误");
          errorsSheet.columns = [
            { header: "行号", key: "row", width: 10 },
            { header: "字段", key: "field", width: 20 },
            { header: "错误类型", key: "errorType", width: 15 },
            { header: "错误信息", key: "message", width: 50 },
            { header: "当前值", key: "value", width: 30 },
          ];

          result.errors.forEach((err) => {
            errorsSheet.addRow({
              row: err.row,
              field: err.field,
              errorType: err.errorType,
              message: err.message,
              value: err.value !== undefined ? String(err.value) : "",
            });
          });

          // 设置表头样式
          errorsSheet.getRow(1).font = { bold: true };
          errorsSheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        }

        // 添加图片错误工作表
        if (result.imageErrors && result.imageErrors.length > 0) {
          const imageSheet = workbook.addWorksheet("图片错误");
          imageSheet.columns = [
            { header: "图片序号", key: "imageIndex", width: 10 },
            { header: "行号", key: "row", width: 10 },
            { header: "列号", key: "column", width: 10 },
            { header: "错误类型", key: "errorType", width: 15 },
            { header: "错误信息", key: "message", width: 50 },
          ];

          result.imageErrors.forEach((err) => {
            imageSheet.addRow({
              imageIndex: err.imageIndex,
              row: err.row,
              column: err.column || "",
              errorType:
                err.errorType === "blur"
                  ? "模糊"
                  : err.errorType === "duplicate"
                  ? "重复"
                  : "可疑",
              message: err.message,
            });
          });

          imageSheet.getRow(1).font = { bold: true };
          imageSheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        }

        // 保存文件
        await workbook.xlsx.writeFile(saveResult.filePath);

        return {
          success: true,
          message: "导出成功",
          path: saveResult.filePath,
        };
      } catch (error) {
        console.error("导出错误:", error);
        throw error;
      }
    }
  );

  // 比较两个 Excel 文件
  ipcMain.handle(
    "compare-excel",
    async (event, beforePath: string, afterPath: string) => {
      try {
        const comparer = new ExcelComparer();

        // 发送进度更新
        const progressCallback = (progress: number, message: string) => {
          event.sender.send("validation-progress", { progress, message });
        };

        await comparer.loadFiles(beforePath, afterPath, progressCallback);
        const result = await comparer.compare(progressCallback);

        return result;
      } catch (error) {
        console.error("比较错误:", error);
        throw error;
      }
    }
  );

  // 导出比较结果
  ipcMain.handle(
    "export-comparison-result",
    async (_event, filePath: string, result: any) => {
      try {
        const originalName = path.basename(filePath, path.extname(filePath));
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const suggestedName = `${originalName}_比较报告_${timestamp}.xlsx`;

        const saveResult = await dialog.showSaveDialog({
          defaultPath: suggestedName,
          filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return { success: false, message: "用户取消导出" };
        }

        const comparer = new ExcelComparer();
        await comparer.exportReport(result, saveResult.filePath);

        return {
          success: true,
          message: "导出成功",
          path: saveResult.filePath,
        };
      } catch (error) {
        console.error("导出比较结果错误:", error);
        throw error;
      }
    }
  );
}

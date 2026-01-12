import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import ExcelJS from "exceljs";
import { ExcelStreamProcessor } from "./services/excel-processor";
import { ExcelComparer } from "./services/excel-comparer";
import { historyStore } from "./services/history-store";
import { getFolderDuplicateDetector } from "./services/folder-duplicate-detector";
import type { ValidationResult } from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let currentProcessor: ExcelStreamProcessor | null = null; // 用于取消验证

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

  // 获取 Excel 文件的工作表列表
  ipcMain.handle("get-excel-sheets", async (_event, filePath: string) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const sheets = workbook.worksheets.map((ws) => ({
        name: ws.name,
        hasData: ws.rowCount > 1, // 至少有标题行+数据行
      }));
      
      return sheets;
    } catch (error) {
      console.error("读取工作表错误:", error);
      throw error;
    }
  });

  // 验证 Excel
  ipcMain.handle(
    "validate-excel",
    async (event, filePath: string, taskName: string, sheetName?: string, validateAllImages?: boolean, enableModelCapabilities?: boolean, brandName?: string) => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 [IPC] validate-excel 请求开始");
      console.log("=".repeat(60));
      console.log("📁 文件路径:", filePath);
      console.log("📋 任务类型:", taskName);
      console.log("📄 工作表:", sheetName || "(自动检测)");
      console.log("🖼️ 验证所有图片:", validateAllImages ? "是" : "否");
      console.log("🤖 模型能力:", enableModelCapabilities !== false ? "开启" : "关闭");
      console.log("🏷️ 品牌:", brandName || "(无)");
      console.log("⏰ 时间:", new Date().toISOString());
      console.log("-".repeat(60));

      const startTime = Date.now();
      
      try {
        const processor = new ExcelStreamProcessor();
        currentProcessor = processor; // 保存以便取消

        // 发送进度更新
        const progressCallback = (progress: number, message: string) => {
          console.log(`📊 [进度] ${progress}% - ${message}`);
          event.sender.send("validation-progress", { progress, message });
        };

        console.log("🔄 [IPC] 开始调用 processor.validateFile...");
        const result = await processor.validateFile(
          filePath,
          taskName,
          sheetName,
          progressCallback,
          validateAllImages,
          enableModelCapabilities,
          brandName
        );
        
        currentProcessor = null; // 清理
        
        const duration = Date.now() - startTime;
        console.log("-".repeat(60));
        console.log("✅ [IPC] validate-excel 请求完成");
        console.log("⏱️  耗时:", duration, "ms");
        console.log("📊 结果:", {
          isValid: result.isValid,
          totalRows: result.summary?.totalRows,
          errorCount: result.summary?.errorCount,
          imageErrors: result.imageErrors?.length || 0,
          imageStats: result.summary?.imageStats,
        });
        console.log("=".repeat(60) + "\n");
        
        // 自动保存验证历史 (传入 full result 以保存详细报告)
        // 只有当不需要选择工作表时才保存历史，避免出现"等待选择"的中间状态记录
        if (!result.needSheetSelection) {
          historyStore.addRecord({
            fileName: path.basename(filePath),
            filePath,
            taskName,
            summary: {
              totalRows: result.summary?.totalRows || 0,
              errorCount: result.summary?.errorCount || 0,
              imageErrorCount: result.imageErrors?.length || 0,
            },
            isValid: result.isValid,
            // 仍然保存部分预览到 store 以便快速加载列表
            previewErrors: result.errors ? result.errors.slice(0, 20) : [],
            previewImageErrors: result.imageErrors ? result.imageErrors.slice(0, 5) : [],
          }, result); // 传入 result 作为第二个参数
        }
        
        return result;
      } catch (error) {
        currentProcessor = null; // 清理
        const duration = Date.now() - startTime;
        console.log("-".repeat(60));
        console.error("❌ [IPC] validate-excel 请求失败");
        console.error("⏱️  耗时:", duration, "ms");
        console.error("错误:", error);
        console.log("=".repeat(60) + "\n");
        throw error;
      }
    }
  );

  // 取消验证
  ipcMain.handle("cancel-validation", async () => {
    console.log("🛑 [IPC] cancel-validation 请求");
    if (currentProcessor) {
      currentProcessor.cancel();
      currentProcessor = null;
      console.log("🛑 [IPC] 已取消当前验证");
      return true;
    }
    console.log("⚠️ [IPC] 没有正在进行的验证可取消");
    return false;
  });

  // 合并验证两个 Excel 文件
  ipcMain.handle(
    "validate-merged-excel",
    async (
      event,
      filePath1: string,
      filePath2: string,
      taskName: string,
      sheetName1?: string,
      sheetName2?: string,
      validateAllImages?: boolean,
      enableModelCapabilities?: boolean,
      brandName?: string
    ) => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 [IPC] validate-merged-excel 请求开始");
      console.log("=".repeat(60));
      console.log("📁 文件1路径:", filePath1);
      console.log("📁 文件2路径:", filePath2);
      console.log("📋 任务类型:", taskName);
      console.log("📄 工作表1:", sheetName1 || "(自动检测)");
      console.log("📄 工作表2:", sheetName2 || "(自动检测)");
      console.log("🖼️ 验证所有图片:", validateAllImages ? "是" : "否");
      console.log("🤖 模型能力:", enableModelCapabilities !== false ? "开启" : "关闭");
      console.log("🏷️ 品牌:", brandName || "(无)");
      console.log("⏰ 时间:", new Date().toISOString());
      console.log("-".repeat(60));

      const startTime = Date.now();

      try {
        const processor = new ExcelStreamProcessor();
        currentProcessor = processor;

        const progressCallback = (progress: number, message: string) => {
          console.log(`📊 [进度] ${progress}% - ${message}`);
          event.sender.send("validation-progress", { progress, message });
        };

        console.log("🔄 [IPC] 开始调用 processor.validateMergedFiles...");
        const result = await processor.validateMergedFiles(
          filePath1,
          filePath2,
          taskName,
          sheetName1,
          sheetName2,
          progressCallback,
          validateAllImages,
          enableModelCapabilities,
          brandName
        );

        currentProcessor = null;

        const duration = Date.now() - startTime;
        console.log("-".repeat(60));
        console.log("✅ [IPC] validate-merged-excel 请求完成");
        console.log("⏱️  耗时:", duration, "ms");
        console.log("📊 结果:", {
          isValid: result.isValid,
          totalRows: result.summary?.totalRows,
          errorCount: result.summary?.errorCount,
          imageErrors: result.imageErrors?.length || 0,
        });
        console.log("=".repeat(60) + "\n");

        // 保存历史记录
        if (!result.needSheetSelection) {
          const fileName1 = path.basename(filePath1);
          const fileName2 = path.basename(filePath2);
          historyStore.addRecord({
            fileName: `[合并] ${fileName1} + ${fileName2}`,
            filePath: filePath1, // 使用第一个文件路径作为主标识
            taskName,
            summary: {
              totalRows: result.summary?.totalRows || 0,
              errorCount: result.summary?.errorCount || 0,
              imageErrorCount: result.imageErrors?.length || 0,
            },
            isValid: result.isValid,
            previewErrors: result.errors ? result.errors.slice(0, 20) : [],
            previewImageErrors: result.imageErrors ? result.imageErrors.slice(0, 5) : [],
          }, result);
        }

        return result;
      } catch (error) {
        currentProcessor = null;
        const duration = Date.now() - startTime;
        console.log("-".repeat(60));
        console.error("❌ [IPC] validate-merged-excel 请求失败");
        console.error("⏱️  耗时:", duration, "ms");
        console.error("错误:", error);
        console.log("=".repeat(60) + "\n");
        throw error;
      }
    }
  );

  // ========== 历史记录 IPC ==========
  // 获取所有历史记录
  ipcMain.handle("get-history", async () => {
    return historyStore.getAll();
  });

  // 获取历史详情
  ipcMain.handle("get-history-detail", async (_event, id: string) => {
    return historyStore.getDetail(id);
  });

  // 删除单条历史记录
  ipcMain.handle("delete-history", async (_event, id: string) => {
    return historyStore.deleteById(id);
  });

  // 清空历史记录
  ipcMain.handle("clear-history", async () => {
    historyStore.clearAll();
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

  // ========== 文件夹图片对比 IPC ==========
  
  // 选择文件夹
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // 扫描文件夹图片
  ipcMain.handle("scan-folder-images", async (_event, folderPath: string) => {
    try {
      const detector = getFolderDuplicateDetector();
      const result = await detector.scanFolder(folderPath);
      return {
        success: true,
        data: {
          folderPath: result.folderPath,
          imageCount: result.imageCount,
        },
      };
    } catch (error) {
      console.error("扫描文件夹错误:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 对比两个文件夹
  ipcMain.handle(
    "compare-folders",
    async (event, libraryPath: string, newImagesPath: string) => {
      try {
        const detector = getFolderDuplicateDetector();

        // 发送进度更新
        const progressCallback = (current: number, total: number, message: string) => {
          event.sender.send("validation-progress", {
            progress: current,
            message,
          });
        };

        const result = await detector.compareFolders(
          libraryPath,
          newImagesPath,
          progressCallback
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("对比文件夹错误:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // 获取图片缩略图
  ipcMain.handle("get-image-thumbnail", async (_event, imagePath: string) => {
    try {
      const detector = getFolderDuplicateDetector();
      const thumbnail = await detector.generateThumbnail(imagePath);
      return {
        success: true,
        data: thumbnail,
      };
    } catch (error) {
      console.error("生成缩略图错误:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

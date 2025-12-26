import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // 选择单个文件
  selectFile: () => ipcRenderer.invoke("select-file"),

  // 选择多个文件（批量验证用）
  selectMultipleFiles: () => ipcRenderer.invoke("select-multiple-files"),

  // 验证 Excel
  validateExcel: (filePath: string, taskName: string, sheetName?: string) =>
    ipcRenderer.invoke("validate-excel", filePath, taskName, sheetName),

  // 取消验证
  cancelValidation: () => ipcRenderer.invoke("cancel-validation"),

  // 导出验证结果
  exportValidationResult: (filePath: string, taskName: string, result: any) =>
    ipcRenderer.invoke("export-validation-result", filePath, taskName, result),

  // 比较两个 Excel 文件
  compareExcel: (beforePath: string, afterPath: string) =>
    ipcRenderer.invoke("compare-excel", beforePath, afterPath),

  // 导出比较结果
  exportComparisonResult: (filePath: string, result: any) =>
    ipcRenderer.invoke("export-comparison-result", filePath, result),

  // 监听进度更新
  onProgress: (
    callback: (data: { progress: number; message: string }) => void
  ) => {
    ipcRenderer.on("validation-progress", (_event, data) => callback(data));
  },

  // 移除进度监听
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners("validation-progress");
  },
};

contextBridge.exposeInMainWorld("electron", electronAPI);

export type ElectronAPI = typeof electronAPI;

import { contextBridge, ipcRenderer, webUtils } from "electron";

const electronAPI = {
  // 从拖拽的文件获取路径（用于拖拽上传）
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  
  // 选择单个文件
  selectFile: () => ipcRenderer.invoke("select-file"),

  // 选择多个文件（批量验证用）
  selectMultipleFiles: () => ipcRenderer.invoke("select-multiple-files"),

  // 获取 Excel 文件的工作表列表
  getExcelSheets: (filePath: string) =>
    ipcRenderer.invoke("get-excel-sheets", filePath),

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

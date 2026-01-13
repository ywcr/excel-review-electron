import { contextBridge, ipcRenderer, webUtils } from "electron";

const electronAPI = {
  // 从拖拽的文件获取路径（用于拖拽上传）
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  
  // 选择单个文件
  selectFile: () => ipcRenderer.invoke("select-file"),

  // 选择多个文件（批量验证用）
  selectMultipleFiles: () => ipcRenderer.invoke("select-multiple-files"),

  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // 获取 Excel 文件的工作表列表
  getExcelSheets: (filePath: string) =>
    ipcRenderer.invoke("get-excel-sheets", filePath),

  // 验证 Excel
  validateExcel: (filePath: string, taskName: string, sheetName?: string, validateAllImages?: boolean, enableModelCapabilities?: boolean, brandName?: string) =>
    ipcRenderer.invoke("validate-excel", filePath, taskName, sheetName, validateAllImages, enableModelCapabilities, brandName),

  // 取消验证
  cancelValidation: () => ipcRenderer.invoke("cancel-validation"),

  // 合并验证两个 Excel 文件
  validateMergedExcel: (
    filePath1: string,
    filePath2: string,
    taskName: string,
    sheetName1?: string,
    sheetName2?: string,
    validateAllImages?: boolean,
    enableModelCapabilities?: boolean,
    brandName?: string
  ) =>
    ipcRenderer.invoke(
      "validate-merged-excel",
      filePath1,
      filePath2,
      taskName,
      sheetName1,
      sheetName2,
      validateAllImages,
      enableModelCapabilities,
      brandName
    ),

  // 导出验证结果
  exportValidationResult: (filePath: string, taskName: string, result: any) =>
    ipcRenderer.invoke("export-validation-result", filePath, taskName, result),

  // 比较两个 Excel 文件
  compareExcel: (beforePath: string, afterPath: string) =>
    ipcRenderer.invoke("compare-excel", beforePath, afterPath),

  // 导出比较结果
  exportComparisonResult: (filePath: string, result: any) =>
    ipcRenderer.invoke("export-comparison-result", filePath, result),

  // ========== 历史记录 API ==========
  // 获取所有历史记录
  // 获取所有历史记录
  getHistory: () => ipcRenderer.invoke("get-history"),

  // 获取历史详情
  getHistoryDetail: (id: string) => ipcRenderer.invoke("get-history-detail", id),

  // 删除单条历史记录
  deleteHistory: (id: string) => ipcRenderer.invoke("delete-history", id),

  // 清空历史记录
  clearHistory: () => ipcRenderer.invoke("clear-history"),

  // ========== 文件夹图片对比 API ==========
  // 扫描文件夹图片
  scanFolderImages: (folderPath: string) =>
    ipcRenderer.invoke("scan-folder-images", folderPath),

  // 对比两个文件夹
  compareFolders: (libraryPath: string, newImagesPath: string) =>
    ipcRenderer.invoke("compare-folders", libraryPath, newImagesPath),

  // 获取图片缩略图
  getImageThumbnail: (imagePath: string) =>
    ipcRenderer.invoke("get-image-thumbnail", imagePath),

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

  // 检测是否为轻量版
  isLiteVersion: () => ipcRenderer.invoke("is-lite-version"),
};

contextBridge.exposeInMainWorld("electron", electronAPI);

export type ElectronAPI = typeof electronAPI;

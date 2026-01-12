// 类型定义文件 - 共享给主进程和渲染进程

// 导出检测相关类型
export * from "./detection";

export interface ValidationError {
  row: number;
  column?: string;
  field: string;
  value?: any;
  message: string;
  errorType: string;
  /** 合并验证时标识错误来源 */
  sourceFile?: 'file1' | 'file2';
  /** 来源文件名 */
  sourceFileName?: string;
}

export interface ImageValidationError {
  row: number;
  column?: string;
  field?: string;
  imageIndex: number;
  /** 合并验证时标识错误来源 */
  sourceFile?: 'file1' | 'file2';
  /** 来源文件名 */
  sourceFileName?: string;
  errorType: "blur" | "duplicate" | "suspicious" | "seasonMismatch" | "border" | "objectDuplicate";
  message: string;
  details?: {
    blurScore?: number;
    duplicateOf?: number;
    /** 重复图片的位置，如 "行5 列M" */
    duplicateOfPosition?: string;
    /** 重复图片的缩略图数据（用于对比预览） */
    duplicateOfImageData?: string;
    suspicionScore?: number;
    suspicionLevel?: string;
    /** 检测到的季节 */
    detectedSeason?: string;
    /** 季节不符原因 */
    seasonMismatchReason?: string;
    /** 边框位置（上/下/左/右） */
    borderSides?: string[];
    /** 边框宽度 */
    borderWidth?: Record<string, number>;

    /** 物体重复检测结果 */
    objectDuplicate?: {
      objectClass: string;
      objectClassCN: string;
      image1Index: number;
      image2Index: number;
      image1Position?: string;
      image2Position?: string;
      similarity: number;
      bbox1?: { x: number; y: number; width: number; height: number };
      bbox2?: { x: number; y: number; width: number; height: number };
    };
  };
  /** Base64 编码的缩略图数据（用于预览） */
  imageData?: string;
  /** 图片 MIME 类型 */
  mimeType?: string;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorCount: number;
  imageStats?: {
    totalImages: number;
    blurryImages: number;
    duplicateImages: number;
    suspiciousImages: number;
    seasonMismatchImages: number;
    borderImages: number;
  };
  /** 图片验证是否被跳过 */
  imageValidationSkipped?: boolean;
  /** 图片验证跳过的原因 */
  imageValidationSkipReason?: string;
}

export interface ValidationResult {
  isValid: boolean;
  needSheetSelection?: boolean;
  availableSheets?: Array<{ name: string; hasData: boolean }>;
  headerValidation?: {
    isValid: boolean;
    missingFields: string[];
    unmatchedFields: string[];
    suggestions: Array<{
      expected: string;
      actual: string;
      similarity: number;
    }>;
  };
  errors: ValidationError[];
  imageErrors?: ImageValidationError[];
  summary: ValidationSummary;
  usedSheetName?: string;
  /** 合并验证统计 - 仅在合并验证模式下返回 */
  mergeStats?: {
    /** 所有名称的汇总统计 */
    entities: Array<{
      name: string;
      address: string;
      count: number;
      sourceFiles: Array<'file1' | 'file2'>;
    }>;
    /** 总实体数（去重后） */
    totalUniqueEntities: number;
    /** 跨文件重复数 */
    crossFileDuplicates: number;
  };
}

export interface ValidationProgress {
  progress: number;
  message: string;
}

export interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
}

export interface ValidationRule {
  field: string;
  type:
  | "required"
  | "unique"
  | "timeRange"
  | "duration"
  | "frequency"
  | "dateInterval"
  | "dateFormat"
  | "minValue"
  | "medicalLevel"
  | "sixMonthsInterval"
  | "crossTaskValidation"
  | "prohibitedContent"
  | "sameImplementer";
  params?: any;
  message: string;
}

export interface TaskTemplate {
  name: string;
  description: string;
  requiredFields: string[];
  sheetNames: string[];
  matchKeywords?: string[];
  fieldMappings: Record<string, string>;
  validationRules: ValidationRule[];
}

// Electron API 类型
declare global {
  interface Window {
    electron: {
      getPathForFile: (file: File) => string;
      selectFile: () => Promise<string | null>;
      selectMultipleFiles: () => Promise<string[]>;
      selectFolder: () => Promise<string | null>;
      getExcelSheets: (filePath: string) => Promise<{ sheets: string[]; error?: string }>;
      validateExcel: (
        filePath: string,
        taskName: string,
        sheetName?: string,
        validateAllImages?: boolean,
        enableModelCapabilities?: boolean,
        brandName?: string
      ) => Promise<ValidationResult>;
      cancelValidation: () => Promise<boolean>;
      validateMergedExcel: (
        filePath1: string,
        filePath2: string,
        taskName: string,
        sheetName1?: string,
        sheetName2?: string,
        validateAllImages?: boolean,
        enableModelCapabilities?: boolean,
        brandName?: string
      ) => Promise<ValidationResult>;
      exportValidationResult: (
        filePath: string,
        taskName: string,
        result: ValidationResult
      ) => Promise<ExportResult>;
      compareExcel: (beforePath: string, afterPath: string) => Promise<any>;
      exportComparisonResult: (
        filePath: string,
        result: any
      ) => Promise<ExportResult>;
      // 历史记录 API
      getHistory: () => Promise<Array<{
        id: string;
        fileName: string;
        filePath: string;
        taskName: string;
        timestamp: number;
        summary: { totalRows: number; errorCount: number; imageErrorCount: number };
        isValid: boolean;
        previewErrors?: ValidationError[];
        previewImageErrors?: ImageValidationError[];
        hasDetail?: boolean;
      }>>;
      getHistoryDetail: (id: string) => Promise<ValidationResult | null>;
      deleteHistory: (id: string) => Promise<boolean>;
      clearHistory: () => Promise<boolean>;
      // 文件夹图片对比 API
      scanFolderImages: (folderPath: string) => Promise<{
        success: boolean;
        data?: { folderPath: string; imageCount: number };
        error?: string;
      }>;
      compareFolders: (libraryPath: string, newImagesPath: string) => Promise<{
        success: boolean;
        data?: {
          totalNewImages: number;
          totalLibraryImages: number;
          duplicates: Array<{
            newImage: { path: string; name: string };
            libraryImage: { path: string; name: string };
            similarity: number;
            hammingDistance: number;
          }>;
          uniqueCount: number;
          durationMs: number;
        };
        error?: string;
      }>;
      getImageThumbnail: (imagePath: string) => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;
      onProgress: (callback: (data: ValidationProgress) => void) => void;
      removeProgressListener: () => void;
    };
  }
}

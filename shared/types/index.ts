// 类型定义文件 - 共享给主进程和渲染进程

export interface ValidationError {
  row: number;
  column: string;
  field: string;
  value: any;
  message: string;
  errorType: string;
}

export interface ImageValidationError {
  row: number;
  column: string;
  field: string;
  imageIndex: number;
  errorType: "blur" | "duplicate" | "suspicious";
  message: string;
  details?: {
    blurScore?: number;
    duplicateOf?: number;
    suspicionScore?: number;
    suspicionLevel?: string;
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
  };
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
      selectFile: () => Promise<string | null>;
      selectMultipleFiles: () => Promise<string[]>;
      validateExcel: (
        filePath: string,
        taskName: string,
        sheetName?: string
      ) => Promise<ValidationResult>;
      cancelValidation: () => Promise<boolean>;
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
      onProgress: (callback: (data: ValidationProgress) => void) => void;
      removeProgressListener: () => void;
    };
  }
}

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { ValidationResult, ValidationProgress } from "../../shared/types";

interface ValidationState {
  isValidating: boolean;
  progress: ValidationProgress | null;
  result: ValidationResult | null;
  error: string | null;
  // 当前验证的文件信息
  currentFile: string | null;
  currentTask: string | null;
}

interface ValidationContextValue extends ValidationState {
  selectFile: () => Promise<string | null>;
  validateExcel: (
    filePath: string,
    taskName: string,
    sheetName?: string,
    validateAllImages?: boolean,
    enableModelCapabilities?: boolean,
    brandName?: string
  ) => Promise<void>;
  cancelValidation: () => Promise<void>;
  clearResult: () => void;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ValidationState>({
    isValidating: false,
    progress: null,
    result: null,
    error: null,
    currentFile: null,
    currentTask: null,
  });

  // 使用 ref 来追踪进度监听器是否已设置
  const progressListenerRef = useRef(false);

  // 选择文件
  const selectFile = useCallback(async () => {
    try {
      const filePath = await window.electron.selectFile();
      return filePath;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "文件选择失败",
      }));
      return null;
    }
  }, []);

  // 验证 Excel
  const validateExcel = useCallback(
    async (
      filePath: string,
      taskName: string,
      sheetName?: string,
      validateAllImages?: boolean,
      enableModelCapabilities?: boolean,
      brandName?: string
    ) => {
      setState(prev => ({
        ...prev,
        result: null,
        error: null,
        progress: null,
        isValidating: true,
        currentFile: filePath,
        currentTask: taskName,
      }));

      // 监听进度更新
      if (!progressListenerRef.current) {
        window.electron.onProgress((data) => {
          setState(prev => ({
            ...prev,
            progress: data,
          }));
        });
        progressListenerRef.current = true;
      }

      try {
        const validationResult = await window.electron.validateExcel(
          filePath,
          taskName,
          sheetName,
          validateAllImages,
          enableModelCapabilities,
          brandName
        );
        setState(prev => ({
          ...prev,
          result: validationResult,
          progress: null,
          isValidating: false,
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : "验证失败",
          isValidating: false,
        }));
      }
    },
    []
  );

  // 取消验证
  const cancelValidation = useCallback(async () => {
    await window.electron.cancelValidation();
    setState(prev => ({
      ...prev,
      isValidating: false,
      progress: null,
    }));
  }, []);

  // 清除结果
  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null,
      progress: null,
    }));
  }, []);

  // 组件卸载时清理监听器
  useEffect(() => {
    return () => {
      if (progressListenerRef.current) {
        window.electron.removeProgressListener();
        progressListenerRef.current = false;
      }
    };
  }, []);

  return (
    <ValidationContext.Provider
      value={{
        ...state,
        selectFile,
        validateExcel,
        cancelValidation,
        clearResult,
      }}
    >
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return context;
}

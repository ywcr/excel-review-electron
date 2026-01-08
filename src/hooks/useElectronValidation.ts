import { useState, useCallback } from "react";
import type { ValidationResult, ValidationProgress } from "../../shared/types";

export function useElectronValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 选择文件
  const selectFile = useCallback(async () => {
    try {
      const filePath = await window.electron.selectFile();
      return filePath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件选择失败");
      return null;
    }
  }, []);

  // 验证 Excel
  const validateExcel = useCallback(
    async (filePath: string, taskName: string, sheetName?: string, validateAllImages?: boolean, enableModelCapabilities?: boolean, brandName?: string) => {
      setResult(null);
      setError(null);
      setProgress(null);
      setIsValidating(true);

      // 监听进度更新
      window.electron.onProgress((data) => {
        setProgress(data);
      });

      try {
        const validationResult = await window.electron.validateExcel(
          filePath,
          taskName,
          sheetName,
          validateAllImages,
          enableModelCapabilities,
          brandName
        );
        setResult(validationResult);
        setProgress(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "验证失败");
      } finally {
        setIsValidating(false);
        window.electron.removeProgressListener();
      }
    },
    []
  );

  // 取消验证
  const cancelValidation = useCallback(async () => {
    await window.electron.cancelValidation();
    setIsValidating(false);
    setProgress(null);
  }, []);

  // 清除结果
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  return {
    isValidating,
    progress,
    result,
    error,
    selectFile,
    validateExcel,
    cancelValidation,
    clearResult,
  };
}

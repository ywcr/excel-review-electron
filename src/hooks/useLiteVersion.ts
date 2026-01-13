import { useState, useEffect } from "react";

/**
 * 检测当前是否为轻量版（不包含 AI 模型能力）
 */
export function useLiteVersion() {
  const [isLite, setIsLite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    // 使用类型断言访问 isLiteVersion（可能在类型定义中未更新）
    const electron = window.electron as typeof window.electron & {
      isLiteVersion?: () => Promise<boolean>;
    };
    
    electron.isLiteVersion?.().then((result) => {
      if (!cancelled) {
        setIsLite(result);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setIsLite(false);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isLite, isLoading };
}

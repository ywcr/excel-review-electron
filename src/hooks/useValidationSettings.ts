import { useState, useEffect, useCallback } from "react";

// 验证设置的存储 Key
const STORAGE_KEY = "validation-settings";

// 默认设置
const DEFAULT_SETTINGS = {
  validateAllImages: false,
  enableModelCapabilities: true,
};

export interface ValidationSettings {
  validateAllImages: boolean;
  enableModelCapabilities: boolean;
}

/**
 * 共享的验证设置 Hook
 * - 在单文件验证和批量验证界面之间同步设置
 * - 使用 localStorage 持久化
 * - 监听 storage 事件实现跨组件同步
 */
export function useValidationSettings() {
  const [settings, setSettings] = useState<ValidationSettings>(() => {
    // 从 localStorage 读取初始值
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("[useValidationSettings] 读取设置失败:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // 保存设置到 localStorage
  const saveSettings = useCallback((newSettings: ValidationSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      // 手动触发 storage 事件以便其他组件同步
      window.dispatchEvent(new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(newSettings),
      }));
    } catch (e) {
      console.error("[useValidationSettings] 保存设置失败:", e);
    }
  }, []);

  // 更新单个设置项
  const updateSetting = useCallback(<K extends keyof ValidationSettings>(
    key: K,
    value: ValidationSettings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  // 监听其他组件的设置变更（storage 事件）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...newSettings });
        } catch (err) {
          console.error("[useValidationSettings] 解析 storage 事件失败:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    ...settings,
    setValidateAllImages: (value: boolean) => updateSetting("validateAllImages", value),
    setEnableModelCapabilities: (value: boolean) => updateSetting("enableModelCapabilities", value),
  };
}

import { useState, useEffect } from "react";
import { GhostButton } from "./Buttons";

interface Sheet {
  name: string;
  hasData: boolean;
}

interface AddTaskModalProps {
  isOpen: boolean;
  fileName: string;
  filePath: string;
  availableTasks: string[];
  onSubmit: (taskType: string, sheetName: string) => void;
  onCancel: () => void;
}

export function AddTaskModal({
  isOpen,
  fileName,
  filePath,
  availableTasks,
  onSubmit,
  onCancel,
}: AddTaskModalProps) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taskType, setTaskType] = useState(availableTasks[0] || "");
  const [sheetName, setSheetName] = useState("");

  // 加载工作表列表
  useEffect(() => {
    if (!isOpen || !filePath) return;

    const loadSheets = async () => {
      setIsLoading(true);
      try {
        const result = await window.electron.getExcelSheets(filePath);
        if (result && result.sheets && result.sheets.length > 0) {
          // 将 string[] 转换为 Sheet[]，假设都有数据
          const sheetList: Sheet[] = result.sheets.map((name) => ({
            name,
            hasData: true,
          }));
          setSheets(sheetList);
          // 自动选择第一个工作表
          setSheetName(sheetList[0].name);
        }
      } catch (err) {
        console.error("加载工作表失败:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSheets();
  }, [isOpen, filePath]);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const validSheets = sheets.filter((s) => s.hasData);

  const handleSubmit = () => {
    if (taskType && sheetName) {
      onSubmit(taskType, sheetName);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span className="text-xl">➕</span> 添加审核任务
          </h3>
          <p className="text-sm text-zinc-500 mt-1 truncate" title={fileName}>
            文件: <span className="font-medium text-zinc-700">{fileName}</span>
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* 任务类型 */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              任务类型
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm font-medium rounded-lg focus:ring-black focus:border-black p-3"
            >
              {availableTasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </select>
          </div>

          {/* 工作表 */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              工作表
            </label>
            {isLoading ? (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm text-zinc-500 flex items-center gap-2">
                <span className="animate-spin">⟳</span> 正在加载工作表...
              </div>
            ) : validSheets.length > 0 ? (
              <select
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm font-medium rounded-lg focus:ring-black focus:border-black p-3"
              >
                {validSheets.map((sheet) => (
                  <option key={sheet.name} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
                未找到有效的工作表
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          <GhostButton onClick={onCancel} className="text-sm">
            取消
          </GhostButton>
          <button
            onClick={handleSubmit}
            disabled={!taskType || !sheetName || isLoading}
            className="h-9 px-4 bg-black text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            添加任务
          </button>
        </div>
      </div>
    </div>
  );
}

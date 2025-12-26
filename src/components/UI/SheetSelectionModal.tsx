import { useEffect } from "react";
import { GhostButton } from "./Buttons";

interface Sheet {
  name: string;
  hasData: boolean;
}

interface SheetSelectionModalProps {
  isOpen: boolean;
  taskName: string;
  sheets: Sheet[];
  onSelect: (sheetName: string) => void;
  onCancel: () => void;
}

export function SheetSelectionModal({
  isOpen,
  taskName,
  sheets,
  onSelect,
  onCancel,
}: SheetSelectionModalProps) {
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
  const emptySheets = sheets.filter((s) => !s.hasData);

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
        <div className="px-6 py-5 border-b border-zinc-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <span className="text-xl">📑</span> 请选择工作表
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              未自动匹配到 "<span className="font-medium text-zinc-900">{taskName}</span>" 任务模板
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors -mr-2 -mt-2"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-zinc-500 uppercase font-medium tracking-wider mb-3">可用工作表</p>
          
          <div className="space-y-2">
            {validSheets.map((sheet) => (
              <button
                key={sheet.name}
                onClick={() => onSelect(sheet.name)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-black hover:bg-zinc-50 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-medium">S</span>
                  <span className="font-medium text-zinc-900">{sheet.name}</span>
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-black transition-colors">选择 →</span>
              </button>
            ))}
          </div>

          {emptySheets.length > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 uppercase font-medium tracking-wider mb-2">空工作表 (不可选)</p>
              <div className="flex flex-wrap gap-2">
                {emptySheets.map((sheet) => (
                  <span 
                    key={sheet.name}
                    className="px-2 py-1 bg-zinc-50 border border-zinc-100 text-zinc-400 rounded text-xs select-none cursor-not-allowed"
                  >
                    {sheet.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <GhostButton onClick={onCancel} className="text-sm">
            取消验证
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

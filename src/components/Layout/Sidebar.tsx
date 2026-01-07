import React from "react";
import { 
  FileTextIcon, 
  FolderIcon, 
  BarChartIcon,
  ClockIcon
} from "../UI/Icons";

interface SidebarProps {
  currentMode: "single" | "batch" | "compare" | "history" | "folder";
  onModeChange: (mode: "single" | "batch" | "compare" | "history" | "folder") => void;
}

export function Sidebar({ currentMode, onModeChange }: SidebarProps) {
  const menuItems = [
    { id: "single", label: "单文件验证", icon: <FileTextIcon size={18} /> },
    { id: "batch", label: "批量验证", icon: <FolderIcon size={18} /> },
    { id: "folder", label: "图片重复检测", icon: <span className="text-base">📷</span> },
    { id: "compare", label: "文件比较", icon: <BarChartIcon size={18} /> },
    { id: "history", label: "验证历史", icon: <ClockIcon size={18} /> },
  ] as const;

  return (
    <aside className="w-[240px] bg-zinc-50 border-r border-zinc-200 flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-2">
          <img 
            src="./icon.png" 
            alt="Logo" 
            className="w-7 h-7 rounded-md shadow-sm"
          />
          BlueGogo
        </h1>
        <p className="text-xs text-zinc-500 mt-1 ml-1">桌面版 v1.1.0</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={`
              w-full text-left px-3 py-2 text-sm font-semibold rounded-md transition-all
              flex items-center gap-3
              ${
                currentMode === item.id
                  ? "bg-white text-black shadow-sm ring-1 ring-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
              }
            `}
          >
            <span className="text-zinc-400 group-hover:text-zinc-600">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
            YW
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate">管理员</p>
            <p className="text-xs font-medium text-zinc-500 truncate">专业版</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

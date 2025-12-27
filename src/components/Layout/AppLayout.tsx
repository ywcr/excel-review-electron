import React from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  currentMode: "single" | "batch" | "compare" | "history";
  onModeChange: (mode: "single" | "batch" | "compare" | "history") => void;
}

export function AppLayout({ children, currentMode, onModeChange }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-white font-sans antialiased text-zinc-900 overflow-hidden">
      <Sidebar currentMode={currentMode} onModeChange={onModeChange} />
      <main className="flex-1 overflow-auto bg-white flex flex-col">
        {/* Top Header Area (Minimal) */}
        <header className="h-14 border-b border-zinc-100 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
          <div className="text-sm font-medium text-zinc-400">
            {currentMode === "single" && "主页 / 单文件验证"}
            {currentMode === "batch" && "主页 / 批量验证"}
            {currentMode === "compare" && "主页 / 文件比较"}
            {currentMode === "history" && "主页 / 验证历史"}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-zinc-500">系统就绪</span>
          </div>
        </header>
        
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

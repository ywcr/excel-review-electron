import { useState, useEffect, useCallback } from "react";

interface DuplicateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  leftImage: {
    imageData: string;
    position: string;
    imageIndex: number;
  };
  rightImage: {
    imageData: string;
    position: string;
    imageIndex: number;
  };
  // 错误信息
  errorMessage?: string;
  // 导航相关属性
  currentIndex?: number;
  totalCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function DuplicateCompareModal({
  isOpen,
  onClose,
  leftImage,
  rightImage,
  errorMessage,
  currentIndex = 0,
  totalCount = 1,
  onPrev,
  onNext,
}: DuplicateCompareModalProps) {
  const [leftLoaded, setLeftLoaded] = useState(false);
  const [rightLoaded, setRightLoaded] = useState(false);

  // 重置加载状态当图片变化时
  useEffect(() => {
    setLeftLoaded(false);
    setRightLoaded(false);
  }, [leftImage.imageData, rightImage.imageData]);

  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const getImageSrc = (data: string) => {
    if (data.startsWith("data:")) return data;
    return `data:image/jpeg;base64,${data}`;
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalCount - 1;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧导航按钮 */}
        {totalCount > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            disabled={!hasPrev}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all
              ${hasPrev 
                ? "bg-white/90 hover:bg-white shadow-lg text-zinc-700 hover:text-zinc-900 cursor-pointer" 
                : "bg-zinc-200/50 text-zinc-400 cursor-not-allowed"
              }`}
            title="上一组 (←)"
          >
            ‹
          </button>
        )}

        {/* 右侧导航按钮 */}
        {totalCount > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            disabled={!hasNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all
              ${hasNext 
                ? "bg-white/90 hover:bg-white shadow-lg text-zinc-700 hover:text-zinc-900 cursor-pointer" 
                : "bg-zinc-200/50 text-zinc-400 cursor-not-allowed"
              }`}
            title="下一组 (→)"
          >
            ›
          </button>
        )}

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <span className="text-amber-500">🔍</span>
            重复图片对比
            {totalCount > 1 && (
              <span className="text-sm font-normal text-zinc-500 ml-2">
                ({currentIndex + 1} / {totalCount})
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>

        {/* 对比区域 */}
        <div className="grid grid-cols-2 gap-4 p-6">
          {/* 左侧：当前图片 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900">当前图片</span>
              <span className="text-xs text-zinc-500 font-mono">
                #{leftImage.imageIndex + 1} · {leftImage.position}
              </span>
            </div>
            <div className="relative aspect-4/3 bg-zinc-100 rounded-lg overflow-hidden border-2 border-amber-200">
              {!leftLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                </div>
              )}
              <img
                src={getImageSrc(leftImage.imageData)}
                alt="当前图片"
                className={`w-full h-full object-contain ${leftLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLeftLoaded(true)}
              />
            </div>
          </div>

          {/* 右侧：重复的原图 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900">重复的原图</span>
              <span className="text-xs text-zinc-500 font-mono">
                #{rightImage.imageIndex + 1} · {rightImage.position}
              </span>
            </div>
            <div className="relative aspect-4/3 bg-zinc-100 rounded-lg overflow-hidden border-2 border-zinc-200">
              {!rightLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                </div>
              )}
              <img
                src={getImageSrc(rightImage.imageData)}
                alt="重复的原图"
                className={`w-full h-full object-contain ${rightLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setRightLoaded(true)}
              />
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1">
              {errorMessage || "这两张图片被检测为重复。请核实是否为同一图片被重复提交。"}
            </span>
            {totalCount > 1 && (
              <span className="text-amber-600 text-xs">
                使用 ← → 键或点击按钮切换
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

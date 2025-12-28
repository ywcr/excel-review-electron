import { useState, useCallback, useRef } from "react";
import { useElectronValidation } from "../hooks/useElectronValidation";
import { ValidationResults } from "./ValidationResults";
import { ValidationRequirements } from "./ValidationRequirements";
import { GhostButton } from "./UI/Buttons";
import { SheetSelectionModal } from "./UI/SheetSelectionModal";

interface SingleFileValidationProps {
  availableTasks: string[];
  defaultTask: string;
}

export function SingleFileValidation({
  availableTasks,
  defaultTask,
}: SingleFileValidationProps) {
  const [selectedTask, setSelectedTask] = useState(defaultTask);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);

  const {
    isValidating,
    progress,
    result,
    error,
    selectFile,
    validateExcel,
    cancelValidation,
    clearResult,
  } = useElectronValidation();

  // 拖拽计数器，用于正确处理子元素的 dragEnter/dragLeave
  const dragCounter = useRef(0);

  // 拖拽事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
      const file = files[0];
      
      // 检查是否是 Excel 文件
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isExcel) {
        return;
      }
      
      try {
        const filePath = window.electron.getPathForFile(file);
        
        if (filePath) {
          setSelectedFile(filePath);
          setSelectedSheet(undefined);
          clearResult();
        }
      } catch (err) {
        console.error('[拖拽上传] 获取文件路径失败:', err);
      }
    }
  }, [clearResult]);

  const handleSelectFile = async () => {
    const filePath = await selectFile();
    if (filePath) {
      setSelectedFile(filePath);
      setSelectedSheet(undefined);
      clearResult();
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    await validateExcel(selectedFile, selectedTask, selectedSheet);
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (selectedFile) {
      await validateExcel(selectedFile, selectedTask, sheetName);
    }
  };

  const handleExport = async () => {
    if (!result || !selectedFile) return;

    try {
      await window.electron.exportValidationResult(
        selectedFile,
        selectedTask,
        result
      );
    } catch (err) {
      console.error("导出失败:", err);
    }
  };

  const fileName = selectedFile ? selectedFile.split("/").pop() : undefined;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">单文件验证</h1>
      </div>

      {/* 顶部操作区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 任务选择卡片 */}
        <section className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-black rounded-full"></span>
            1. 任务类型
          </h2>
          <div className="relative">
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              disabled={isValidating}
              className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm font-medium rounded-md focus:ring-black focus:border-black block p-2.5 disabled:opacity-50 transition-colors"
            >
              {availableTasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </section>

        {/* 文件选择卡片 - 支持拖拽 */}
        <section className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-black rounded-full"></span>
            2. Excel 文件
          </h2>
          <div 
            className={`
              flex flex-col gap-4 p-6 rounded-lg border-2 border-dashed transition-all duration-200
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-zinc-300 hover:border-zinc-400'
              }
              ${isValidating ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <div className="text-3xl">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{fileName}</p>
                  <p className="text-xs text-zinc-500 truncate font-mono">{selectedFile}</p>
                </div>
                <GhostButton 
                  onClick={handleSelectFile}
                  disabled={isValidating}
                  className="shrink-0"
                >
                  更换
                </GhostButton>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className={`text-4xl transition-transform ${isDragging ? 'scale-110' : ''}`}>
                  {isDragging ? '📥' : '📁'}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-700">
                    {isDragging ? '松开鼠标上传文件' : '拖拽 Excel 文件到此处'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">或</p>
                </div>
                <GhostButton 
                  onClick={handleSelectFile}
                  disabled={isValidating}
                  className="border border-zinc-200 hover:border-zinc-300"
                >
                  选择文件...
                </GhostButton>
                <p className="text-xs text-zinc-400">支持 .xlsx 和 .xls 格式</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 验证规则展示 */}
      {selectedTask && (
        <ValidationRequirements
          taskName={selectedTask}
          validationResult={result}
        />
      )}

      {/* 工作表选择模态框 */}
      <SheetSelectionModal
        isOpen={!!(result?.needSheetSelection && result?.availableSheets)}
        taskName={selectedTask}
        sheets={result?.availableSheets || []}
        onSelect={handleSheetSelect}
        onCancel={cancelValidation}
      />

      {/* 操作栏 & 进度 */}
      {selectedFile && !result?.needSheetSelection && (
        <div className="flex flex-col gap-4">
          {!isValidating ? (
            <button 
              onClick={handleValidate}
              className="w-full py-3 bg-black text-white rounded-lg font-medium shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none"
            >
              {result ? "重新审核" : "开始审核"}
            </button>
          ) : (
            <button 
              onClick={cancelValidation}
              className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium hover:bg-red-100 transition-colors"
            >
              取消
            </button>
          )}

          {/* 进度条 */}
          {progress && (
            <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
              <div className="flex justify-between text-xs font-medium text-zinc-500 mb-2">
                <span>处理中...</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-300 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 font-mono">{progress.message}</p>
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg text-sm">
          <span className="font-bold mr-2">Error:</span> {error}
        </div>
      )}

      {/* 验证结果 */}
      {result && !result.needSheetSelection && (
        <div className="animate-slide-up">
          <ValidationResults
            result={result}
            taskName={selectedTask}
            fileName={fileName}
            onExport={
              result.errors.length > 0 || (result.imageErrors?.length ?? 0) > 0
                ? handleExport
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import { useValidation } from "../contexts/ValidationContext";
import { useValidationSettings } from "../hooks/useValidationSettings";
import { useLiteVersion } from "../hooks/useLiteVersion";
import { ValidationResults } from "./ValidationResults";
import { ValidationRequirements } from "./ValidationRequirements";
import { GhostButton } from "./UI/Buttons";
import { SheetSelectionModal } from "./UI/SheetSelectionModal";

// 需要选择品牌的任务类型
const BRAND_REQUIRED_TASKS = ["消费者调研", "患者调研"];
// 可用品牌列表
const AVAILABLE_BRANDS = ["西黄丸", "通络祛痛膏"];

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
  const [selectedBrand, setSelectedBrand] = useState<string>(AVAILABLE_BRANDS[0]);
  const [isDragging, setIsDragging] = useState(false);

  // 合并验证模式状态
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedFile2, setSelectedFile2] = useState<string | null>(null);
  const [selectedSheet1, setSelectedSheet1] = useState<string | undefined>(undefined);
  const [selectedSheet2, setSelectedSheet2] = useState<string | undefined>(undefined);
  const [sheets1, setSheets1] = useState<Array<{ name: string; hasData: boolean }>>([]);
  const [sheets2, setSheets2] = useState<Array<{ name: string; hasData: boolean }>>([]);
  const [loadingSheets1, setLoadingSheets1] = useState(false);
  const [loadingSheets2, setLoadingSheets2] = useState(false);

  // 是否需要显示品牌选择
  const needsBrandSelection = BRAND_REQUIRED_TASKS.includes(selectedTask);

  // 使用共享的验证设置 Hook（支持持久化和跨组件同步）
  const {
    validateAllImages,
    enableModelCapabilities,
    setValidateAllImages,
    setEnableModelCapabilities,
  } = useValidationSettings();

  // 检测是否为轻量版（隐藏模型能力开关）
  const { isLite } = useLiteVersion();

  const {
    isValidating,
    progress,
    result,
    error,
    selectFile,
    validateExcel,
    validateMergedExcel,
    cancelValidation,
    clearResult,
  } = useValidation();

  // 拖拽计数器，用于正确处理子元素的 dragEnter/dragLeave
  const dragCounter = useRef(0);
  const dragCounter2 = useRef(0);

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
          // 合并模式下加载 sheets
          if (isMergeMode) {
            loadSheetsForFile(filePath, 1);
          }
        }
      } catch (err) {
        console.error('[拖拽上传] 获取文件路径失败:', err);
      }
    }
  }, [clearResult, isMergeMode]);

  // 加载文件的 sheet 列表
  const loadSheetsForFile = async (filePath: string, fileIndex: 1 | 2) => {
    const setLoading = fileIndex === 1 ? setLoadingSheets1 : setLoadingSheets2;
    const setSheets = fileIndex === 1 ? setSheets1 : setSheets2;
    const setSheet = fileIndex === 1 ? setSelectedSheet1 : setSelectedSheet2;

    setLoading(true);
    try {
      const result = await window.electron.getExcelSheets(filePath);
      if (result && Array.isArray(result)) {
        setSheets(result.map((s: any) => ({ name: s.name, hasData: s.hasData ?? true })));
        // 自动选择第一个有数据的 sheet
        const firstDataSheet = result.find((s: any) => s.hasData !== false);
        if (firstDataSheet) {
          setSheet(firstDataSheet.name);
        }
      }
    } catch (err) {
      console.error('加载 sheet 列表失败:', err);
    }
    setLoading(false);
  };

  const handleSelectFile = async () => {
    const filePath = await selectFile();
    if (filePath) {
      setSelectedFile(filePath);
      setSelectedSheet(undefined);
      clearResult();
      if (isMergeMode) {
        loadSheetsForFile(filePath, 1);
      }
    }
  };

  // 合并模式：选择第二个文件
  const handleSelectFile2 = async () => {
    const filePath = await selectFile();
    if (filePath) {
      setSelectedFile2(filePath);
      setSelectedSheet2(undefined);
      loadSheetsForFile(filePath, 2);
    }
  };

  // 处理第二个文件的拖拽
  const handleDragEnter2 = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter2.current++;
  }, []);

  const handleDragLeave2 = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter2.current--;
  }, []);

  const handleDrop2 = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter2.current = 0;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isExcel) return;

      try {
        const filePath = window.electron.getPathForFile(file);
        if (filePath) {
          setSelectedFile2(filePath);
          setSelectedSheet2(undefined);
          loadSheetsForFile(filePath, 2);
        }
      } catch (err) {
        console.error('[拖拽上传] 获取文件路径失败:', err);
      }
    }
  }, []);

  const handleValidate = async () => {
    if (isMergeMode) {
      // 合并验证模式
      if (!selectedFile || !selectedFile2) return;
      const brand = needsBrandSelection ? selectedBrand : undefined;
      await validateMergedExcel(
        selectedFile,
        selectedFile2,
        selectedTask,
        selectedSheet1,
        selectedSheet2,
        validateAllImages,
        enableModelCapabilities,
        brand
      );
    } else {
      // 普通单文件验证
      if (!selectedFile) return;
      const brand = needsBrandSelection ? selectedBrand : undefined;
      await validateExcel(selectedFile, selectedTask, selectedSheet, validateAllImages, enableModelCapabilities, brand);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (selectedFile) {
      const brand = needsBrandSelection ? selectedBrand : undefined;
      await validateExcel(selectedFile, selectedTask, sheetName, validateAllImages, enableModelCapabilities, brand);
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

  // 切换合并验证模式时重置状态
  const handleMergeModeToggle = (enabled: boolean) => {
    setIsMergeMode(enabled);
    if (enabled) {
      // 进入合并模式，清空结果
      clearResult();
      setSelectedSheet1(undefined);
      setSelectedSheet2(undefined);
      // 如果已选择文件，加载 sheets
      if (selectedFile) {
        loadSheetsForFile(selectedFile, 1);
      }
    } else {
      // 退出合并模式，清空第二个文件
      setSelectedFile2(null);
      setSheets1([]);
      setSheets2([]);
    }
  };

  const fileName = selectedFile ? selectedFile.split("/").pop() : undefined;
  const fileName2 = selectedFile2 ? selectedFile2.split("/").pop() : undefined;

  // 判断是否可以开始验证
  const canStartValidation = isMergeMode
    ? selectedFile && selectedFile2 && selectedSheet1 && selectedSheet2
    : selectedFile;

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

          {/* 品牌选择 - 仅在消费者调研/患者调研时显示 */}
          {needsBrandSelection && (
            <div className="mt-4">
              <label className="text-sm font-medium text-zinc-700 mb-2 block">品牌</label>
              <div className="relative">
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  disabled={isValidating}
                  className="w-full appearance-none bg-amber-50 border border-amber-200 text-zinc-900 text-sm font-medium rounded-md focus:ring-amber-500 focus:border-amber-500 block p-2.5 disabled:opacity-50 transition-colors"
                >
                  {AVAILABLE_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-600">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          )}
          
          {/* 验证所有图片选项 */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={validateAllImages}
              onChange={(e) => setValidateAllImages(e.target.checked)}
              disabled={isValidating}
              className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black disabled:opacity-50"
            />
            <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
              验证所有工作表中的图片
            </span>
          </label>
          
          {/* 开启模型能力选项 - 轻量版隐藏 */}
          {!isLite && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={enableModelCapabilities}
                onChange={(e) => setEnableModelCapabilities(e.target.checked)}
                disabled={isValidating}
                className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black disabled:opacity-50"
              />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
                开启模型能力
                <span className="text-xs text-zinc-400 ml-1">(季节检测、物体重复检测)</span>
              </span>
            </label>
          )}

          {/* 合并验证模式开关 */}
          <label className="flex items-center gap-2 mt-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isMergeMode}
              onChange={(e) => handleMergeModeToggle(e.target.checked)}
              disabled={isValidating}
              className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
              合并验证模式
              <span className="text-xs text-zinc-400 ml-1">(同时验证两个 Excel 文件)</span>
            </span>
          </label>
        </section>

        {/* 文件选择卡片 - 支持拖拽 */}
        <section className={`bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${isMergeMode ? 'md:col-span-2' : ''}`}>
          <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-black rounded-full"></span>
            2. Excel 文件 {isMergeMode && <span className="text-blue-600 text-xs font-normal">(合并验证模式)</span>}
          </h2>

          {isMergeMode ? (
            /* 合并验证模式 - 两个文件上传区域 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 文件 A */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-500">文件 A</label>
                <div 
                  className={`flex flex-col gap-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 border-zinc-300 hover:border-zinc-400 cursor-pointer ${isValidating ? 'opacity-50 pointer-events-none' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={handleSelectFile}
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">📄</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{fileName}</p>
                      </div>
                      <GhostButton onClick={(e) => { e.stopPropagation(); handleSelectFile(); }} disabled={isValidating} className="shrink-0 text-xs">更换</GhostButton>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="text-2xl">📁</div>
                      <span className="text-xs text-zinc-500">点击或拖拽文件 A</span>
                    </div>
                  )}
                </div>
                {/* Sheet 选择器 A */}
                {selectedFile && sheets1.length > 0 && (
                  <div className="relative">
                    <label className="text-xs text-zinc-500 mb-1 block">工作表 A</label>
                    <select
                      value={selectedSheet1 || ''}
                      onChange={(e) => setSelectedSheet1(e.target.value)}
                      disabled={isValidating || loadingSheets1}
                      className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-md p-2 disabled:opacity-50"
                    >
                      {sheets1.map((s) => (
                        <option key={s.name} value={s.name}>{s.name} {s.hasData ? '' : '(空)'}</option>
                      ))}
                    </select>
                  </div>
                )}
                {loadingSheets1 && <p className="text-xs text-zinc-400">加载工作表...</p>}
              </div>

              {/* 文件 B */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-500">文件 B</label>
                <div 
                  className={`flex flex-col gap-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 border-zinc-300 hover:border-zinc-400 cursor-pointer ${isValidating ? 'opacity-50 pointer-events-none' : ''}`}
                  onDragEnter={handleDragEnter2}
                  onDragLeave={handleDragLeave2}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop2}
                  onClick={handleSelectFile2}
                >
                  {selectedFile2 ? (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">📄</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{fileName2}</p>
                      </div>
                      <GhostButton onClick={(e) => { e.stopPropagation(); handleSelectFile2(); }} disabled={isValidating} className="shrink-0 text-xs">更换</GhostButton>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="text-2xl">📁</div>
                      <span className="text-xs text-zinc-500">点击或拖拽文件 B</span>
                    </div>
                  )}
                </div>
                {/* Sheet 选择器 B */}
                {selectedFile2 && sheets2.length > 0 && (
                  <div className="relative">
                    <label className="text-xs text-zinc-500 mb-1 block">工作表 B</label>
                    <select
                      value={selectedSheet2 || ''}
                      onChange={(e) => setSelectedSheet2(e.target.value)}
                      disabled={isValidating || loadingSheets2}
                      className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-md p-2 disabled:opacity-50"
                    >
                      {sheets2.map((s) => (
                        <option key={s.name} value={s.name}>{s.name} {s.hasData ? '' : '(空)'}</option>
                      ))}
                    </select>
                  </div>
                )}
                {loadingSheets2 && <p className="text-xs text-zinc-400">加载工作表...</p>}
              </div>
            </div>
          ) : (
            /* 普通模式 - 单文件上传 */
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
          )}
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
      {(selectedFile || (isMergeMode && selectedFile2)) && !result?.needSheetSelection && (
        <div className="flex flex-col gap-4">
          {!isValidating ? (
            <button 
              onClick={handleValidate}
              disabled={!canStartValidation}
              className={`w-full py-3 rounded-lg font-medium shadow-lg transition-all ${
                canStartValidation 
                  ? 'bg-black text-white shadow-zinc-900/10 hover:shadow-zinc-900/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isMergeMode 
                ? (result ? "重新合并审核" : (canStartValidation ? "开始合并审核" : "请选择两个文件和工作表"))
                : (result ? "重新审核" : "开始审核")
              }
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
            fileName={isMergeMode ? `${fileName} + ${fileName2}` : fileName}
            isMergeMode={isMergeMode}
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

import { useState } from "react";
import { GhostButton, OutlineButton } from "./UI/Buttons";

// 类型定义
interface SheetChange {
  type: "added" | "deleted" | "renamed";
  oldName?: string;
  newName?: string;
  sheetName: string;
}

interface CellChange {
  sheet: string;
  cell: string;
  row: number;
  column: string;
  oldValue: any;
  newValue: any;
  changeType: "value" | "formula" | "both";
}

interface ComparisonResult {
  sheetChanges: SheetChange[];
  cellChanges: CellChange[];
  summary: {
    totalChanges: number;
    sheetsAdded: number;
    sheetsDeleted: number;
    sheetsRenamed: number;
    cellsChanged: number;
  };
}

interface ExcelComparisonProps {
  onClose?: () => void;
}

export function ExcelComparison({ onClose }: ExcelComparisonProps) {
  const [beforeFile, setBeforeFile] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [progress, setProgress] = useState<{
    progress: number;
    message: string;
  } | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "sheets" | "cells">(
    "summary"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 选择比较前文件
  const handleSelectBefore = async () => {
    const filePath = await window.electron.selectFile();
    if (filePath) {
      setBeforeFile(filePath);
      setResult(null);
      setError(null);
    }
  };

  // 选择比较后文件
  const handleSelectAfter = async () => {
    const filePath = await window.electron.selectFile();
    if (filePath) {
      setAfterFile(filePath);
      setResult(null);
      setError(null);
    }
  };

  // 开始比较
  const handleCompare = async () => {
    if (!beforeFile || !afterFile) return;

    setIsComparing(true);
    setProgress({ progress: 0, message: "开始比较..." });
    setError(null);

    try {
      // 监听进度
      window.electron.onProgress?.((data) => {
        setProgress(data);
      });

      const comparisonResult = await window.electron.compareExcel?.(
        beforeFile,
        afterFile
      );

      window.electron.removeProgressListener?.();
      setResult(comparisonResult);
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "比较失败");
    } finally {
      setIsComparing(false);
    }
  };

  // 导出比较报告
  const handleExport = async () => {
    if (!result || !beforeFile) return;

    try {
      await window.electron.exportComparisonResult?.(beforeFile, result);
    } catch (err) {
      console.error("导出失败:", err);
    }
  };

  // 获取文件名
  const getFileName = (path: string | null) =>
    path ? path.split("/").pop() : null;

  // 渲染摘要
  const renderSummary = () => {
    if (!result) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg text-center">
          <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">总变更数</span>
          <span className="block text-2xl font-bold text-blue-700">{result.summary.totalChanges}</span>
        </div>
        <div className="bg-green-50/50 border border-green-100 p-4 rounded-lg text-center">
          <span className="block text-xs font-bold text-green-500 uppercase tracking-wider mb-1">工作表新增</span>
          <span className="block text-2xl font-bold text-green-700">{result.summary.sheetsAdded}</span>
        </div>
        <div className="bg-red-50/50 border border-red-100 p-4 rounded-lg text-center">
          <span className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-1">工作表删除</span>
          <span className="block text-2xl font-bold text-red-700">{result.summary.sheetsDeleted}</span>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg text-center">
          <span className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">工作表重命名</span>
          <span className="block text-2xl font-bold text-amber-700">{result.summary.sheetsRenamed}</span>
        </div>
        <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-lg text-center">
          <span className="block text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">单元格变更</span>
          <span className="block text-2xl font-bold text-purple-700">{result.summary.cellsChanged}</span>
        </div>
      </div>
    );
  };

  // 渲染工作表变更
  const renderSheetChanges = () => {
    if (!result || result.sheetChanges.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg">
          <div className="text-2xl mb-2">🤷‍♂️</div>
          <p>没有检测到工作表变更</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden border border-zinc-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-50">
            <tr>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-32">变更类型</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200">原名称</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200">新名称</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm font-mono">
            {result.sheetChanges.map((change, idx) => (
              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                    change.type === 'added' ? 'bg-green-50 text-green-700 border-green-100' :
                    change.type === 'deleted' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {change.type === "added"
                      ? "新增"
                      : change.type === "deleted"
                      ? "删除"
                      : "重命名"}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">{change.oldName || <span className="text-zinc-300">-</span>}</td>
                <td className="py-3 px-4 text-zinc-600">{change.newName || <span className="text-zinc-300">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染单元格变更
  const renderCellChanges = () => {
    if (!result || result.cellChanges.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg">
          <div className="text-2xl mb-2">🤷‍♂️</div>
          <p>没有检测到单元格变更</p>
        </div>
      );
    }

    const totalPages = Math.ceil(result.cellChanges.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedChanges = result.cellChanges.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-32">工作表</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-24">单元格</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-24">类型</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-1/3">原值</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-200 w-1/3">新值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm font-mono">
              {paginatedChanges.map((change, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 px-4 text-zinc-900 font-medium">{change.sheet}</td>
                  <td className="py-3 px-4 text-zinc-500">{change.cell}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      change.changeType === 'both' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      change.changeType === 'formula' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}>
                      {change.changeType === "both"
                        ? "值+公式"
                        : change.changeType === "formula"
                        ? "公式"
                        : "值"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="p-1 px-2 bg-red-50/50 text-red-700 rounded border border-red-100/50 break-words text-xs">
                       {String(change.oldValue ?? "")}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="p-1 px-2 bg-green-50/50 text-green-700 rounded border border-green-100/50 break-words text-xs">
                      {String(change.newValue ?? "")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-400">
              显示 {startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, result.cellChanges.length)}{" "}
              条，共 {result.cellChanges.length} 条
            </span>
            <div className="flex gap-2">
              <OutlineButton
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 py-0 text-xs"
              >
                上一页
              </OutlineButton>
              <span className="text-xs text-zinc-500 self-center">
                {currentPage} / {totalPages}
              </span>
              <OutlineButton
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8 px-3 py-0 text-xs"
              >
                下一页
              </OutlineButton>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 无变更提示
  if (result && result.summary.totalChanges === 0) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>📊</span> 文件比较
          </h2>
          {onClose && <OutlineButton onClick={onClose} className="h-8 text-xs">返回</OutlineButton>}
        </div>
        <div className="bg-green-50 rounded-lg p-12 text-center border border-green-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✅
          </div>
          <h3 className="text-lg font-bold text-green-900 mb-2">未检测到变更</h3>
          <p className="text-green-700">两个 Excel 文件的内容完全相同，没有发现任何差异。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <span>📊</span> 文件比较
        </h2>
        {onClose && (
          <OutlineButton onClick={onClose} className="h-8 text-xs">
            返回
          </OutlineButton>
        )}
      </div>

      {/* 文件选择区域 */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
        {/* 左侧文件 */}
        <div className={`
          border-2 rounded-lg p-6 text-center transition-colors
          ${beforeFile ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100/50'}
        `}>
          <div className="mb-3">
            <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">改动前</span>
          </div>
          {beforeFile ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📄</span>
              <span className="text-sm font-medium text-zinc-900 break-all">{getFileName(beforeFile)}</span>
              <button 
                onClick={handleSelectBefore}
                disabled={isComparing} 
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                更换
              </button>
            </div>
          ) : (
            <GhostButton onClick={handleSelectBefore} disabled={isComparing} className="mx-auto">
              选择文件
            </GhostButton>
          )}
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
            VS
          </div>
        </div>

        {/* 右侧文件 */}
        <div className={`
          border-2 rounded-lg p-6 text-center transition-colors
          ${afterFile ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100/50'}
        `}>
          <div className="mb-3">
            <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">改动后</span>
          </div>
          {afterFile ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📝</span>
              <span className="text-sm font-medium text-zinc-900 break-all">{getFileName(afterFile)}</span>
              <button 
                onClick={handleSelectAfter}
                disabled={isComparing} 
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                更换
              </button>
            </div>
          ) : (
            <GhostButton onClick={handleSelectAfter} disabled={isComparing} className="mx-auto">
              选择文件
            </GhostButton>
          )}
        </div>
      </div>

      {/* 比较按钮 */}
      <div className="flex flex-col items-center justify-center py-4">
        {!isComparing ? (
          <button
            className="px-8 py-3 bg-black text-white rounded-lg font-medium shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            onClick={handleCompare}
            disabled={!beforeFile || !afterFile}
          >
            🔍 开始比较
          </button>
        ) : (
          <div className="w-full max-w-md bg-zinc-50 rounded-lg p-4 border border-zinc-100">
            <div className="flex justify-between text-xs font-medium text-zinc-500 mb-2">
              <span>{progress?.message}</span>
              <span>{progress?.progress}%</span>
            </div>
            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300 ease-out"
                style={{ width: `${progress?.progress || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-md p-4 flex items-center gap-3">
          <span className="text-red-500">❌</span>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* 比较结果 */}
      {result && result.summary.totalChanges > 0 && (
        <div className="space-y-6 pt-6 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
              <button
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === "summary"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                总结
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === "sheets"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
                onClick={() => {
                  setActiveTab("sheets");
                  setCurrentPage(1);
                }}
              >
                工作表 {result.sheetChanges.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-zinc-200 rounded-full text-[10px]">{result.sheetChanges.length}</span>}
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === "cells"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
                onClick={() => {
                  setActiveTab("cells");
                  setCurrentPage(1);
                }}
              >
                单元格 {result.cellChanges.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-zinc-200 rounded-full text-[10px]">{result.cellChanges.length}</span>}
              </button>
            </div>

            <GhostButton onClick={handleExport} className="h-8 text-xs border border-zinc-200">
              📥 导出报告
            </GhostButton>
          </div>

          {/* 标签内容 */}
          <div className="animate-fade-in">
            {activeTab === "summary" && renderSummary()}
            {activeTab === "sheets" && renderSheetChanges()}
            {activeTab === "cells" && renderCellChanges()}
          </div>
        </div>
      )}
    </div>
  );
}

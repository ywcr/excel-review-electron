import React, { useEffect, useState } from 'react';
import {
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  ClockIcon,
  FileTextIcon,
  XCircleIcon,
  CheckCircleIcon,
  AlertTriangleIcon
} from './UI/Icons';
import { GhostButton } from './UI/Buttons';
import { ValidationError, ImageValidationError, ValidationResult } from '../../shared/types';
import { ValidationResults } from './ValidationResults';
// Since we can't easily import from shared in frontend without alias setup, let's redefine partial types or just use any if needed,
// BUT we defined HistoryRecord locally before. Let's start by updating imports.
// Actually the previous file didn't import form shared. It defined HistoryRecord locally.
// Let's import types if possible, or redefine locally matching the shared one.
// The file usage shows we can just redefine locally for now to avoid build issues if paths are tricky.

interface HistoryRecord {
  id: string;
  fileName: string;
  filePath: string;
  taskName: string;
  timestamp: number;
  summary: {
    totalRows: number;
    errorCount: number;
    imageErrorCount: number;
  };
  isValid: boolean;
  previewErrors?: ValidationError[];
  previewImageErrors?: ImageValidationError[];
  hasDetail?: boolean;
}

export function ValidationHistory({ onSelect }: { onSelect?: (record: HistoryRecord) => void }) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ValidationResult>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [fullReportResult, setFullReportResult] = useState<{ record: HistoryRecord, result: ValidationResult } | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const records = await window.electron.getHistory();
      setHistory(records);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    if (details[id] || loadingDetail === id) return;
    
    try {
      setLoadingDetail(id);
      const result = await window.electron.getHistoryDetail(id);
      if (result) {
        setDetails(prev => ({
          ...prev,
          [id]: result
        }));
      }
    } catch (error) {
      console.error('Failed to load history detail:', error);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleOpenFullReport = (record: HistoryRecord) => {
    const detail = details[record.id];
    if (detail) {
      setFullReportResult({ record, result: detail });
    } else if (record.hasDetail) {
      // 如果还没加载，先加载
      loadDetail(record.id).then(() => {
        window.electron.getHistoryDetail(record.id).then(res => {
          if (res) {
            setFullReportResult({ record, result: res });
            setDetails(prev => ({ ...prev, [record.id]: res }));
          }
        });
      });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条历史记录吗？')) {
      const success = await window.electron.deleteHistory(id);
      if (success) {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      const success = await window.electron.clearHistory();
      if (success) {
        setHistory([]);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">加载历史记录...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClockIcon size={20} className="text-zinc-900" />
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">验证历史</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
               最近 {history.length} 条记录
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <GhostButton
            onClick={handleClearAll}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <TrashIcon size={16} className="mr-2" />
            清空历史
          </GhostButton>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <ClockIcon size={32} className="text-zinc-300" />
            </div>
            <p className="font-medium text-zinc-500">暂无验证历史</p>
            <p className="text-sm mt-1">验证完成的文件会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {history.map((record) => {
              return (
                <div
                  key={record.id}
                  className="bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
                  onClick={() => handleOpenFullReport(record)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        record.isValid
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {record.isValid ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-zinc-800 flex items-center gap-2 truncate">
                           <span className="truncate" title={record.fileName}>{record.fileName}</span>
                           <span className="text-xs font-normal px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full whitespace-nowrap">
                             {record.taskName}
                           </span>
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                            <span>{formatDate(record.timestamp)}</span>
                          </p>

                          {/* Summary Badges */}
                          <div className="flex items-center gap-3">
                             {!record.isValid && (
                              <>
                                {record.summary.errorCount > 0 && (
                                  <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                    {record.summary.errorCount} 处数据错误
                                  </span>
                                )}
                                {record.summary.imageErrorCount > 0 && (
                                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                    {record.summary.imageErrorCount} 张异常图片
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                       {/* Loading Indicator for specific item */}
                       {loadingDetail === record.id && (
                         <div className="text-zinc-400 animate-spin mr-2">
                           <ClockIcon size={16} />
                         </div>
                       )}
                       
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(e, record.id)}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="删除记录"
                      >
                        <TrashIcon size={18} />
                      </button>
                      
                       {/* Chevron Right to indicate clickable */}
                       <div className="text-zinc-300 group-hover:text-zinc-400 transition-colors">
                         <ChevronDownIcon size={20} className="-rotate-90" />
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Report Modal */}
      {fullReportResult && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setFullReportResult(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <FileTextIcon size={24} className="text-zinc-400" />
                <div>
                   <h3 className="font-semibold text-zinc-900">{fullReportResult.record.fileName}</h3>
                   <p className="text-xs text-zinc-500 font-mono">
                     {fullReportResult.record.taskName} · {formatDate(fullReportResult.record.timestamp)}
                   </p>
                </div>
              </div>
              <button
                onClick={() => setFullReportResult(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200/50 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <ValidationResults
                result={fullReportResult.result}
                taskName={fullReportResult.record.taskName}
                fileName={fullReportResult.record.fileName}
                isMergeMode={!!fullReportResult.result.mergeStats}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

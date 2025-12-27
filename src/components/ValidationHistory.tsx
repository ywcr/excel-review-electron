import React, { useEffect, useState } from 'react';
import { 
  ClockIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  FileTextIcon,
  AlertTriangleIcon
} from './UI/Icons';
import { GhostButton } from './UI/Buttons';

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
}

export function ValidationHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (confirm('确定要删除这条记录吗？')) {
        await window.electron.deleteHistory(id);
        await loadHistory();
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      try {
        await window.electron.clearHistory();
        await loadHistory();
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        <ClockIcon className="w-6 h-6 animate-pulse mr-2" />
        加载中...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <ClockIcon size={32} className="text-zinc-300" />
        </div>
        <p className="font-medium text-zinc-500">暂无验证历史</p>
        <p className="text-sm mt-1">验证完成的文件会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ClockIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">验证历史</h2>
            <p className="text-xs text-zinc-500">
              共保存 {history.length} 条记录
            </p>
          </div>
        </div>
        <GhostButton 
          onClick={handleClearAll}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <TrashIcon size={16} className="mr-2" />
          清空历史
        </GhostButton>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4 max-w-4xl mx-auto">
          {history.map((record) => (
            <div 
              key={record.id}
              className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-md transition-shadow group relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    record.isValid 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {record.isValid ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                       {record.fileName}
                       <span className="text-xs font-normal px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">
                         {record.taskName}
                       </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-4">
                      <span>{formatDate(record.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono">{record.filePath}</span>
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <span className="text-zinc-400">总行数:</span>
                        <span className="font-mono font-medium">{record.summary.totalRows}</span>
                      </div>
                      
                      {!record.isValid && (
                        <>
                          {record.summary.errorCount > 0 && (
                            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              <span className="text-xs">数据错误:</span>
                              <span className="font-mono font-bold">{record.summary.errorCount}</span>
                            </div>
                          )}
                          {record.summary.imageErrorCount > 0 && (
                            <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              <span className="text-xs">图片问题:</span>
                              <span className="font-mono font-bold">{record.summary.imageErrorCount}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(record.id, e)}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="删除记录"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { ValidationResults } from "./ValidationResults";
import { GhostButton, OutlineButton } from "./UI/Buttons";
import { AddTaskModal } from "./UI/AddTaskModal";
import { 
  FolderIcon, 
  FileTextIcon, 
  TrashIcon, 
  PlayIcon, 
  StopIcon, 
  DownloadIcon, 
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon
} from "./UI/Icons";

// 上传的文件
interface UploadedFile {
  id: string;
  filePath: string;
  fileName: string;
}

// 审核任务（一个文件可有多个任务）
interface ReviewTask {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  status: "pending" | "validating" | "completed" | "error";
  result?: any;
  error?: string;
  progress?: number;
}

interface BatchValidationProps {
  availableTasks: string[];
  defaultTask?: string;
  onClose?: () => void;
}

export function BatchValidation({
  availableTasks,
  defaultTask = "药店拜访",
  onClose,
}: BatchValidationProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ReviewTask | null>(null);
  const [addTaskFor, setAddTaskFor] = useState<UploadedFile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 选择多个文件
  const handleSelectFiles = async () => {
    try {
      const filePaths = await window.electron.selectMultipleFiles?.();
      if (!filePaths || filePaths.length === 0) return;

      const newFiles: UploadedFile[] = filePaths
        .filter((fp: string) => !files.some((f) => f.filePath === fp)) // 去重
        .map((filePath: string) => ({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          filePath,
          fileName: filePath.split("/").pop() || filePath,
        }));

      setFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error("选择文件失败:", err);
    }
  };

  // 删除文件（同时删除关联的任务）
  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setTasks((prev) => prev.filter((t) => t.fileId !== fileId));
  };

  // 添加任务
  const handleAddTask = (taskType: string, sheetName: string) => {
    if (!addTaskFor) return;

    const newTask: ReviewTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileId: addTaskFor.id,
      filePath: addTaskFor.filePath,
      fileName: addTaskFor.fileName,
      taskType,
      sheetName,
      status: "pending",
    };

    setTasks((prev) => [...prev, newTask]);
    setAddTaskFor(null);
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // 开始批量验证
  const startBatchValidation = async () => {
    const pendingTasks = tasks.filter((t) => t.status === "pending");
    if (pendingTasks.length === 0) return;

    setIsValidating(true);
    abortControllerRef.current = new AbortController();

    for (const task of pendingTasks) {
      if (abortControllerRef.current?.signal.aborted) break;

      // 更新状态为验证中
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: "validating", progress: 0 } : t
        )
      );

      try {
        // 监听进度
        window.electron.onProgress?.((data) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, progress: data.progress } : t
            )
          );
        });

        const result = await window.electron.validateExcel(
          task.filePath,
          task.taskType,
          task.sheetName
        );

        window.electron.removeProgressListener?.();

        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "completed", result, progress: 100 }
              : t
          )
        );
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: "error",
                  error: err instanceof Error ? err.message : "验证失败",
                }
              : t
          )
        );
      }
    }

    setIsValidating(false);
  };

  // 取消验证
  const cancelValidation = () => {
    abortControllerRef.current?.abort();
    window.electron.cancelValidation?.();
    setIsValidating(false);
  };

  // 导出所有结果
  const exportAllResults = async () => {
    const completedTasks = tasks.filter((t) => t.status === "completed");
    if (completedTasks.length === 0) return;

    for (const task of completedTasks) {
      try {
        await window.electron.exportValidationResult(
          task.filePath,
          task.taskType,
          task.result
        );
      } catch (err) {
        console.error(`导出 ${task.fileName} 失败:`, err);
      }
    }
  };

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "待验证";
      case "validating":
        return "验证中";
      case "completed":
        return "已完成";
      case "error":
        return "失败";
      default:
        return status;
    }
  };

  // 统计
  const stats = {
    files: files.length,
    tasks: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    passed: tasks.filter((t) => t.result?.isValid).length,
    failed: tasks.filter((t) => t.result && !t.result.isValid).length,
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <FolderIcon size={24} className="text-zinc-900" /> 批量文件验证
        </h2>
        {onClose && (
          <OutlineButton onClick={onClose} className="text-xs h-8">
            返回单文件模式
          </OutlineButton>
        )}
      </div>

      {/* ===== 第一步：文件上传 ===== */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center">1</span>
            上传文件
          </h3>
          <GhostButton
            onClick={handleSelectFiles}
            disabled={isValidating}
            className="h-8 text-xs border border-zinc-200 flex items-center gap-1"
          >
            <PlusIcon size={14} /> 选择 Excel 文件
          </GhostButton>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <p>尚未上传任何文件</p>
            <p className="text-xs mt-1">点击上方按钮选择 Excel 文件</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const fileTasks = tasks.filter((t) => t.fileId === file.id);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100 rounded-lg group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileTextIcon size={20} className="text-zinc-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate" title={file.filePath}>
                        {file.fileName}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {fileTasks.length} 个任务
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddTaskFor(file)}
                      disabled={isValidating}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      <PlusIcon size={12} /> 任务
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={isValidating}
                      className="text-xs text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== 第二步：任务列表 ===== */}
      {tasks.length > 0 && (
        <section className="bg-white border border-zinc-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center">2</span>
              审核任务 ({tasks.length})
            </h3>
            <div className="flex items-center gap-3">
              {!isValidating ? (
                <>
                  <button
                    className="h-8 px-4 bg-black text-white text-xs font-medium rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                    onClick={startBatchValidation}
                    disabled={stats.pending === 0}
                  >
                    <PlayIcon size={12} /> 开始验证
                  </button>
                  {stats.completed > 0 && (
                    <OutlineButton onClick={exportAllResults} className="h-8 text-xs flex items-center gap-2">
                      <DownloadIcon size={12} /> 导出全部
                    </OutlineButton>
                  )}
                </>
              ) : (
                <button
                  className="h-8 px-4 bg-red-50 text-red-600 border border-red-100 text-xs font-medium rounded hover:bg-red-100 transition-colors flex items-center gap-2"
                  onClick={cancelValidation}
                >
                  <StopIcon size={12} /> 取消验证
                </button>
              )}
            </div>
          </div>

          {/* 状态统计 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
              <div className="text-xs font-bold text-zinc-500 uppercase">待验证</div>
              <div className="text-xl font-bold text-zinc-700">{stats.pending}</div>
            </div>
            <div className="bg-blue-50/50 p-3 rounded border border-blue-100/50">
              <div className="text-xs font-bold text-blue-500 uppercase">已完成</div>
              <div className="text-xl font-bold text-blue-700">{stats.completed}</div>
            </div>
            <div className="bg-green-50/50 p-3 rounded border border-green-100/50">
              <div className="text-xs font-bold text-green-500 uppercase">通过</div>
              <div className="text-xl font-bold text-green-700">{stats.passed}</div>
            </div>
            <div className="bg-red-50/50 p-3 rounded border border-red-100/50">
              <div className="text-xs font-bold text-red-500 uppercase">未通过</div>
              <div className="text-xl font-bold text-red-700">{stats.failed}</div>
            </div>
          </div>

          {/* 任务表格 */}
          <div className="overflow-x-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50/50">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-12">#</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase">文件名</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-32">工作表</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-32">任务类型</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-28">状态</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-36">结果</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase w-20 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tasks.map((task, idx) => (
                  <tr key={task.id} className="group hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 text-xs text-zinc-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-zinc-900 font-medium truncate max-w-[180px] block" title={task.filePath}>
                        {task.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-600 font-mono">{task.sheetName}</td>
                    <td className="py-3 px-4 text-sm text-zinc-600">{task.taskType}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                        task.status === 'pending' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                        task.status === 'validating' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        task.status === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {task.status === 'validating' && <LoaderIcon size={12} className="mr-1 animate-spin" />}
                        {getStatusLabel(task.status)}
                      </span>
                      {task.status === "validating" && task.progress !== undefined && (
                        <div className="w-full h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {task.result ? (
                        task.result.isValid ? (
                          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                            <CheckCircleIcon size={12} /> 通过
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {task.result.summary.errorCount > 0 && (
                              <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                <XCircleIcon size={12} /> {task.result.summary.errorCount} 个数据错误
                              </span>
                            )}
                            {(task.result.imageErrors?.length || 0) > 0 && (
                              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                <XCircleIcon size={12} /> {task.result.imageErrors.length} 个图片问题
                              </span>
                            )}
                            {task.result.summary.errorCount === 0 && (task.result.imageErrors?.length || 0) === 0 && (
                              <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                <XCircleIcon size={12} /> 未通过
                              </span>
                            )}
                          </div>
                        )
                      ) : task.error ? (
                        <span className="text-xs text-red-500 truncate max-w-[100px] block" title={task.error}>{task.error}</span>
                      ) : (
                        <span className="text-xs text-zinc-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.status === "completed" && (
                          <button
                            className="text-xs text-blue-600 hover:underline font-medium"
                            onClick={() => setSelectedResult(task)}
                          >
                            查看
                          </button>
                        )}
                        {task.status !== "validating" && (
                          <button
                            className="text-xs text-zinc-400 hover:text-red-500"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <XCircleIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 添加任务弹窗 */}
      <AddTaskModal
        isOpen={!!addTaskFor}
        fileName={addTaskFor?.fileName || ""}
        filePath={addTaskFor?.filePath || ""}
        availableTasks={availableTasks}
        onSubmit={handleAddTask}
        onCancel={() => setAddTaskFor(null)}
      />

      {/* 结果详情模态框 */}
      {selectedResult && selectedResult.result && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <FileTextIcon size={24} className="text-zinc-400" />
                <div>
                  <h3 className="font-semibold text-zinc-900">{selectedResult.fileName}</h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {selectedResult.sheetName} · {selectedResult.taskType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200/50 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <ValidationResults
                result={selectedResult.result}
                taskName={selectedResult.taskType}
                fileName={selectedResult.fileName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

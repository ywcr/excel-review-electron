import { useState, useRef } from "react";
import { ValidationResults } from "./ValidationResults";
import "./BatchValidation.css";

interface BatchFile {
  id: string;
  filePath: string;
  fileName: string;
  taskName: string;
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
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedResult, setSelectedResult] = useState<BatchFile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 选择多个文件
  const handleSelectFiles = async () => {
    try {
      const filePaths = await window.electron.selectMultipleFiles?.();
      if (!filePaths || filePaths.length === 0) return;

      const newFiles: BatchFile[] = filePaths.map((filePath: string) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filePath,
        fileName: filePath.split("/").pop() || filePath,
        taskName: defaultTask,
        status: "pending" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error("选择文件失败:", err);
    }
  };

  // 更新文件任务类型
  const updateFileTask = (fileId: string, taskName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, taskName } : f))
    );
  };

  // 移除文件
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // 开始批量验证
  const startBatchValidation = async () => {
    if (files.length === 0) return;

    setIsValidating(true);
    abortControllerRef.current = new AbortController();

    for (const file of files) {
      if (abortControllerRef.current?.signal.aborted) break;

      // 更新状态为验证中
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "validating", progress: 0 } : f
        )
      );

      try {
        // 监听进度
        window.electron.onProgress?.((data) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: data.progress } : f
            )
          );
        });

        const result = await window.electron.validateExcel(
          file.filePath,
          file.taskName
        );

        window.electron.removeProgressListener?.();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "completed", result, progress: 100 }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "验证失败",
                }
              : f
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
    const completedFiles = files.filter((f) => f.status === "completed");
    if (completedFiles.length === 0) return;

    for (const file of completedFiles) {
      try {
        await window.electron.exportValidationResult(
          file.filePath,
          file.taskName,
          file.result
        );
      } catch (err) {
        console.error(`导出 ${file.fileName} 失败:`, err);
      }
    }
  };

  // 获取状态样式
  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "validating":
        return "status-validating";
      case "completed":
        return "status-completed";
      case "error":
        return "status-error";
      default:
        return "";
    }
  };

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
    total: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    completed: files.filter((f) => f.status === "completed").length,
    error: files.filter((f) => f.status === "error").length,
    passed: files.filter((f) => f.result?.isValid).length,
    failed: files.filter((f) => f.result && !f.result.isValid).length,
  };

  return (
    <div className="batch-validation">
      <div className="batch-header">
        <h2>📁 批量文件验证</h2>
        {onClose && (
          <button className="btn-close" onClick={onClose}>
            返回单文件模式
          </button>
        )}
      </div>

      {/* 文件选择区域 */}
      <div className="file-select-area">
        <button
          className="btn-select-files"
          onClick={handleSelectFiles}
          disabled={isValidating}
        >
          ➕ 添加文件
        </button>
        <span className="file-hint">支持选择多个 Excel 文件 (.xlsx, .xls)</span>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="file-list-section">
          <div className="file-list-header">
            <span>已添加 {files.length} 个文件</span>
            <button
              className="btn-clear"
              onClick={() => setFiles([])}
              disabled={isValidating}
            >
              清空列表
            </button>
          </div>

          <div className="file-list">
            {files.map((file) => (
              <div
                key={file.id}
                className={`file-item ${getStatusClass(file.status)}`}
              >
                <div className="file-info">
                  <span className="file-name" title={file.filePath}>
                    📄 {file.fileName}
                  </span>
                  <select
                    value={file.taskName}
                    onChange={(e) => updateFileTask(file.id, e.target.value)}
                    disabled={isValidating || file.status !== "pending"}
                    className="task-select"
                  >
                    {availableTasks.map((task) => (
                      <option key={task} value={task}>
                        {task}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="file-status">
                  {file.status === "validating" &&
                    file.progress !== undefined && (
                      <div className="mini-progress">
                        <div
                          className="mini-progress-fill"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  <span className={`status-badge ${file.status}`}>
                    {getStatusLabel(file.status)}
                  </span>
                  {file.result && (
                    <span
                      className={`result-badge ${
                        file.result.isValid ? "pass" : "fail"
                      }`}
                    >
                      {file.result.isValid
                        ? "✅通过"
                        : `❌${file.result.summary.errorCount}个错误`}
                    </span>
                  )}
                </div>

                <div className="file-actions">
                  {file.status === "completed" && (
                    <button
                      className="btn-view"
                      onClick={() => setSelectedResult(file)}
                    >
                      查看
                    </button>
                  )}
                  {file.status !== "validating" && (
                    <button
                      className="btn-remove"
                      onClick={() => removeFile(file.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计和操作 */}
      {files.length > 0 && (
        <div className="batch-footer">
          <div className="batch-stats">
            <span>总计: {stats.total}</span>
            <span className="stat-pending">待验证: {stats.pending}</span>
            <span className="stat-completed">已完成: {stats.completed}</span>
            {stats.passed > 0 && (
              <span className="stat-pass">通过: {stats.passed}</span>
            )}
            {stats.failed > 0 && (
              <span className="stat-fail">未通过: {stats.failed}</span>
            )}
            {stats.error > 0 && (
              <span className="stat-error">失败: {stats.error}</span>
            )}
          </div>

          <div className="batch-actions">
            {!isValidating ? (
              <>
                <button
                  className="btn-start"
                  onClick={startBatchValidation}
                  disabled={stats.pending === 0}
                >
                  ▶️ 开始验证
                </button>
                {stats.completed > 0 && (
                  <button className="btn-export" onClick={exportAllResults}>
                    📥 导出全部
                  </button>
                )}
              </>
            ) : (
              <button className="btn-cancel" onClick={cancelValidation}>
                ⏹️ 取消验证
              </button>
            )}
          </div>
        </div>
      )}

      {/* 结果详情模态框 */}
      {selectedResult && selectedResult.result && (
        <div
          className="result-modal-overlay"
          onClick={() => setSelectedResult(null)}
        >
          <div className="result-modal" onClick={(e) => e.stopPropagation()}>
            <div className="result-modal-header">
              <h3>{selectedResult.fileName}</h3>
              <button onClick={() => setSelectedResult(null)}>✕</button>
            </div>
            <div className="result-modal-body">
              <ValidationResults
                result={selectedResult.result}
                taskName={selectedResult.taskName}
                fileName={selectedResult.fileName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

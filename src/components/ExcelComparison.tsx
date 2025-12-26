import { useState } from "react";
import "./ExcelComparison.css";

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
      <div className="summary-grid">
        <div className="stat-card blue">
          <span className="stat-label">总变更数</span>
          <span className="stat-value">{result.summary.totalChanges}</span>
        </div>
        <div className="stat-card green">
          <span className="stat-label">工作表新增</span>
          <span className="stat-value">{result.summary.sheetsAdded}</span>
        </div>
        <div className="stat-card red">
          <span className="stat-label">工作表删除</span>
          <span className="stat-value">{result.summary.sheetsDeleted}</span>
        </div>
        <div className="stat-card yellow">
          <span className="stat-label">工作表重命名</span>
          <span className="stat-value">{result.summary.sheetsRenamed}</span>
        </div>
        <div className="stat-card purple">
          <span className="stat-label">单元格变更</span>
          <span className="stat-value">{result.summary.cellsChanged}</span>
        </div>
      </div>
    );
  };

  // 渲染工作表变更
  const renderSheetChanges = () => {
    if (!result || result.sheetChanges.length === 0) {
      return <div className="empty-state">没有工作表变更</div>;
    }

    return (
      <table className="comparison-table">
        <thead>
          <tr>
            <th>变更类型</th>
            <th>原名称</th>
            <th>新名称</th>
          </tr>
        </thead>
        <tbody>
          {result.sheetChanges.map((change, idx) => (
            <tr key={idx}>
              <td>
                <span className={`change-badge ${change.type}`}>
                  {change.type === "added"
                    ? "新增"
                    : change.type === "deleted"
                    ? "删除"
                    : "重命名"}
                </span>
              </td>
              <td>{change.oldName || "-"}</td>
              <td>{change.newName || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // 渲染单元格变更
  const renderCellChanges = () => {
    if (!result || result.cellChanges.length === 0) {
      return <div className="empty-state">没有单元格变更</div>;
    }

    const totalPages = Math.ceil(result.cellChanges.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedChanges = result.cellChanges.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return (
      <div className="cell-changes">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>工作表</th>
              <th>单元格</th>
              <th>类型</th>
              <th>原值</th>
              <th>新值</th>
            </tr>
          </thead>
          <tbody>
            {paginatedChanges.map((change, idx) => (
              <tr key={idx}>
                <td>{change.sheet}</td>
                <td className="cell-address">{change.cell}</td>
                <td>
                  <span className={`change-type ${change.changeType}`}>
                    {change.changeType === "both"
                      ? "值+公式"
                      : change.changeType === "formula"
                      ? "公式"
                      : "值"}
                  </span>
                </td>
                <td className="cell-value">{String(change.oldValue ?? "")}</td>
                <td className="cell-value">{String(change.newValue ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <span className="page-info">
              显示 {startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, result.cellChanges.length)}{" "}
              条，共 {result.cellChanges.length} 条
            </span>
            <div className="page-buttons">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 无变更提示
  if (result && result.summary.totalChanges === 0) {
    return (
      <div className="excel-comparison">
        <div className="comparison-header">
          <h2>📊 文件比较</h2>
          {onClose && <button onClick={onClose}>返回</button>}
        </div>
        <div className="no-changes">
          <span className="success-icon">✅</span>
          <h3>未检测到变更</h3>
          <p>两个 Excel 文件的内容完全相同，没有发现任何差异。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="excel-comparison">
      <div className="comparison-header">
        <h2>📊 文件比较</h2>
        {onClose && (
          <button className="btn-back" onClick={onClose}>
            返回
          </button>
        )}
      </div>

      {/* 文件选择区域 */}
      <div className="file-selection">
        <div className="file-slot">
          <h4>📄 比较前文件</h4>
          <button onClick={handleSelectBefore} disabled={isComparing}>
            选择文件
          </button>
          {beforeFile && (
            <span className="file-name">{getFileName(beforeFile)}</span>
          )}
        </div>

        <div className="vs-divider">VS</div>

        <div className="file-slot">
          <h4>📄 比较后文件</h4>
          <button onClick={handleSelectAfter} disabled={isComparing}>
            选择文件
          </button>
          {afterFile && (
            <span className="file-name">{getFileName(afterFile)}</span>
          )}
        </div>
      </div>

      {/* 比较按钮 */}
      <div className="compare-actions">
        {!isComparing ? (
          <button
            className="btn-compare"
            onClick={handleCompare}
            disabled={!beforeFile || !afterFile}
          >
            🔍 开始比较
          </button>
        ) : (
          <div className="compare-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress?.progress || 0}%` }}
              />
            </div>
            <span className="progress-text">{progress?.message}</span>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
        </div>
      )}

      {/* 比较结果 */}
      {result && result.summary.totalChanges > 0 && (
        <div className="comparison-results">
          <div className="results-header">
            <h3>比较结果</h3>
            <button className="btn-export" onClick={handleExport}>
              📥 导出报告
            </button>
          </div>

          {/* 标签页 */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              总结
              <span className="tab-count">{result.summary.totalChanges}</span>
            </button>
            <button
              className={`tab ${activeTab === "sheets" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("sheets");
                setCurrentPage(1);
              }}
            >
              工作表
              <span className="tab-count">{result.sheetChanges.length}</span>
            </button>
            <button
              className={`tab ${activeTab === "cells" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("cells");
                setCurrentPage(1);
              }}
            >
              单元格
              <span className="tab-count">{result.cellChanges.length}</span>
            </button>
          </div>

          {/* 标签内容 */}
          <div className="tab-content">
            {activeTab === "summary" && renderSummary()}
            {activeTab === "sheets" && renderSheetChanges()}
            {activeTab === "cells" && renderCellChanges()}
          </div>
        </div>
      )}
    </div>
  );
}

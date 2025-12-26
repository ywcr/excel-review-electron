import { useState } from "react";
import { useElectronValidation } from "./hooks/useElectronValidation";
import { ValidationResults } from "./components/ValidationResults";
import { BatchValidation } from "./components/BatchValidation";
import { ExcelComparison } from "./components/ExcelComparison";
import { PasscodeScreen } from "./components/PasscodeScreen";
import { TASK_TEMPLATES } from "../shared/validation-rules";
import "./styles/App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<"single" | "batch" | "compare">("single");
  const [selectedTask, setSelectedTask] = useState("药店拜访");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>(
    undefined
  );

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

  // 显示口令码验证界面
  if (!isAuthenticated) {
    return <PasscodeScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  const availableTasks = Object.keys(TASK_TEMPLATES);

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
    // 自动重新验证
    if (selectedFile) {
      await validateExcel(selectedFile, selectedTask, sheetName);
    }
  };

  // 导出验证结果到 Excel
  const handleExport = async () => {
    if (!result || !selectedFile) return;

    try {
      // 调用主进程的导出功能
      await window.electron.exportValidationResult(
        selectedFile,
        selectedTask,
        result
      );
    } catch (err) {
      console.error("导出失败:", err);
    }
  };

  // 获取文件名
  const fileName = selectedFile ? selectedFile.split("/").pop() : undefined;

  // 批量验证模式
  if (mode === "batch") {
    return (
      <div className="app">
        <header className="app-header">
          <h1>📊 Excel 审核系统</h1>
          <p>Electron 桌面版 - 批量验证模式</p>
        </header>

        <main className="app-main">
          <BatchValidation
            availableTasks={availableTasks}
            defaultTask={selectedTask}
            onClose={() => setMode("single")}
          />
        </main>
      </div>
    );
  }

  // 比较模式
  if (mode === "compare") {
    return (
      <div className="app">
        <header className="app-header">
          <h1>📊 Excel 审核系统</h1>
          <p>Electron 桌面版 - 文件比较模式</p>
        </header>

        <main className="app-main">
          <ExcelComparison onClose={() => setMode("single")} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 Excel 审核系统</h1>
        <p>Electron 桌面版 - 支持超大文件处理</p>
      </header>

      <main className="app-main">
        {/* 模式切换 */}
        <div className="mode-switch">
          <button className="mode-btn active">📄 单文件验证</button>
          <button className="mode-btn" onClick={() => setMode("batch")}>
            📁 批量验证
          </button>
          <button className="mode-btn" onClick={() => setMode("compare")}>
            📊 文件比较
          </button>
        </div>

        {/* 任务选择 */}
        <section className="section">
          <h2>1. 选择任务类型</h2>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            disabled={isValidating}
          >
            {availableTasks.map((task) => (
              <option key={task} value={task}>
                {task}
              </option>
            ))}
          </select>
        </section>

        {/* 文件选择 */}
        <section className="section">
          <h2>2. 选择 Excel 文件</h2>
          <button onClick={handleSelectFile} disabled={isValidating}>
            选择文件
          </button>
          {selectedFile && (
            <div className="file-info">
              <p>已选择: {fileName}</p>
              <small>{selectedFile}</small>
            </div>
          )}
        </section>

        {/* 工作表选择 - 当需要选择时显示 */}
        {result?.needSheetSelection && result.availableSheets && (
          <section className="section sheet-selection">
            <h2>3. 选择工作表</h2>
            <p className="info-text">
              未找到匹配"{selectedTask}"的工作表，请手动选择：
            </p>
            <div className="sheet-list">
              {result.availableSheets.map(
                (sheet: { name: string; hasData: boolean }) => (
                  <button
                    key={sheet.name}
                    className={`sheet-button ${
                      selectedSheet === sheet.name ? "selected" : ""
                    }`}
                    onClick={() => handleSheetSelect(sheet.name)}
                    disabled={!sheet.hasData}
                  >
                    <span className="sheet-name">{sheet.name}</span>
                    {sheet.hasData ? (
                      <span className="sheet-badge">有数据</span>
                    ) : (
                      <span className="sheet-badge empty">空表</span>
                    )}
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* 开始验证 */}
        {selectedFile &&
          !result?.needSheetSelection &&
          !result?.isValid !== undefined && (
            <section className="section">
              <h2>{result ? "重新验证" : "3. 开始验证"}</h2>
              {!isValidating ? (
                <button className="btn-primary" onClick={handleValidate}>
                  {result ? "重新审核" : "开始审核"}
                </button>
              ) : (
                <button className="btn-cancel" onClick={cancelValidation}>
                  取消
                </button>
              )}
            </section>
          )}

        {/* 进度显示 */}
        {progress && (
          <section className="section progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <p className="progress-text">
              {progress.progress}% - {progress.message}
            </p>
          </section>
        )}

        {/* 错误显示 */}
        {error && (
          <section className="section error-section">
            <h3>❌ 验证失败</h3>
            <p>{error}</p>
          </section>
        )}

        {/* 验证结果 - 使用新的 ValidationResults 组件 */}
        {result && !result.needSheetSelection && (
          <section className="section">
            <ValidationResults
              result={result}
              taskName={selectedTask}
              fileName={fileName}
              onExport={
                result.errors.length > 0 ||
                (result.imageErrors?.length ?? 0) > 0
                  ? handleExport
                  : undefined
              }
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

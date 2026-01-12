import { useState, useMemo } from "react";
import { BatchValidation } from "./components/BatchValidation";
import { ExcelComparison } from "./components/ExcelComparison";
import { ValidationHistory } from "./components/ValidationHistory";
import { PasscodeScreen } from "./components/PasscodeScreen";
import { AppLayout } from "./components/Layout/AppLayout";
import { SingleFileValidation } from "./components/SingleFileValidation";
import { FolderCompare } from "./components/FolderCompare";
import { FunctionLearning } from "./components/FunctionLearning";
import { AIChatDrawer } from "./components/AIChatDrawer";
import { AIChatProvider, useAIChat } from "./contexts/AIChatContext";
import { LLMSettings } from "./components/FunctionLearning/LLMSettings";
import { TASK_TEMPLATES } from "../shared/validation-rules";
import { ValidationProvider } from "./contexts/ValidationContext";
import { ContextPage } from "../shared/ai-chat";
import "./styles/tailwind.css";

// 内部 App 组件，使用 AI 聊天 context
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<"single" | "batch" | "compare" | "history" | "folder" | "functions">("single");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { 
    context, 
    isChatOpen, 
    openChat, 
    closeChat, 
    updatePage 
  } = useAIChat();

  // 显示口令码验证界面
  if (!isAuthenticated) {
    return <PasscodeScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  const availableTasks = Object.keys(TASK_TEMPLATES);

  // 更新页面上下文
  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    const pageMap: Record<string, ContextPage> = {
      single: 'validation',
      batch: 'batch',
      compare: 'compare',
      history: 'history',
      folder: 'compare',
      functions: 'functions'
    };
    updatePage(pageMap[newMode] || 'home');
  };

  const renderContent = () => {
    switch (mode) {
      case "batch":
        return (
          <BatchValidation
            availableTasks={availableTasks}
            defaultTask="药店拜访"
            onClose={() => handleModeChange("single")}
          />
        );
      case "compare":
        return <ExcelComparison />;
      case "history":
        return (
          <ValidationHistory
            onSelect={() => handleModeChange("single")}
          />
        );
      case "folder":
        return <FolderCompare />;
      case "functions":
        return <FunctionLearning />;
      default:
        return (
          <SingleFileValidation
            availableTasks={availableTasks}
            defaultTask="药店拜访"
          />
        );
    }
  };

  return (
    <ValidationProvider>
      <AppLayout currentMode={mode} onModeChange={handleModeChange}>
        {renderContent()}
      </AppLayout>

      {/* AI 对话功能暂时隐藏 - 待优化后再启用
      <button 
        className="ai-fab" 
        onClick={openChat}
        title="打开 AI 助手"
      >
        🤖
      </button>

      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={closeChat}
        context={context}
        onOpenSettings={() => {
          closeChat();
          setIsSettingsOpen(true);
        }}
      />
      */}

      {/* LLM 设置模态框 */}
      {isSettingsOpen && (
        <>
          <div 
            className="fl-settings-overlay" 
            onClick={() => setIsSettingsOpen(false)} 
          />
          <LLMSettings onClose={() => setIsSettingsOpen(false)} />
        </>
      )}
    </ValidationProvider>
  );
}

// 主 App 组件，包裹 Provider
function App() {
  return (
    <AIChatProvider>
      <AppContent />
    </AIChatProvider>
  );
}

export default App;

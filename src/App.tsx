import { useState } from "react";
import { BatchValidation } from "./components/BatchValidation";
import { ExcelComparison } from "./components/ExcelComparison";
import { ValidationHistory } from "./components/ValidationHistory";
import { PasscodeScreen } from "./components/PasscodeScreen";
import { AppLayout } from "./components/Layout/AppLayout";
import { SingleFileValidation } from "./components/SingleFileValidation";
import { TASK_TEMPLATES } from "../shared/validation-rules";
import "./styles/tailwind.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<"single" | "batch" | "compare" | "history">("single");

  // 显示口令码验证界面
  if (!isAuthenticated) {
    return <PasscodeScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  const availableTasks = Object.keys(TASK_TEMPLATES);

  const renderContent = () => {
    switch (mode) {
      case "batch":
        return (
          <BatchValidation
            availableTasks={availableTasks}
            defaultTask="药店拜访"
            onClose={() => setMode("single")}
          />
        );
      case "compare":
        return <ExcelComparison onClose={() => setMode("single")} />;
      case "history":
        return (
          <ValidationHistory
            onSelect={(record) => {
              // 返回单文件模式时可以传递文件信息
              setMode("single");
            }}
          />
        );
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
    <AppLayout currentMode={mode} onModeChange={setMode}>
      {renderContent()}
    </AppLayout>
  );
}

export default App;


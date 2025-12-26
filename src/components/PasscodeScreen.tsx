import { useState, useEffect } from "react";
import "./PasscodeScreen.css";

interface PasscodeScreenProps {
  onSuccess: () => void;
}

const CORRECT_PASSCODE = "217664";
const STORAGE_KEY = "excel-review-passcode-verified";

export function PasscodeScreen({ onSuccess }: PasscodeScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // 检查是否已经验证过
  useEffect(() => {
    const verified = localStorage.getItem(STORAGE_KEY);
    if (verified === "true") {
      onSuccess();
    }
  }, [onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passcode === CORRECT_PASSCODE) {
      // 保存验证状态
      localStorage.setItem(STORAGE_KEY, "true");
      onSuccess();
    } else {
      setError("口令码错误，请重试");
      setShake(true);
      setPasscode("");
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPasscode(value);
    if (error) setError("");
  };

  return (
    <div className="passcode-screen">
      <div className={`passcode-card ${shake ? "shake" : ""}`}>
        <div className="passcode-icon">🔐</div>
        <h1>Excel 审核系统</h1>
        <p className="passcode-subtitle">请输入口令码</p>
        
        <form onSubmit={handleSubmit}>
          <div className="passcode-input-wrapper">
            <input
              type="password"
              value={passcode}
              onChange={handleChange}
              placeholder="请输入6位口令码"
              maxLength={6}
              autoFocus
              className="passcode-input"
            />
            <div className="passcode-dots">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className={`passcode-dot ${i < passcode.length ? "filled" : ""}`}
                />
              ))}
            </div>
          </div>
          
          {error && <p className="passcode-error">{error}</p>}
          
          <button
            type="submit"
            className="passcode-button"
            disabled={passcode.length !== 6}
          >
            验证
          </button>
        </form>
        
        <p className="passcode-hint">请联系管理员获取口令码</p>
      </div>
    </div>
  );
}

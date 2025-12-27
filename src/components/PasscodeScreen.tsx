import React from "react";


interface PasscodeScreenProps {
  onSuccess: () => void;
}

const CORRECT_PASSCODE = "217664";

export function PasscodeScreen({ onSuccess }: PasscodeScreenProps) {
  const [passcode, setPasscode] = React.useState("");
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passcode === CORRECT_PASSCODE) {
      onSuccess();
    } else {
      setError("口令码错误");
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className={`w-full max-w-sm bg-white p-8 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 text-center ${shake ? "animate-shake" : ""}`}>
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center text-2xl shadow-lg">
            ⚡
          </div>
        </div>
        
        <h1 className="text-xl font-bold text-zinc-900 mb-2">欢迎回来</h1>
        <p className="text-sm text-zinc-500 mb-8">请输入访问口令</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={passcode}
              onChange={handleChange}
              placeholder="输入口令码"
              maxLength={6}
              autoFocus
              className="w-full h-12 text-center text-xl tracking-[0.5em] font-mono rounded-lg border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:tracking-normal placeholder:text-zinc-300 placeholder:text-sm"
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
          
          <button
            type="submit"
            disabled={passcode.length !== 6}
            className="w-full h-10 bg-black text-white rounded-md text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            验证访问
          </button>
        </form>
        
        <p className="mt-6 text-xs text-zinc-400">
          受保护系统 • 仅限授权人员
        </p>
      </div>
    </div>
  );
}

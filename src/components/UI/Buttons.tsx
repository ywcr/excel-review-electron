import React from "react";

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
}

export function GhostButton({ 
  children, 
  className = "", 
  active = false,
  ...props 
}: GhostButtonProps) {
  return (
    <button
      className={`
        px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
        ${active 
          ? "bg-zinc-100 text-zinc-900 font-semibold" 
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className = "",
  ...props
}: GhostButtonProps) {
  return (
    <button
      className={`
        px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
        border border-zinc-200 bg-white text-zinc-900
        hover:border-zinc-300 hover:bg-zinc-50
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

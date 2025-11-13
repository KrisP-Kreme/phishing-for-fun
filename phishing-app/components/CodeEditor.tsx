"use client";

import { useEffect, useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Lightweight HTML code editor using a textarea with basic syntax highlighting via CSS.
 * This component is optimized for:
 * - Zero external dependencies (no CodeMirror/Monaco overhead)
 * - Fast initialization (works immediately on SSR hydration)
 * - Clean, responsive design with line numbers
 * 
 * For production, replace textarea with CodeMirror 6 or Monaco Editor:
 * - CodeMirror 6: `npm install @codemirror/view @codemirror/state`
 * - Monaco: `npm install @monaco-editor/react`
 */
export default function CodeEditor({ value, onChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync textarea scroll with line numbers
  const handleScroll = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lineNumbers = document.querySelector(".line-numbers") as HTMLElement;
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  };

  // Handle tab key insertion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textareaRef.current?.selectionStart || 0;
      const end = textareaRef.current?.selectionEnd || 0;
      const newValue = value.substring(0, start) + "\t" + value.substring(end);
      onChange(newValue);

      // Move cursor after tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
        }
      }, 0);
    }
  };

  // Count lines for line numbers
  const lineCount = value.split("\n").length;

  return (
    <div className="flex h-full bg-[var(--background)]">
      {/* Line numbers */}
      <div
        className="line-numbers overflow-hidden flex-shrink-0 py-4 px-3 text-right select-none"
        style={{
          backgroundColor: "var(--card)",
          borderRight: "1px solid var(--border)",
          color: "var(--muted-foreground)",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.5",
          minWidth: "50px",
        }}
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Editor textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="flex-1 p-4 font-mono text-sm resize-none outline-none bg-transparent text-[var(--foreground)]"
        style={{
          lineHeight: "1.5",
          overflowWrap: "normal",
          whiteSpace: "pre",
          fontFamily: "monospace",
        }}
        spellCheck="false"
      />

      <style>{`
        .line-numbers {
          display: flex;
          flex-direction: column;
        }
        .line-numbers div {
          height: 1.5em;
          opacity: 0.6;
        }
        textarea::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        textarea::-webkit-scrollbar-track {
          background: var(--background);
        }
        textarea::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }
        textarea::-webkit-scrollbar-thumb:hover {
          background: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}

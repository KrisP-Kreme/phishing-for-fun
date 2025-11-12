"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function AppPage() {
  const [value, setValue] = useState("");

  // Typewriter animation state
  const domains = [
    "www.zambrero.com",
    "www.aquamoves.com.au",
    "www.dimmeys.com.au",
    "www.anytimefitness.com",
    "www.holeymoley.com.au",
    "www.jimslifecoaching.com.au",
  ];
  const [display, setDisplay] = useState("");
  const [domainIndex, setDomainIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blink cursor
  useEffect(() => {
    const iv = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(iv);
  }, []);

  // Typewriter effect — pauses when the user has typed something
  useEffect(() => {
    if (value) return; // stop animation once user types

    let timeout: ReturnType<typeof setTimeout>;
    const current = domains[domainIndex];

    if (!isDeleting) {
      if (charIndex < current.length) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        }, 100);
      } else {
        // pause at full word
        timeout = setTimeout(() => setIsDeleting(true), 1100);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIndex - 1));
          setCharIndex((c) => c - 1);
        }, 45);
      } else {
        // move to next domain
        timeout = setTimeout(() => {
          setIsDeleting(false);
          setDomainIndex((i) => (i + 1) % domains.length);
        }, 400);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, domainIndex, isDeleting, value]);

  // refs and measurements for cursor positioning
  const containerRef = useRef<HTMLDivElement | null>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cursorLeft, setCursorLeft] = useState(8); // initial padding
  const [inputPaddingLeft, setInputPaddingLeft] = useState(16);

  // measure text width and input padding to place cursor precisely
  const updateCursorPosition = () => {
    const input = inputRef.current;
    if (!input) return;

    // compute input's computed left padding so overlay aligns exactly
    const cs = window.getComputedStyle(input);
    const paddingLeft = parseFloat(cs.paddingLeft || "0") || 0;
    setInputPaddingLeft(paddingLeft);

    // sum widths of each character span for precise width measurement
    const chars = charRefs.current || [];
    let totalWidth = 0;
    const count = Math.min(chars.length, display.length);
    for (let i = 0; i < count; i++) {
      const c = chars[i];
      if (c) totalWidth += c.getBoundingClientRect().width;
    }

    // cursor position = padding + measured characters width
    const left = paddingLeft + totalWidth;
    setCursorLeft(left);
  };

  useLayoutEffect(() => {
    updateCursorPosition();
    const ro = new ResizeObserver(() => updateCursorPosition());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateCursorPosition);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateCursorPosition);
    };
  }, []);

  // recalc when display changes
  useEffect(() => {
    updateCursorPosition();
  }, [display, value]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
      <div ref={containerRef} className="w-full max-w-2xl p-8 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Domain</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Enter a target domain to be spear phished</p>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder=""
                className="w-full font-mono px-4 py-3 rounded-lg border bg-transparent relative"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />

              {/* Visible animated text overlay (when user hasn't typed) */}
              {!value && (
                <span
                  aria-hidden
                  className="pointer-events-none select-none absolute top-1/2 transform -translate-y-1/2 font-mono"
                  style={{
                    left: `${inputPaddingLeft}px`,
                    color: 'var(--muted-foreground)',
                    whiteSpace: 'pre',
                  }}
                >
                  {display.split("").map((ch, i) => (
                    <span
                      key={i}
                      ref={(el) => { charRefs.current[i] = el; }}
                      style={{ display: 'inline-block' }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              )}

              {/* Blinking cursor positioned using measured span */}
              {!value && (
                <span
                  aria-hidden
                  className="absolute top-1/2 transform -translate-y-1/2"
                  style={{
                    left: cursorLeft,
                    color: 'var(--primary)',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    opacity: cursorVisible ? 1 : 0,
                    pointerEvents: 'none',
                    transition: 'left 40ms linear',
                  }}
                >
                  |
                </span>
              )}
            </div>

            <button
              onClick={() => alert(value ? `You entered: ${value}` : `You selected: ${display}`)}
              className="text-[var(--primary-foreground)] font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function AppPage() {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Handle scraping on button click
  const handleScrape = async () => {
    const domain = value || display;
    if (!domain) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping failed");
      setScrapedData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading overlay
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 border-4 rounded-full"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p className="text-lg font-semibold">Scraping domain...</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Fetching logo, fonts, and banner
          </p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Success screen (after scraping)
  if (scrapedData) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4">
        <div ref={containerRef} className="w-full max-w-4xl p-8 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Scraped Assets from {scrapedData.domain}</h1>

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Logo</h2>
              {scrapedData.logo ? (
                <div className="p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                  <img src={scrapedData.logo} alt="Logo" className="max-w-xs max-h-40 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <p className="text-xs text-[var(--muted-foreground)] mt-2 break-all">{scrapedData.logo}</p>
                </div>
              ) : (
                <p className="text-[var(--muted-foreground)]">No logo found</p>
              )}
            </div>

            {/* Banner */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Banner</h2>
              {scrapedData.banner ? (
                <div className="p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                  <img src={scrapedData.banner} alt="Banner" className="w-full max-h-64 object-cover rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <p className="text-xs text-[var(--muted-foreground)] mt-2 break-all">{scrapedData.banner}</p>
                </div>
              ) : (
                <p className="text-[var(--muted-foreground)]">No banner found</p>
              )}
            </div>

            {/* Fonts */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Captured Fonts</h2>
              {scrapedData.fonts && scrapedData.fonts.length > 0 ? (
                <div className="space-y-4">
                  {scrapedData.fonts.map((font: string, idx: number) => (
                    <div key={idx} className="p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                      <p className="text-xs text-[var(--muted-foreground)] mb-2">Font: {font}</p>
                      <p className="text-lg" style={{ fontFamily: font }}>
                        This text is rendered with: {font}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--muted-foreground)]">No fonts found</p>
              )}
            </div>

            {/* Start Over Button */}
            <button
              onClick={() => {
                setScrapedData(null);
                setValue("");
                setError(null);
              }}
              className="text-[var(--primary-foreground)] font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form render
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
              onClick={handleScrape}
              className="text-[var(--primary-foreground)] font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Go
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 rounded" style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}>
              <p className="text-sm font-semibold">Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

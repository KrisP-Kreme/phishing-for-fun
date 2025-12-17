"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import CodeMirror to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-[var(--background)]">Loading editor...</div>,
});

interface ScrapedData {
  logo: string | null;
  banner: string | null;
  title_font: string | null;
  body_font: string | null;
}

export default function AppPage() {
  const router = useRouter();
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
      
      // Store domain in URL params and navigate to select-forge
      router.push(`/app/select-forge?domain=${encodeURIComponent(domain)}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
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

  // Success screen (split view: editor + preview)
  if (scrapedData) {
    return <EditorPage scrapedData={scrapedData} onBack={() => setScrapedData(null)} />;
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

// Split-view editor page with live preview
function EditorPage({
  scrapedData,
  onBack,
}: {
  scrapedData: ScrapedData;
  onBack: () => void;
}) {
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<any>(null);
  const [overridePrimary, setOverridePrimary] = useState<string>("");
  const [overrideAccent, setOverrideAccent] = useState<string>("");

  // Auto-generate template on mount
  useEffect(() => {
    const generateTemplate = async () => {
      try {
        setIsGenerating(true);
        setError(null);
        
        // Extract domain from user input or scraped data
        const domainFromUrl = typeof window !== 'undefined' 
          ? new URL(window.location.href).searchParams.get('domain') 
          : null;
        
        // If we don't have domain in params, extract from logo/banner URL
        let domain = domainFromUrl;
        if (!domain && scrapedData.logo) {
          const logoUrl = new URL(scrapedData.logo);
          domain = logoUrl.hostname.replace('www.', '');
        }
        if (!domain && scrapedData.banner) {
          const bannerUrl = new URL(scrapedData.banner);
          domain = bannerUrl.hostname.replace('www.', '');
        }
        
        if (!domain) {
          domain = 'example.com';
        }

        const response = await fetch('/api/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scrapedData, domain }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Template generation failed');

        setHtmlCode(data.html);
        setExtractedMeta(data.meta || null);
        // Prefill override inputs with detected colors when available
        if (data.meta && data.meta.colors) {
          setOverridePrimary(data.meta.colors.primary || "");
          setOverrideAccent(data.meta.colors.accent || "");
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate template');
        // Fallback to basic template
        setHtmlCode(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ${scrapedData.body_font || 'sans-serif'}; }
  </style>
</head>
<body>
  <p>Error generating template. Please edit manually or try again.</p>
</body>
</html>`);
      } finally {
        setIsGenerating(false);
      }
    };

    generateTemplate();
  }, [scrapedData]);

  // Regenerate with optional color overrides
  const handleRegenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Recompute domain same as initial logic
      let domain = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('domain') : null;
      if (!domain && scrapedData.logo) {
        try { domain = new URL(scrapedData.logo).hostname.replace('www.', ''); } catch (e) {}
      }
      if (!domain && scrapedData.banner) {
        try { domain = new URL(scrapedData.banner).hostname.replace('www.', ''); } catch (e) {}
      }
      if (!domain) domain = 'example.com';

      const payload: any = { scrapedData, domain };
      if (overridePrimary || overrideAccent) {
        payload.override = {};
        if (overridePrimary) payload.override.primary = overridePrimary;
        if (overrideAccent) payload.override.accent = overrideAccent;
      }

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Template generation failed');

      setHtmlCode(data.html);
      setExtractedMeta(data.meta || extractedMeta);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate template');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold">Email Template Editor</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {isGenerating ? 'Generating template...' : 'Edit HTML and see live preview'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-[var(--primary-foreground)] font-semibold px-6 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Back
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Extracted metadata: colors & contacts */}
      {extractedMeta && (
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h4 className="text-sm font-semibold">Detected colors</h4>
              <div className="flex items-center gap-3 mt-2">
                {extractedMeta.colors?.primary && (
                  <div className="flex items-center gap-2">
                    <div style={{ width: 40, height: 28, background: extractedMeta.colors.primary, borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }} />
                    <div className="text-sm">{extractedMeta.colors.primary}</div>
                  </div>
                )}
                {extractedMeta.colors?.accent && (
                  <div className="flex items-center gap-2">
                    <div style={{ width: 40, height: 28, background: extractedMeta.colors.accent, borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }} />
                    <div className="text-sm">{extractedMeta.colors.accent}</div>
                  </div>
                )}
                {extractedMeta.colors?.theme && (
                  <div className="flex items-center gap-2">
                    <div style={{ width: 40, height: 28, background: extractedMeta.colors.theme, borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }} />
                    <div className="text-sm">{extractedMeta.colors.theme}</div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input type="text" value={overridePrimary} onChange={(e)=>setOverridePrimary(e.target.value)} placeholder="Primary hex override" className="px-2 py-1 border rounded text-sm" />
                <input type="text" value={overrideAccent} onChange={(e)=>setOverrideAccent(e.target.value)} placeholder="Accent hex override" className="px-2 py-1 border rounded text-sm" />
                <button onClick={handleRegenerate} className="ml-2 px-3 py-1 rounded text-[var(--primary-foreground)]" style={{ backgroundColor: 'var(--primary)' }}>Regenerate</button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Contact info</h4>
              <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                {extractedMeta.contact?.emails?.length ? (
                  <div className="mb-2">
                    <div className="text-[var(--muted-foreground)] text-xs">Emails</div>
                    {extractedMeta.contact.emails.map((e: string, i: number) => (
                      <div key={i} className="py-1 flex items-center gap-2">
                        <div className="font-mono text-sm">{e}</div>
                        <button onClick={() => navigator.clipboard?.writeText(e)} className="text-xs text-[var(--muted-foreground)]">Copy</button>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-xs">No emails found</div>}

                {extractedMeta.contact?.phones?.length ? (
                  <div className="mb-2">
                    <div className="text-[var(--muted-foreground)] text-xs">Phones</div>
                    {extractedMeta.contact.phones.map((p: string, i: number) => (
                      <div key={i} className="py-1 flex items-center gap-2">
                        <div className="font-mono text-sm">{p}</div>
                        <button onClick={() => navigator.clipboard?.writeText(p)} className="text-xs text-[var(--muted-foreground)]">Copy</button>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-xs">No phones found</div>}

                {extractedMeta.contact?.addresses?.length ? (
                  <div>
                    <div className="text-[var(--muted-foreground)] text-xs">Addresses</div>
                    {extractedMeta.contact.addresses.map((a: string, i: number) => (
                      <div key={i} className="py-1 font-mono text-sm">{a}</div>
                    ))}
                  </div>
                ) : <div className="text-xs">No addresses found</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split view: Editor + Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Code Editor */}
        <div className="flex-1 overflow-hidden border-r" style={{ borderColor: 'var(--border)' }}>
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="w-12 h-12 mx-auto mb-4 border-4 rounded-full"
                  style={{
                    borderColor: 'var(--border)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p className="text-sm text-[var(--muted-foreground)]">Generating template...</p>
              </div>
            </div>
          ) : (
            <CodeEditor value={htmlCode} onChange={setHtmlCode} />
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[var(--background)]">
          <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm">Live Preview</h3>
          </div>
          {htmlCode && (
            <iframe
              title="Preview"
              srcDoc={htmlCode}
              className="flex-1 border-0 w-full h-full"
              sandbox="allow-same-origin"
            />
          )}
        </div>
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

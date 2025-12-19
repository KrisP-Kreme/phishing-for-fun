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

type AppMode = "select" | "template" | "infrastructure";

export default function AppPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AppMode>("select");
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [infrastructureData, setInfrastructureData] = useState<any>(null);
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

  // Handle template (phishing email) mode
  const handleTemplate = async () => {
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

  // Handle infrastructure reconnaissance mode
  const handleInfrastructure = async () => {
    const domain = value || display;
    if (!domain) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Infrastructure reconnaissance failed");
      
      setInfrastructureData(data);
      setMode("infrastructure");
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  // Mode: Select template or infrastructure
  if (mode === "select") {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div className="w-full max-w-4xl px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">PhishGuard</h1>
            <p className="text-lg text-[var(--muted-foreground)]">
              Select an analysis mode to begin
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Template Option */}
            <button
              onClick={() => setMode("template")}
              className="group p-8 rounded-xl border-2 transition-all duration-200 hover:border-[var(--primary)] hover:shadow-lg"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Email Template</h2>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Generate realistic phishing email templates for security awareness training
                </p>
                <ul className="text-sm text-left text-[var(--muted-foreground)] space-y-2">
                  <li>✓ AI-powered generation</li>
                  <li>✓ Brand asset scraping</li>
                  <li>✓ Live HTML preview</li>
                </ul>
              </div>
            </button>

            {/* Infrastructure Option */}
            <button
              onClick={() => setMode("infrastructure")}
              className="group p-8 rounded-xl border-2 transition-all duration-200 hover:border-[var(--primary)] hover:shadow-lg"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Infrastructure</h2>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Gather passive reconnaissance data: DNS, WHOIS, hosting, and email infrastructure
                </p>
                <ul className="text-sm text-left text-[var(--muted-foreground)] space-y-2">
                  <li>✓ DNS records & nameservers</li>
                  <li>✓ WHOIS & registration data</li>
                  <li>✓ Hosting & IP info</li>
                </ul>
              </div>
            </button>
          </div>

          <div ref={containerRef} className="p-8 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <label className="block text-sm font-semibold mb-3">Enter a domain to analyze</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder=""
                  className="w-full font-mono px-4 py-3 rounded-lg border bg-transparent"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />

                {/* Visible animated text overlay */}
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

                {/* Blinking cursor */}
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
          <p className="text-lg font-semibold">
            {mode === "template" ? "Scraping domain..." : "Gathering infrastructure data..."}
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            {mode === "template" ? "Fetching logo, fonts, and banner" : "Querying DNS, WHOIS, and hosting information"}
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

  // Mode: Template (email generation)
  if (mode === "template" && scrapedData) {
    return <EditorPage scrapedData={scrapedData} onBack={() => { setScrapedData(null); setMode("select"); }} />;
  }

  if (mode === "template" && !scrapedData && !isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div ref={containerRef} className="w-full max-w-2xl p-8 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { setMode("select"); setValue(""); }}
              className="mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              ← Back to mode selection
            </button>
            <h1 className="text-3xl font-bold">Email Template</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Enter a target domain to generate a phishing template</p>

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
                onClick={handleTemplate}
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

  // Mode: Infrastructure reconnaissance
  if (mode === "infrastructure") {
    if (infrastructureData) {
      return <InfrastructureView data={infrastructureData} onBack={() => { setInfrastructureData(null); setMode("select"); setValue(""); }} />;
    }

    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div ref={containerRef} className="w-full max-w-2xl p-8 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { setMode("select"); setValue(""); }}
              className="mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              ← Back to mode selection
            </button>
            <h1 className="text-3xl font-bold">Infrastructure Reconnaissance</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Passive gathering: DNS, WHOIS, hosting, and email infrastructure</p>

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
                onClick={handleInfrastructure}
                className="text-[var(--primary-foreground)] font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Scan
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
}

// Infrastructure data display component
function InfrastructureView({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Infrastructure Reconnaissance</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {data.domain} • {new Date(data.timestamp).toLocaleString()}
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
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* Domain Registration */}
        {data.domain_registration && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">📋 Domain Registration</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Registrar</div>
                <div className="font-mono mt-1">{data.domain_registration.registrar || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Creation Date</div>
                <div className="font-mono mt-1">{data.domain_registration.creation_date || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Expiration Date</div>
                <div className="font-mono mt-1">{data.domain_registration.expiration_date || "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* DNS Information */}
        {data.dns && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">📡 DNS Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-2">Nameservers ({data.dns.nameservers?.length || 0})</div>
                <div className="space-y-1 text-sm font-mono">
                  {data.dns.nameservers?.map((ns: string, i: number) => (
                    <div key={i}>{ns}</div>
                  )) || <div>—</div>}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-2">
                  Provider: {data.dns.ns_provider || "Unknown"}
                </div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-2">A Records</div>
                <div className="space-y-1 text-sm font-mono">
                  {data.dns.a_records?.map((ip: string, i: number) => (
                    <div key={i}>{ip}</div>
                  )) || <div>—</div>}
                </div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-2">MX Records ({data.dns.mx_records?.length || 0})</div>
                <div className="space-y-1 text-sm font-mono">
                  {data.dns.mx_records?.map((mx: any, i: number) => (
                    <div key={i}>{mx.priority} {mx.exchange}</div>
                  )) || <div>—</div>}
                </div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-2">IPv6 Addresses</div>
                <div className="space-y-1 text-sm font-mono">
                  {data.dns.aaaa_records?.map((ip: string, i: number) => (
                    <div key={i} className="truncate">{ip}</div>
                  )) || <div>—</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hosting Information */}
        {data.hosting && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">🖥️ Hosting Information</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">IP Address</div>
                <div className="font-mono mt-1">{data.hosting.ip_address || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">ASN</div>
                <div className="font-mono mt-1">{data.hosting.asn || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Organization</div>
                <div className="font-mono mt-1">{data.hosting.organization || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Country</div>
                <div className="font-mono mt-1">{data.hosting.country || "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Web Server */}
        {data.web_server && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">🌐 Web Server</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Server Header</div>
                <div className="font-mono mt-1">{data.web_server.server_header || "Hidden"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Platform</div>
                <div className="font-mono mt-1">{data.web_server.platform || "—"}</div>
              </div>
              {data.web_server.cdn_provider && (
                <div>
                  <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">CDN Provider</div>
                  <div className="font-mono mt-1">{data.web_server.cdn_provider}</div>
                </div>
              )}
              {data.web_server.reverse_proxy && (
                <div>
                  <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Reverse Proxy</div>
                  <div className="font-mono mt-1">{data.web_server.reverse_proxy}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TLS Certificate */}
        {data.tls && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">🔐 TLS Certificate</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Issuer</div>
                <div className="font-mono mt-1">{data.tls.certificate_issuer || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Subject</div>
                <div className="font-mono mt-1">{data.tls.certificate_subject || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Valid From</div>
                <div className="font-mono mt-1">{data.tls.valid_from || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Valid To</div>
                <div className="font-mono mt-1">{data.tls.valid_to || "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Email Infrastructure */}
        {data.email && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">📧 Email Infrastructure</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Email Provider</div>
                <div className="font-mono mt-1">{data.email.mx_provider || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">SPF Record</div>
                <div className="font-mono mt-1 truncate text-xs">{data.email.spf_record ? "✓ Configured" : "—"}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">DMARC Record</div>
                <div className="font-mono mt-1 truncate text-xs">{data.email.dmarc_record ? "✓ Configured" : "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        {data.metadata && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4">ℹ️ Collection Metadata</h2>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Method</div>
                <div className="mt-1">{data.metadata.collection_method}</div>
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Data Sources</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.metadata.data_sources?.map((source: string, i: number) => (
                    <div key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                      {source}
                    </div>
                  ))}
                </div>
              </div>
              {data.metadata.notes && (
                <div>
                  <div className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Notes</div>
                  <div className="mt-2 space-y-1">
                    {data.metadata.notes.map((note: string, i: number) => (
                      <div key={i} className="text-xs">✓ {note}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

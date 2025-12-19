"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hammer, Building2, Globe } from "lucide-react";
import { InfrastructureGraph } from "@/components/InfrastructureGraph";

interface ForgeCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string;
}

interface AttackSurface {
  vector: string;
  value: string;
  description: string;
  phishingTactic: string;
}

function SelectForgeContent() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Graph visualization state
  const [showGraph, setShowGraph] = useState(false);
  const [graphDomain, setGraphDomain] = useState("");
  const [graphAttackSurfaces, setGraphAttackSurfaces] = useState<AttackSurface[]>([]);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);

  // Domain input state
  const [value, setValue] = useState("");
  const [display, setDisplay] = useState("");
  const [domainIndex, setDomainIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const domains = [
    "www.zambrero.com",
    "www.aquamoves.com.au",
    "www.dimmeys.com.au",
    "www.anytimefitness.com",
    "www.holeymoley.com.au",
    "www.jimslifecoaching.com.au",
  ];

  // Blink cursor
  useEffect(() => {
    const iv = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(iv);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (value) return;

    let timeout: ReturnType<typeof setTimeout>;
    const current = domains[domainIndex];

    if (!isDeleting) {
      if (charIndex < current.length) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        }, 100);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 1100);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIndex - 1));
          setCharIndex((c) => c - 1);
        }, 45);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(false);
          setDomainIndex((i) => (i + 1) % domains.length);
        }, 400);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, domainIndex, isDeleting, value]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cursorLeft, setCursorLeft] = useState(8);
  const [inputPaddingLeft, setInputPaddingLeft] = useState(16);

  const updateCursorPosition = () => {
    const input = inputRef.current;
    if (!input) return;

    const cs = window.getComputedStyle(input);
    const paddingLeft = parseFloat(cs.paddingLeft || "0") || 0;
    setInputPaddingLeft(paddingLeft);

    const chars = charRefs.current || [];
    let totalWidth = 0;
    const count = Math.min(chars.length, display.length);
    for (let i = 0; i < count; i++) {
      const c = chars[i];
      if (c) totalWidth += c.getBoundingClientRect().width;
    }

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
      // If Infrastructure Based is selected, run reconnaissance first
      if (selectedCard === "technology-stack") {
        console.log("🔍 Running infrastructure reconnaissance...");
        
        // Step 1: Get infrastructure data
        const infraRes = await fetch("/api/infrastructure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        
        const infraResponse = await infraRes.json();
        if (!infraRes.ok) throw new Error(infraResponse.error || "Infrastructure reconnaissance failed");
        
        const infraData = infraResponse.result;
        const attackSurfaces = infraResponse.attackSurfaces;
        
        console.log("✓ Infrastructure data collected");
        console.log("🎯 Attack surfaces extracted");
        
        // Store graph data and show graph
        setGraphDomain(domain);
        setGraphAttackSurfaces(attackSurfaces);
        setShowGraph(true);
        setSelectedSurface(null);
        setIsLoading(false);
      } else {
        // Original scraping flow for other forge types
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Scraping failed");
        
        // Navigate to editor with selected forge
        const forgeParam = selectedCard ? `?forge=${selectedCard}` : "";
        router.push(`/app/editor${forgeParam}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  // Handle surface selection from graph
  const handleSurfaceSelect = async (vector: string) => {
    setSelectedSurface(vector);
    
    console.log(`🎣 Generating phishing template for: ${vector}`);
    
    try {
      // Generate phishing template using the selected surface
      const phishingRes = await fetch("/api/generate-phishing-from-infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          domain: graphDomain,
          infrastructureData: {},
          attackSurfaces: graphAttackSurfaces,
        }),
      });
      
      const phishingData = await phishingRes.json();
      if (!phishingRes.ok) throw new Error(phishingData.error || "Phishing template generation failed");
      
      console.log("✓ Phishing template generated");
      
      // Navigate to editor with the generated template
      router.push(`/app/editor?forge=${selectedCard}&domain=${encodeURIComponent(graphDomain)}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate template");
      setSelectedSurface(null);
    }
  };

  const forges: ForgeCard[] = [
    {
      id: "technology-stack",
      title: "Infrastructure Based",
      description: "Analyze frameworks, libraries, and technologies",
      icon: <Hammer className="w-8 h-8" />,
      details:
        "Targets users through vulnerabilities specific to their technology choices and frameworks.",
    },
    {
      id: "internally-based",
      title: "Internally Based",
      description: "Internal company structure and processes",
      icon: <Building2 className="w-8 h-8" />,
      details:
        "Leverages internal company knowledge, employee names, and organizational structure.",
    },
    {
      id: "public-based",
      title: "Public Based",
      description: "Publicly available information",
      icon: <Globe className="w-8 h-8" />,
      details: "Uses publicly available data and information to craft targeted phishing campaigns.",
    },
  ];

  const handleCardClick = (forgeId: string) => {
    setSelectedCard(forgeId);
    setShowGraph(false);
  };

  const isCardActive = (forgeId: string) => {
    return selectedCard === forgeId;
  };

  const isCardHovered = (forgeId: string) => {
    return hoveredCard === forgeId || selectedCard === forgeId;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--background)] text-[var(--foreground)] dark:text-[var(--foreground)]">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 dark:bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Back Button */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          {/* Spacer for balance */}
          <div className="w-20"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        {!showGraph ? (
          <>
            {/* Forge Selection Section */}
            <div>
              {/* Section Header */}
              <div className="text-center mb-16">
                <p className="text-[var(--muted-foreground)] mb-2">Choose your approach</p>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Select an Email <span style={{ color: "var(--primary)" }}>Forge Strategy</span>
                </h2>
                <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
                  Each forge uses different techniques and information sources to create targeted phishing
                  simulations. Select the one that best fits your learning objectives.
                </p>
              </div>

              {/* Forge Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {forges.map((forge) => (
                  <button
                    key={forge.id}
                    onClick={() => handleCardClick(forge.id)}
                    onMouseEnter={() => setHoveredCard(forge.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="group relative text-left transition-all duration-300 cursor-pointer"
                  >
                    {/* Card Container */}
                    <div
                      className={`relative p-8 rounded-lg border-2 transition-all duration-300 h-full ${
                        isCardActive(forge.id)
                          ? "border-[var(--primary)] bg-[var(--accent)]"
                          : isCardHovered(forge.id)
                          ? "border-[var(--primary)] bg-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--card)]"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className="mb-6 inline-flex p-3 rounded-lg transition-all duration-300"
                        style={{
                          backgroundColor:
                            isCardActive(forge.id) || isCardHovered(forge.id)
                              ? "var(--primary)"
                              : "var(--accent)",
                          color:
                            isCardActive(forge.id) || isCardHovered(forge.id)
                              ? "var(--primary-foreground)"
                              : "var(--accent-foreground)",
                        }}
                      >
                        {forge.icon}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-3">{forge.title}</h3>

                      {/* Short Description (always visible) */}
                      <p className="text-sm text-[var(--muted-foreground)] mb-4">{forge.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Input Section - At Bottom */}
            <div ref={containerRef} className="p-8 rounded-lg border-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
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
                      disabled={isLoading}
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
                    onClick={handleScrape}
                    disabled={isLoading || !selectedCard}
                    className="text-[var(--primary-foreground)] font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    {isLoading ? "..." : "Go"}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 rounded" style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}>
                    <p className="text-sm font-semibold">Error: {error}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Graph View */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Attack Surfaces</h2>
                  <p className="text-[var(--muted-foreground)]">
                    Click on an attack surface to generate a phishing template targeting it
                  </p>
                </div>
                <button
                  onClick={() => setShowGraph(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors"
                >
                  Back
                </button>
              </div>
            </div>

            {/* Graph Component */}
            <div style={{ height: "700px", marginBottom: "24px" }}>
              <InfrastructureGraph
                domain={graphDomain}
                attackSurfaces={graphAttackSurfaces}
                selectedSurface={selectedSurface}
                onSurfaceSelect={handleSurfaceSelect}
              />
            </div>

            {/* Attack Surfaces List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graphAttackSurfaces.map((surface) => (
                <div
                  key={surface.vector}
                  onClick={() => handleSurfaceSelect(surface.vector)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSurface === surface.vector
                      ? "border-[var(--primary)] bg-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]"
                  }`}
                >
                  <h3 className="font-bold mb-2">{surface.vector}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">{surface.value}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{surface.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SelectForgePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center">Loading...</div>}>
      <SelectForgeContent />
    </Suspense>
  );
}

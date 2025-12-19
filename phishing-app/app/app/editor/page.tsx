"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Download } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";

function EditorContent() {
  const searchParams = useSearchParams();
  const forge = searchParams.get("forge");
  const domain = searchParams.get("domain");

  const [htmlContent, setHtmlContent] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load the generated template on mount
  useEffect(() => {
    const loadTemplate = async () => {
      if (!domain) {
        setIsLoading(false);
        return;
      }

      try {
        // Get infrastructure data
        const infraRes = await fetch("/api/infrastructure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });

        const infraData = await infraRes.json();

        // Get phishing template
        const phishingRes = await fetch("/api/generate-phishing-from-infrastructure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            infrastructureData: infraData,
          }),
        });

        const phishingData = await phishingRes.json();
        setHtmlContent(phishingData.html || "");
      } catch (err) {
        console.error("Failed to load template:", err);
        setHtmlContent("<h1>Error loading template</h1>");
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [domain]);

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([htmlContent], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = `phishing-${domain || "template"}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/app/forge"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Forge Strategy</p>
                <p className="text-sm font-semibold capitalize">
                  {forge === "technology-stack" ? "Infrastructure Based" : forge?.replace(/-/g, " ")}
                </p>
              </div>
              {domain && (
                <>
                  <div className="h-6 w-px bg-[var(--border)]" />
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">Target Domain</p>
                    <p className="text-sm font-mono">{domain}</p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm">{copySuccess ? "Copied!" : "Copy"}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="flex-1 overflow-hidden flex">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Loading template...</div>
              <p className="text-[var(--muted-foreground)]">Generating phishing template based on infrastructure</p>
            </div>
          </div>
        ) : (
          <>
            {/* Code Editor - Left Side */}
            <div className="w-1/2 border-r border-[var(--border)] overflow-hidden">
              <CodeEditor value={htmlContent} onChange={setHtmlContent} />
            </div>

            {/* HTML Preview - Right Side */}
            <div className="w-1/2 overflow-hidden">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-none"
                title="Phishing Template Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <p className="text-xs text-[var(--muted-foreground)]">
          ⚠️ This is an educational phishing simulation template. Use only for authorized security awareness testing.
        </p>
      </footer>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}

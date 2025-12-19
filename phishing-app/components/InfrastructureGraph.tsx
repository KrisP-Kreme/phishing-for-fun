import React, { useEffect, useRef, useState } from "react";

interface AttackSurface {
  vector: string;
  value: string;
  description: string;
  phishingTactic: string;
  riskSeverity?: "critical" | "high" | "medium" | "low" | "info";
  riskScore?: number;
  weight?: number;
}

interface RiskCategory {
  category: string;
  score: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  weight: number;
  findings: string[];
  attackVectors: string[];
}

interface InfrastructureGraphProps {
  domain: string;
  attackSurfaces: AttackSurface[];
  selectedSurface?: string;
  onSurfaceSelect?: (vector: string) => void;
  riskScores?: RiskCategory[];
}

interface NodePosition {
  x: number;
  y: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: {
    vector: string;
    riskScore: number;
    severity: string;
    tactic: string;
  } | null;
}

/**
 * Get color based on risk severity
 */
function getRiskColor(riskSeverity?: string, isHovered?: boolean, isSelected?: boolean): { fill: string; border: string } {
  const severityMap: Record<string, { fill: string; border: string; hoverFill: string; hoverBorder: string; selectFill: string; selectBorder: string }> = {
    critical: {
      fill: "#fee2e2",
      border: "#dc2626",
      hoverFill: "#fca5a5",
      hoverBorder: "#991b1b",
      selectFill: "#dc2626",
      selectBorder: "#7f1d1d",
    },
    high: {
      fill: "#fed7aa",
      border: "#f97316",
      hoverFill: "#fdba74",
      hoverBorder: "#c2410c",
      selectFill: "#f97316",
      selectBorder: "#7c2d12",
    },
    medium: {
      fill: "#fef08a",
      border: "#eab308",
      hoverFill: "#fde047",
      hoverBorder: "#b45309",
      selectFill: "#eab308",
      selectBorder: "#78350f",
    },
    low: {
      fill: "#d1fae5",
      border: "#10b981",
      hoverFill: "#a7f3d0",
      hoverBorder: "#047857",
      selectFill: "#10b981",
      selectBorder: "#064e3b",
    },
    info: {
      fill: "#dbeafe",
      border: "#0ea5e9",
      hoverFill: "#bfdbfe",
      hoverBorder: "#0369a1",
      selectFill: "#0ea5e9",
      selectBorder: "#082f49",
    },
  };

  const color = severityMap[riskSeverity || "info"];
  
  if (isSelected) {
    return { fill: color.selectFill, border: color.selectBorder };
  } else if (isHovered) {
    return { fill: color.hoverFill, border: color.hoverBorder };
  } else {
    return { fill: color.fill, border: color.border };
  }
}

/**
 * Get node radius based on risk score
 */
function getNodeRadius(riskScore?: number): number {
  if (!riskScore) return 40;
  // Scale from 35 to 60 based on risk score (0-100)
  return 35 + (riskScore / 100) * 25;
}

/**
 * Calculate overall risk metrics
 */
function calculateRiskMetrics(attackSurfaces: AttackSurface[], riskScores?: RiskCategory[]) {
  const scores = attackSurfaces.map(s => s.riskScore || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxScore = Math.max(...scores, 0);
  
  const severityCounts = {
    critical: attackSurfaces.filter(s => s.riskSeverity === "critical").length,
    high: attackSurfaces.filter(s => s.riskSeverity === "high").length,
    medium: attackSurfaces.filter(s => s.riskSeverity === "medium").length,
    low: attackSurfaces.filter(s => s.riskSeverity === "low").length,
    info: attackSurfaces.filter(s => s.riskSeverity === "info").length,
  };

  const totalFindings = riskScores?.reduce((sum, r) => sum + r.findings.length, 0) || 0;
  const uniqueVectors = new Set(riskScores?.flatMap(r => r.attackVectors) || []).size;

  return {
    avgScore,
    maxScore,
    severityCounts,
    totalFindings,
    uniqueVectors,
  };
}

/**
 * InfrastructureGraph - Visualizes domain and attack surfaces as a network graph
 * Similar to Bloodhound's central node with branches
 */
export const InfrastructureGraph: React.FC<InfrastructureGraphProps> = ({
  domain,
  attackSurfaces,
  selectedSurface,
  onSurfaceSelect,
  riskScores,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [showMetrics, setShowMetrics] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  const metrics = calculateRiskMetrics(attackSurfaces, riskScores);

  // Calculate node positions in a circular layout
  useEffect(() => {
    const newPositions = new Map<string, NodePosition>();
    
    // Center position for domain
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    newPositions.set("domain", { x: centerX, y: centerY });

    // Circular layout for attack surfaces
    const radius = Math.min(dimensions.width, dimensions.height) / 3;
    attackSurfaces.forEach((surface, index) => {
      const angle = (index / attackSurfaces.length) * Math.PI * 2 - Math.PI / 2;
      newPositions.set(surface.vector, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    setPositions(newPositions);
  }, [attackSurfaces, dimensions]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Animation loop for pulse effects
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.02;
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1"; // Keep visible during animation
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || positions.size === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Get computed styles for colors
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue("--primary").trim() || "#2563EB";
    const mutedColor = style.getPropertyValue("--muted-foreground").trim() || "#9ca3af";
    const accentColor = style.getPropertyValue("--accent").trim() || "#3B82F6";
    const foregroundColor = style.getPropertyValue("--foreground").trim() || "#111111";

    // Clear canvas with subtle background
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connections from domain to attack surfaces with gradient
    const domainPos = positions.get("domain");
    if (domainPos) {
      attackSurfaces.forEach((surface) => {
        const surfacePos = positions.get(surface.vector);
        if (surfacePos) {
          // Create gradient for connection line - stronger for higher risk
          const riskIntensity = (surface.riskScore || 0) / 100;
          const lineColor = surface.riskSeverity === "critical" ? "#dc2626" :
                           surface.riskSeverity === "high" ? "#f97316" :
                           surface.riskSeverity === "medium" ? "#eab308" :
                           accentColor;

          const gradient = ctx.createLinearGradient(
            domainPos.x,
            domainPos.y,
            surfacePos.x,
            surfacePos.y
          );
          gradient.addColorStop(0, accentColor);
          gradient.addColorStop(1, lineColor + "60");

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2 + riskIntensity * 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Add shadow to lines
          ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          ctx.beginPath();
          ctx.moveTo(domainPos.x, domainPos.y);
          ctx.lineTo(surfacePos.x, surfacePos.y);
          ctx.stroke();

          ctx.shadowColor = "transparent";
        }
      });
    }

    // Draw domain node (center)
    if (domainPos) {
      const nodeRadius = 50;
      const isHovered = hoveredNode === "domain";

      // Draw shadow for domain node
      ctx.shadowColor = "rgba(37, 99, 235, 0.3)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Draw gradient fill for domain
      const domainGradient = ctx.createRadialGradient(
        domainPos.x - 10,
        domainPos.y - 10,
        10,
        domainPos.x,
        domainPos.y,
        nodeRadius
      );
      domainGradient.addColorStop(0, "#3b82f6");
      domainGradient.addColorStop(1, "#1d4ed8");

      ctx.fillStyle = domainGradient;
      ctx.beginPath();
      ctx.arc(domainPos.x, domainPos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isHovered ? "#ffffff" : "#0f172a";
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.stroke();

      ctx.shadowColor = "transparent";

      // Draw domain text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(domain.split(".")[0], domainPos.x, domainPos.y - 10);
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillText("Domain", domainPos.x, domainPos.y + 12);
    }

    // Draw attack surface nodes
    attackSurfaces.forEach((surface) => {
      const surfacePos = positions.get(surface.vector);
      if (!surfacePos) return;

      const baseRadius = getNodeRadius(surface.riskScore);
      const isHovered = hoveredNode === surface.vector;
      const isSelected = selectedSurface === surface.vector;

      // Calculate pulse animation for critical/high risk
      let nodeRadius = baseRadius;
      let pulseOpacity = 0;
      
      if (surface.riskSeverity === "critical" || surface.riskSeverity === "high") {
        const pulsePhase = Math.sin(timeRef.current * 3) * 0.5 + 0.5; // 0-1
        nodeRadius = baseRadius + (5 * pulsePhase);
        pulseOpacity = 0.3 * (1 - pulsePhase);
      }

      // Draw pulse ring for critical/high risk
      if (pulseOpacity > 0) {
        ctx.fillStyle = `rgba(${surface.riskSeverity === "critical" ? "220, 38, 38" : "249, 115, 22"}, ${pulseOpacity})`;
        ctx.beginPath();
        ctx.arc(surfacePos.x, surfacePos.y, nodeRadius + 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Get colors based on risk severity
      const { fill, border } = getRiskColor(surface.riskSeverity, isHovered, isSelected);

      // Draw shadow - more intense for higher risk
      const shadowIntensity = isSelected ? 0.4 : isHovered ? 0.25 : 0.15;
      const shadowColor = surface.riskSeverity === "critical" ? "rgba(220, 38, 38, " : 
                         surface.riskSeverity === "high" ? "rgba(249, 115, 22, " :
                         surface.riskSeverity === "medium" ? "rgba(234, 179, 8, " :
                         "rgba(37, 99, 235, ";
      ctx.shadowColor = shadowColor + shadowIntensity + ")";
      ctx.shadowBlur = isSelected ? 20 : isHovered ? 12 : 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = isSelected ? 8 : isHovered ? 4 : 2;

      // Draw gradient fill with risk-based colors
      const nodeGradient = ctx.createRadialGradient(
        surfacePos.x - 8,
        surfacePos.y - 8,
        8,
        surfacePos.x,
        surfacePos.y,
        baseRadius
      );

      nodeGradient.addColorStop(0, fill);
      nodeGradient.addColorStop(1, fill);

      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(surfacePos.x, surfacePos.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw border with better contrast
      ctx.strokeStyle = border;
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 2;
      ctx.stroke();

      ctx.shadowColor = "transparent";

      // Draw risk indicator badge
      if (surface.riskSeverity === "critical" || surface.riskSeverity === "high" || surface.riskSeverity === "medium") {
        const badgeRadius = 10;
        const badgeX = surfacePos.x + baseRadius - 12;
        const badgeY = surfacePos.y - baseRadius + 10;
        
        const badgeColor = surface.riskSeverity === "critical" ? "#dc2626" : 
                          surface.riskSeverity === "high" ? "#f97316" : "#eab308";
        
        // Badge background
        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Badge text - show risk score
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (surface.riskScore !== undefined) {
          const scoreDisplay = Math.round(surface.riskScore);
          ctx.fillText(scoreDisplay.toString(), badgeX, badgeY);
        } else {
          ctx.fillText("!", badgeX, badgeY);
        }
      }

      // Draw text
      const textColor = surface.riskSeverity === "critical" ? "#7f1d1d" :
                       surface.riskSeverity === "high" ? "#7c2d12" :
                       surface.riskSeverity === "medium" ? "#78350f" :
                       surface.riskSeverity === "low" ? "#064e3b" :
                       isSelected || isHovered ? "#0369a1" : "#082f49";
      ctx.fillStyle = textColor;
      ctx.font = `${isSelected ? "bold" : "600"} 12px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Wrap text if needed
      const text = surface.vector;
      const words = text.split(" ");

      if (words.length > 1) {
        ctx.fillText(words[0], surfacePos.x, surfacePos.y - 6);
        ctx.fillText(words.slice(1).join(" "), surfacePos.x, surfacePos.y + 6);
      } else {
        ctx.fillText(text, surfacePos.x, surfacePos.y);
      }
    });

    // Draw legend in corner
    const legendX = 15;
    const legendY = dimensions.height - 130;
    const legendWidth = 180;
    const legendHeight = 110;

    // Legend background
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, legendWidth, legendHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Legend title
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Risk Severity", legendX + 8, legendY + 6);

    // Legend items
    const legendItems = [
      { label: "Critical", color: "#dc2626" },
      { label: "High", color: "#f97316" },
      { label: "Medium", color: "#eab308" },
      { label: "Low", color: "#10b981" },
      { label: "Info", color: "#0ea5e9" },
    ];

    legendItems.forEach((item, index) => {
      const itemY = legendY + 22 + index * 16;
      
      // Color indicator
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX + 12, itemY + 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = "#4b5563";
      ctx.font = "10px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.label, legendX + 22, itemY);
    });

  }, [attackSurfaces, positions, hoveredNode, selectedSurface, dimensions]);

  // Handle mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || positions.size === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hoveredNodeName: string | null = null;
    let tooltipContent: TooltipState["content"] = null;

    // Check domain node
    const domainPos = positions.get("domain");
    if (domainPos) {
      const distance = Math.sqrt(
        Math.pow(x - domainPos.x, 2) + Math.pow(y - domainPos.y, 2)
      );
      if (distance < 50) {
        hoveredNodeName = "domain";
      }
    }

    // Check attack surface nodes
    if (!hoveredNodeName) {
      for (let i = 0; i < attackSurfaces.length; i++) {
        const surface = attackSurfaces[i];
        const pos = positions.get(surface.vector);
        if (!pos) continue;
        
        const nodeRadius = getNodeRadius(surface.riskScore);
        const distance = Math.sqrt(
          Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
        );
        if (distance < nodeRadius + 8) {
          hoveredNodeName = surface.vector;
          tooltipContent = {
            vector: surface.vector,
            riskScore: surface.riskScore || 0,
            severity: surface.riskSeverity || "info",
            tactic: surface.phishingTactic,
          };
          setTooltip({
            visible: true,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            content: tooltipContent,
          });
          break;
        }
      }
    }

    if (!hoveredNodeName) {
      setTooltip({ ...tooltip, visible: false });
    }

    setHoveredNode(hoveredNodeName);
    canvasRef.current.style.cursor = hoveredNodeName ? "pointer" : "default";
  };

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || positions.size === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check attack surface nodes
    for (let i = 0; i < attackSurfaces.length; i++) {
      const surface = attackSurfaces[i];
      const pos = positions.get(surface.vector);
      if (!pos) continue;
      
      const nodeRadius = getNodeRadius(surface.riskScore);
      const distance = Math.sqrt(
        Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
      );
      if (distance < nodeRadius + 8) {
        onSurfaceSelect?.(surface.vector);
        break;
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setTooltip({ ...tooltip, visible: false });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden relative"
      style={{ minHeight: "400px" }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full"
      />
      
      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="absolute bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-xs pointer-events-none z-10"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 10}px`,
            maxWidth: "250px",
          }}
        >
          <div className="font-semibold">{tooltip.content.vector}</div>
          <div className="text-gray-300 text-xs mt-1">
            Risk Score: <span className="text-yellow-300">{Math.round(tooltip.content.riskScore)}</span>
          </div>
          <div className="text-gray-300 text-xs">
            Severity: <span className={
              tooltip.content.severity === "critical" ? "text-red-400" :
              tooltip.content.severity === "high" ? "text-orange-400" :
              tooltip.content.severity === "medium" ? "text-yellow-400" :
              tooltip.content.severity === "low" ? "text-green-400" :
              "text-blue-400"
            }>{tooltip.content.severity.toUpperCase()}</span>
          </div>
          <div className="text-gray-300 text-xs mt-2 border-t border-gray-700 pt-2">
            <strong>Tactic:</strong> {tooltip.content.tactic}
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10">
        <h3 className="text-lg font-semibold mb-2">Risk Metrics</h3>
        <div className="text-sm">
          <div>Average Risk Score: <span className="font-bold">{metrics.avgScore}</span></div>
          <div>Max Risk Score: <span className="font-bold">{metrics.maxScore}</span></div>
          <div>Total Findings: <span className="font-bold">{metrics.totalFindings}</span></div>
          <div>Unique Attack Vectors: <span className="font-bold">{metrics.uniqueVectors}</span></div>
        </div>
        <button
          className="mt-2 text-blue-500 hover:underline"
          onClick={() => setShowMetrics(!showMetrics)}
        >
          {showMetrics ? "Hide Details" : "Show Details"}
        </button>
        {showMetrics && (
          <div className="mt-2 text-sm">
            <div>Critical: <span className="font-bold">{metrics.severityCounts.critical}</span></div>
            <div>High: <span className="font-bold">{metrics.severityCounts.high}</span></div>
            <div>Medium: <span className="font-bold">{metrics.severityCounts.medium}</span></div>
            <div>Low: <span className="font-bold">{metrics.severityCounts.low}</span></div>
            <div>Info: <span className="font-bold">{metrics.severityCounts.info}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
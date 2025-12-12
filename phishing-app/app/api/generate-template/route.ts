import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

interface ScrapedData {
  logo: string | null;
  banner: string | null;
  title_font: string | null;
  body_font: string | null;
}

interface OSINTResult {
  input: string;
  legal_entity: {
    name: string;
    jurisdiction?: string;
    registry_url?: string | null;
    confidence: number;
  };
  ownership?: Array<{
    name: string;
    type: "parent" | "subsidiary" | "affiliate";
    source: string;
    evidence: string;
    confidence: number;
  }>;
  technology_stack?: Array<{
    provider: string;
    category: "email" | "cloud" | "cms" | "analytics" | "security" | "other";
    detection: string;
    source: string;
    confidence: number;
  }>;
  website_developer?: {
    agency_name: string | null;
    agency_domain: string | null;
    evidence: string;
    source: string;
    confidence: number;
  };
  partners?: Array<{
    name: string;
    type: "strategic" | "supplier" | "program" | "event";
    source: string;
    confidence: number;
  }>;
  digital_assets?: {
    domains?: string[];
    social_handles?: Array<{ platform: string; handle: string }>;
    apps?: Array<{ name: string; platform: string }>;
  };
}

interface SelectedAffiliated {
  domain: string;
  source: string;
  confidence: number;
  note?: string;
}

/**
 * AI-Powered Email Template Generator
 * 
 * Purpose: Generate realistic HTML email templates using Google Gemini AI.
 * Scraped brand assets (logo, banner, fonts) and site analysis are passed as JSON context.
 * This is strictly for educational and phishing-awareness simulation purposes.
 */

/**
 * Safe wrapper to call Google Gemini AI with timeout and error handling
 */
async function callGroqLlama(prompt: string, systemPrompt: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing from environment variables");
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",      // llama model
    temperature: 0.7,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });

  const output = response.choices?.[0]?.message?.content;
  if (!output) throw new Error("No response from Groq/Llama");

  return output;
}

/**
 * Perform OSINT analysis on a domain to find affiliated companies and services
 */
async function performOSINTAnalysis(domain: string): Promise<{ osintResult: OSINTResult | null; selectedAffiliated?: SelectedAffiliated | null }> {
  const osintPrompt = `You are an OSINT analyst. Analyze the given company using ONLY public sources. Return valid JSON only.

INVESTIGATION AREAS:

Legal Entity - Check ABN/ASIC, OpenCorporates, official websites
Ownership - Parent companies, subsidiaries from registries/annual reports
Tech Stack - DNS (MX/SPF), HTML source, app stores, job postings
Partners - Official partnership pages, press releases, events. Also, identify partner, supplier, or affiliation logos displayed on the website's pages (e.g., homepage, footer, service pages) Please pay special attention to these.
Website Developer - Look for "made by", "designed by", "developed by", footer credits, meta tags
Digital Assets - Domains, social media, apps
CONFIDENCE SCORING:
1.0 = Official registry/direct statement
0.8-0.9 = Multiple sources or strong single source
0.6-0.7 = Technical evidence (DNS/HTML) or single mention
0.4-0.5 = Circumstantial/pattern-based
<0.4 = Weak/speculative

OUTPUT JSON ONLY (no markdown, no explanations):

json
{
"input": "string",
"legal_entity": {
"name": "string",
"jurisdiction": "string",
"registry_url": "string or null",
"confidence": 0.0-1.0
},
"ownership": [
{
"name": "string",
"type": "parent|subsidiary|affiliate",
"source": "string",
"evidence": "string",
"confidence": 0.0-1.0
}
],
"technology_stack": [
{
"provider": "string",
"category": "email|cloud|cms|analytics|security|other",
"detection": "dns|html|app_store|press",
"source": "string",
"confidence": 0.0-1.0
}
],
"website_developer": {
"agency_name": "string or null",
"agency_domain": "string or null",
"evidence": "string",
"source": "string",
"confidence": 0.0-1.0
},
"partners": [
{
"name": "string",
"type": "strategic|supplier|program|event",
"source": "string",
"confidence": 0.0-1.0
}
],
"digital_assets": {
"domains": ["string"],
"social_handles": [{"platform": "string", "handle": "string"}],
"apps": [{"name": "string", "platform": "string"}]
}
}
RULES:

Only verified public data
Omit fields with no evidence
Website developer gets high confidence (0.85+) if explicitly credited
Output must be valid JSON only

Analyze domain: ${domain}`;

  const systemPrompt = `You are an expert OSINT analyst specializing in company research using only publicly available sources. Your task is to investigate a company and return structured JSON data about their legal entity, ownership structure, technology stack, partners, website developer, and digital assets.`;

  try {
  const response = await callGroqLlama(osintPrompt, systemPrompt);
    
    // Extract JSON from response (handle potential markdown formatting)
    let jsonStr = response;
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else if (response.startsWith("```")) {
      jsonStr = response.replace(/```[\s\S]*?\n/, "").replace(/```$/, "");
    }
    
    const result = JSON.parse(jsonStr) as OSINTResult;

    // Immediately select best affiliated service from OSINT results
    try {
      const selected = selectBestAffiliatedService(result);
      return { osintResult: result, selectedAffiliated: selected };
    } catch (err) {
      console.error("Affiliated selection error:", err);
      return { osintResult: result, selectedAffiliated: null };
    }
  } catch (error: any) {
    console.error("OSINT analysis error:", error);
    return { osintResult: null, selectedAffiliated: null };
  }
}

/**
 * Select the best affiliated service based on confidence scores and OSINT analysis
 * Returns domain name with highest confidence score
 */
function selectBestAffiliatedService(osintResult: OSINTResult): SelectedAffiliated | null {
  const candidates: Array<{ domain: string; confidence: number; source: string; note?: string }> = [];

  // Check digital assets domains (highest priority - directly mentioned)
  if (osintResult.digital_assets?.domains && osintResult.digital_assets.domains.length > 0) {
    osintResult.digital_assets.domains.forEach((domain) => {
      // Filter out the primary domain (we want *other* affiliated domains here)
      if (domain !== osintResult.input) {
        candidates.push({ 
          domain, 
          confidence: 0.95, 
          source: "digital_assets",
        });
      }
    });
  }

  // Check affiliated companies from ownership (confidence >= 0.7)
  if (osintResult.ownership && osintResult.ownership.length > 0) {
    osintResult.ownership
      .filter((o) => o.type === "affiliate" && o.confidence >= 0.7)
      .forEach((o) => {
        // Try to convert company name to domain
        const baseDomain = o.name.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        
        // Try common TLDs
        [".com", ".com.au", ".co.uk", ".net"].forEach((tld) => {
          candidates.push({ 
            domain: baseDomain + tld, 
            confidence: o.confidence,
            source: `ownership_${o.type}`
          });
        });
      });
  }

  // Check partners (confidence >= 0.75)
  if (osintResult.partners && osintResult.partners.length > 0) {
    osintResult.partners
      .filter((p) => p.confidence >= 0.75)
      .forEach((p) => {
        const baseDomain = p.name.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        
        [".com", ".com.au", ".co.uk", ".net"].forEach((tld) => {
          candidates.push({ 
            domain: baseDomain + tld, 
            confidence: p.confidence * 0.9, // Slightly lower than ownership
            source: `partner_${p.type}`
          });
        });
      });
  }

  // Check website developer (high credibility if found - confidence >= 0.85)
  if (osintResult.website_developer?.agency_domain && osintResult.website_developer.confidence >= 0.85) {
    candidates.push({
      domain: osintResult.website_developer.agency_domain,
      confidence: osintResult.website_developer.confidence,
      source: "website_developer",
    });
  }

  // If we found no strong affiliate candidates yet, consider high-confidence
  // technology stack providers as LAST-RESORT candidates mapped to canonical domains.
  // These represent vendors/infrastructure (e.g., google.com, cloudflare.com) and
  // are assigned a reduced confidence so they are chosen only when nothing better exists.
  if (candidates.length === 0 && osintResult.technology_stack && osintResult.technology_stack.length > 0) {
    const providerMap: Record<string, string> = {
      "Google Workspace": "google.com",
      "Google Analytics": "google.com",
      "Google": "google.com",
      "Gmail": "google.com",
      "G Suite": "google.com",
      "Google Tag Manager": "google.com",
      "Cloudflare": "cloudflare.com",
      "Microsoft 365": "microsoft.com",
      "Office 365": "microsoft.com",
      "Shopify": "shopify.com",
      "Mailchimp": "mailchimp.com",
      "Salesforce": "salesforce.com",
      "AWS": "amazon.com",
      "Amazon Web Services": "amazon.com",
      "WordPress": "wordpress.com",
    };

    osintResult.technology_stack.forEach((t) => {
      const mapped = providerMap[t.provider];
      // Only consider providers with strong detection confidence (>= 0.8)
      if (mapped && t.confidence >= 0.8 && mapped !== osintResult.input) {
        // assign reduced confidence so they don't outrank real affiliates
        candidates.push({ domain: mapped, confidence: +(t.confidence * 0.75).toFixed(2), source: `technology_stack`, note: `mapped from provider: ${t.provider}` });
      }
    });
  }

  if (candidates.length === 0) {
    // No external affiliated candidates found.
    return null;
  }

  // Sort by confidence (descending) and return the best match
  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Tiebreaker: prefer digital_assets sources
    const aScore = a.source === "digital_assets" ? 1 : 0;
    const bScore = b.source === "digital_assets" ? 1 : 0;
    return bScore - aScore;
  });

  console.log(`Top 3 affiliated services found:`);
  candidates.slice(0, 3).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.domain} (confidence: ${c.confidence.toFixed(2)}, source: ${c.source}${c.note ? `, note: ${c.note}` : ""})`);
  });

  const selected = candidates[0];
  console.log(`Selected: ${selected.domain} with confidence ${selected.confidence.toFixed(2)} (source: ${selected.source}${selected.note ? `, note: ${selected.note}` : ""})`);
  return { domain: selected.domain, confidence: selected.confidence, source: selected.source, note: selected.note };
}

/**
 * Analyze target site for colors and contact info
 */
async function analyzeSite(
  domain: string
): Promise<{
  colors?: { primary?: string; accent?: string };
  contact?: { emails?: string[]; phones?: string[]; addresses?: string[] };
  theme?: string | null;
  logo_url?: string;
  banner_url?: string;
  title_font?: string;
  body_font?: string;
} | null> {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    } as any);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract theme color
    const theme =
      $('meta[name="theme-color"]').attr("content") ||
      $('meta[name="msapplication-TileColor"]').attr("content") ||
      null;

    // Collect hex colors from styles
    const colorCounts: Record<string, number> = {};
    const addColor = (c: string | null | undefined) => {
      if (!c) return;
      const m = c.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
      if (m) {
        const hex = m[0].length === 4 ? expandShortHex(m[0]) : m[0];
        colorCounts[hex.toUpperCase()] = (colorCounts[hex.toUpperCase()] || 0) + 1;
      }
    };

    // Scan style tags
    $("style").each((_, el) => {
      const txt = $(el).html() || "";
      const matches = txt.match(/#([0-9a-fA-F]{3,6})/g);
      if (matches) matches.forEach((c) => addColor(c));
    });

    // Inline styles
    $("[style]").each((_, el) => {
      const s = $(el).attr("style") || "";
      const matches = s.match(/#([0-9a-fA-F]{3,6})/g);
      if (matches) matches.forEach((c) => addColor(c));
    });

    // External CSS files
    const cssLinks: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) cssLinks.push(resolveUrl(url, href));
    });

    await Promise.all(
      cssLinks.map(async (cssUrl) => {
        try {
          const r = await fetch(cssUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 8000,
          } as any);
          if (!r.ok) return;
          const css = await r.text();
          const matches = css.match(/#([0-9a-fA-F]{3,6})/g);
          if (matches) matches.forEach((c) => addColor(c));
        } catch (_) {}
      })
    );

    // Determine primary/accent colors
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    const primary = theme ? normalizeHex(theme) : sortedColors[0] || null;
    const accent = sortedColors[1] || sortedColors[0] || null;

    // Use Clearbit Logo API to get company logo
    let logoUrl: string | null = null;
    try {
      const hostname = new URL(url).hostname;
      if (hostname) {
        logoUrl = `https://logo.clearbit.com/${hostname}`;
      }
    } catch (_) {
      // ignore URL parse errors and leave logoUrl null
    }

    // find hero/banner image via og:image or large images in header
    let bannerUrl: string | null = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) bannerUrl = resolveUrl(url, ogImage);
    if (!bannerUrl) {
      const headerImgs = $('header img, .hero img, .banner img').toArray();
      if (headerImgs.length > 0) {
        const src = $(headerImgs[0]).attr('src');
        if (src) bannerUrl = resolveUrl(url, src);
      }
    }

    // Try to detect Google Fonts or inline font-family hints
    let title_font: string | null = null;
    let body_font: string | null = null;
    $('link[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!title_font && href.includes('fonts.googleapis.com')) {
        const m = href.match(/[?&]family=([^&]+)/);
        if (m) {
          const fam = decodeURIComponent(m[1]).split(':')[0].replace(/\+/g, ' ');
          title_font = `${fam}, Arial, sans-serif`;
        }
      }
    });
    if (!title_font) {
      const h = $('h1, h2').first();
      const inline = h.attr('style') || '';
      const m = inline.match(/font-family:\s*([^;]+)/i);
      if (m) title_font = m[1].trim();
    }
    if (!body_font) body_font = title_font || 'Arial, sans-serif';

    // Extract contact info
    const emails = new Set<string>();
    const phones = new Set<string>();
    const addresses: string[] = [];

    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const e = href.replace(/^mailto:/i, "").split("?")[0];
      if (e) emails.add(e);
    });

    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const p = href.replace(/^tel:/i, "").split("?")[0];
      if (p) phones.add(p);
    });

    $("footer, [class*='footer' i], [id*='footer' i]").each((_, el) => {
      const text = $(el).text();
      extractEmailsFromText(text).forEach((e) => emails.add(e));
      extractPhonesFromText(text).forEach((p) => phones.add(p));
    });

    $("address").each((_, el) => {
      const a = $(el).text().trim();
      if (a) addresses.push(a);
    });

    
    console.log("Logo URL ", logoUrl);

    return {
      colors: { primary: primary || undefined, accent: accent || undefined },
      contact: { emails: Array.from(emails), phones: Array.from(phones), addresses },
      theme: theme || null,
      logo_url: logoUrl || undefined,
      banner_url: bannerUrl || undefined,
      title_font: title_font || undefined,
      body_font: body_font || undefined,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Helper: expand short hex (#RGB -> #RRGGBB)
 */
function expandShortHex(shortHex: string): string {
  const hex = shortHex.replace("#", "");
  return "#" + hex.split("").map((c) => c + c).join("");
}

/**
 * Helper: normalize hex color
 */
function normalizeHex(input: string): string {
  const m = input.match(/#([0-9a-fA-F]{3,6})/);
  if (!m) return input;
  const hex = m[0];
  return hex.length === 4 ? expandShortHex(hex) : hex;
}

/**
 * Helper: extract emails from text
 */
function extractEmailsFromText(text: string): string[] {
  const out: string[] = [];
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const m = text.match(re);
  if (m) m.forEach((e) => out.push(e));
  return out;
}

/**
 * Helper: extract phones from text
 */
function extractPhonesFromText(text: string): string[] {
  const out: string[] = [];
  const re = /\+?[0-9][0-9\-() \u00A0]{6,}[0-9]/g;
  const m = text.match(re);
  if (m) m.forEach((p) => out.push(p.trim()));
  return out;
}

/**
 * Helper: resolve relative URLs
 */
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    if (relativeUrl.startsWith("http")) return relativeUrl;
    if (relativeUrl.startsWith("//")) return `https:${relativeUrl}`;
    const base = new URL(baseUrl);
    return new URL(relativeUrl, base).toString();
  } catch (err) {
    return relativeUrl;
  }
}

/**
 * Main handler: POST /api/generate-template
 * 
 * Request body:
 * {
 *   scrapedData: { logo, banner, title_font, body_font },
 *   domain: "example.com",
 *   override?: { primary?: "#hexcolor", accent?: "#hexcolor" }
 * }
 * 
 * Returns: { success: true, html: "<!DOCTYPE...", meta: { colors, contact, theme } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
  const { scrapedData, domain, override } = body;

  // Run OSINT analysis and pick an affiliated service (if any)
  const osintAnalysis = await performOSINTAnalysis(domain).catch(() => ({ osintResult: null, selectedAffiliated: null }));
  const osintResult = osintAnalysis?.osintResult ?? null;
  const selectedAffiliated = osintAnalysis?.selectedAffiliated ?? null; // SelectedAffiliated | null
  const targetDomain = selectedAffiliated?.domain || domain;
  console.log(`OSINT analysis result:`, osintResult);
  console.log(`Selected affiliated service: ${selectedAffiliated ? JSON.stringify(selectedAffiliated) : null}`);
  console.log(`Using target domain for analysis: ${targetDomain}`);

  if (!scrapedData || !domain) {
      return NextResponse.json(
        { error: "scrapedData and domain are required" },
        { status: 400 }
      );
    }

  // Analyze the target site (prefer affiliated service when available)
  const analysis = await analyzeSite(targetDomain).catch(() => null);

    // Extract company name
    const companyName = targetDomain
      .replace(/^www\./, "")
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // If an affiliated service was selected, prefer its scraped/analysis assets
    const effectiveScraped = { ...(scrapedData || {}) } as ScrapedData;
    if (selectedAffiliated && selectedAffiliated.domain && selectedAffiliated.domain !== domain) {
      if (analysis?.logo_url) effectiveScraped.logo = analysis.logo_url;
      if (analysis?.banner_url) effectiveScraped.banner = analysis.banner_url;
      if (analysis?.title_font) effectiveScraped.title_font = analysis.title_font;
      if (analysis?.body_font) effectiveScraped.body_font = analysis.body_font;
    }

    // Prepare JSON prompt for Claude (structured input)
    const generatorPrompt = JSON.stringify(
      {
        company_name: companyName,
        domain: targetDomain,
        branding: {
          logo_url: effectiveScraped.logo || null,
          banner_url: effectiveScraped.banner || null,
          title_font: effectiveScraped.title_font || "Arial, sans-serif",
          body_font: effectiveScraped.body_font || "Arial, sans-serif",
        },
        detected_colors: {
          primary: override?.primary || analysis?.colors?.primary || "#0066CC",
          accent: override?.accent || analysis?.colors?.accent || "#FF6B35",
          theme: analysis?.colors?.primary || "#0066CC",
        },
        contact_info:
          analysis?.contact || { emails: [], phones: [], addresses: [] },
      },
      null,
      2
    );

    // System prompt for Gemini
    const systemPrompt = `You are an expert HTML email template designer specializing in creating highly realistic company communications for cybersecurity awareness training and phishing simulation.

You will receive a JSON object containing company branding data (logo, colors, fonts, contact information, and website details).

Your task: Generate a complete, production-quality HTML email template that perfectly mimics legitimate corporate communications using ONLY publicly available branding information.

CRITICAL REQUIREMENTS:

Design & Rendering:
- Use ONLY inline CSS (no external stylesheets or <link> tags) for maximum email client compatibility
- Ensure full responsiveness with media queries for mobile devices (320px-600px+)
- Template must render identically across Gmail, Outlook, Apple Mail, and mobile clients
- Use table-based layouts for maximum email client compatibility

Branding Authenticity:
- Replicate the company's exact visual identity using provided colors (primary, accent, theme)
- Apply specified fonts (title_font, body_font) with web-safe fallbacks
- Include company logo in header (use ONLY URLs provided in JSON)
- Match the tone, language style, and formatting typical of the company's industry
- Add realistic header navigation (Account, Support, Settings) if appropriate
- Design must be indistinguishable from legitimate company emails

Content Strategy:
- Create urgent, time-sensitive messaging (security alerts, account verification, limited offers, policy updates)
- Include realistic body content relevant to the company's industry and services
- Use professional, corporate language with appropriate urgency markers
- Add specific details like account numbers, reference IDs, or transaction amounts (placeholders)
- Include realistic call-to-action with proper button styling and urgency language

Essential Components:
- Professional header with logo and optional navigation
- Compelling subject-line-worthy content in preview text
- Prominent, accessible CTA button with hover states
- Detailed footer with: company address, contact links, social media icons (if brand-appropriate), privacy policy link, unsubscribe link placeholder
- Email client-safe HTML structure using tables for layout

Educational Compliance:
- Include subtle disclaimer in footer: "This email was auto-generated for cybersecurity awareness training purposes."
- Add HTML comment at top: <!-- Educational phishing simulation template - Not for malicious use -->
- Ensure all links point to legitimate public company domains (where applicable)

Technical Standards:
- Valid, semantic HTML5 structure starting with <!DOCTYPE html>
- Proper alt text for all images
- Valid hex color codes throughout
- WCAG 2.1 accessibility guidelines (color contrast, font sizes)
- Maximum width: 600px for optimal email rendering
- Safe fonts with fallback stacks (e.g., Arial, Helvetica, sans-serif)

OUTPUT FORMAT:
Return ONLY the complete, render-ready HTML email code. No markdown formatting, no code blocks, no explanations. The output must be copy-paste ready for direct use in email clients or simulation platforms.

The final template should be so realistic that it serves as an effective training tool to demonstrate how easily corporate communications can be imitated using publicly available information.`;;

    // Call Gemini AI to generate the template
    const htmlTemplate = await callGroqLlama(generatorPrompt, systemPrompt);

    // Validate that Claude returned HTML
    if (!htmlTemplate.includes("<!DOCTYPE") && !htmlTemplate.includes("<html")) {
      throw new Error(
        "Claude did not return valid HTML. Please check the request and try again."
      );
    }

    return NextResponse.json({
      success: true,
      html: htmlTemplate,
      meta: { analysis: analysis || {}, osint: osintResult || null, selectedAffiliated: selectedAffiliated || null },
    });
  } catch (error: any) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      {
        error: error.message || "Template generation failed",
        hint: error.message?.includes("GOOGLE_GEMINI_API_KEY")
          ? "Set GOOGLE_GEMINI_API_KEY in .env.local"
          : undefined,
      },
      { status: 500 }
    );
  }
}

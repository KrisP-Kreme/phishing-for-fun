import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface ScrapedData {
  logo: string | null;
  banner: string | null;
  title_font: string | null;
  body_font: string | null;
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
async function callGeminiAI(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GEMINI_API_KEY environment variable not set. Please add it to .env.local"
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Combine system prompt and user prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
          },
        }),
        // @ts-ignore
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Gemini API error: ${response.status} - ${
          errorData?.error?.message ||
          errorData.error?.details?.[0]?.detail ||
          JSON.stringify(errorData)
        }`
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text response from Gemini");
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
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

    return {
      colors: { primary: primary || undefined, accent: accent || undefined },
      contact: { emails: Array.from(emails), phones: Array.from(phones), addresses },
      theme: theme || null,
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

    if (!scrapedData || !domain) {
      return NextResponse.json(
        { error: "scrapedData and domain are required" },
        { status: 400 }
      );
    }

    // Analyze the site for colors and contact info
    const analysis = await analyzeSite(domain).catch(() => null);

    // Extract company name
    const companyName = domain
      .replace(/^www\./, "")
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Prepare JSON prompt for Claude (structured input)
    const generatorPrompt = JSON.stringify(
      {
        company_name: companyName,
        domain: domain,
        branding: {
          logo_url: scrapedData.logo || null,
          banner_url: scrapedData.banner || null,
          title_font: scrapedData.title_font || "Arial, sans-serif",
          body_font: scrapedData.body_font || "Arial, sans-serif",
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
    const htmlTemplate = await callGeminiAI(generatorPrompt, systemPrompt);

    // Validate that Claude returned HTML
    if (!htmlTemplate.includes("<!DOCTYPE") && !htmlTemplate.includes("<html")) {
      throw new Error(
        "Claude did not return valid HTML. Please check the request and try again."
      );
    }

    return NextResponse.json({
      success: true,
      html: htmlTemplate,
      meta: analysis || {},
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

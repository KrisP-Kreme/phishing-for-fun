import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { callGroqAI } from "@/lib/ai/groq-client";

interface ScrapedData {
  logo: string | null;
  banner: string | null;
  title_font: string | null;
  body_font: string | null;
}

/**
 * AI-Powered Email Template Generator
 * 
 * Purpose: Generate realistic HTML email templates using GROQ API with LLaMA models.
 * Scraped brand assets (logo, banner, fonts) and site analysis are passed as JSON context.
 * This is strictly for educational and phishing-awareness simulation purposes.
 * 
 * MIGRATION NOTE: Replaced Google Gemini with GROQ + LLaMA-3.3-70b-versatile
 * (upgraded from deprecated LLaMA-3.1-70b-versatile on January 24, 2025)
 * Function signatures and response shapes remain identical for drop-in compatibility.
 */

/**
 * Helper: Determine if a color is too light or too dark for readability
 */
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Helper: Get contrast ratio between two colors (WCAG standard)
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Helper: Filter out colors that are too light, too dark, or neutral
 */
function isViableColor(hex: string): boolean {
  const luminance = getLuminance(hex);
  // Exclude near-white (>0.95) and near-black (<0.05)
  // Exclude near-gray (low saturation in HSL space)
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  return luminance > 0.1 && luminance < 0.9 && saturation > 0.15;
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

    // Collect hex colors from styles with frequency count
    const colorCounts: Record<string, number> = {};
    const addColor = (c: string | null | undefined) => {
      if (!c) return;
      const m = c.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
      if (m) {
        const hex = m[0].length === 4 ? expandShortHex(m[0]) : m[0];
        const normalized = hex.toUpperCase();
        // Only count viable brand colors
        if (isViableColor(normalized)) {
          colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
        }
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

    // Determine primary/accent colors with contrast enforcement
    let primary: string | null = null;
    let accent: string | null = null;

    // Prefer theme color if it's a viable brand color
    if (theme) {
      const normalizedTheme = normalizeHex(theme);
      if (isViableColor(normalizedTheme)) {
        primary = normalizedTheme;
      }
    }

    // Sort colors by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    // Select primary if not already set
    if (!primary && sortedColors.length > 0) {
      primary = sortedColors[0];
    }

    // Select accent: prefer a color with good contrast to primary
    if (sortedColors.length > 1) {
      // Try to find a second color with good contrast
      for (let i = 1; i < sortedColors.length; i++) {
        const candidate = sortedColors[i];
        if (primary && getContrastRatio(primary, candidate) >= 2.5) {
          accent = candidate;
          break;
        }
      }
      // Fallback: if no good contrast found, just use second most frequent
      if (!accent) {
        accent = sortedColors[1];
      }
    } else if (primary) {
      // If only one color available, use it for accent too
      accent = primary;
    }

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

    console.log("\n🎨 EMAIL TEMPLATE GENERATION START");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Domain: ${domain}`);

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

    console.log(`\n🏢 Company: ${companyName}`);
    console.log("\n📸 BRANDING ASSETS:");

    // Determine final colors with logging
    const primaryColor = override?.primary || analysis?.colors?.primary || "#0066CC";
    const accentColor = override?.accent || analysis?.colors?.accent || "#FF6B35";

    console.log(`  ✓ Logo: ${scrapedData.logo ? "Found" : "Not found"}`);
    console.log(`  ✓ Banner: ${scrapedData.banner ? "Found" : "Not found"}`);
    console.log(`  ✓ Title Font: ${scrapedData.title_font || "Default (Arial)"}`);
    console.log(`  ✓ Body Font: ${scrapedData.body_font || "Default (Arial)"}`);

    console.log("\n🎨 COLOR PALETTE:");
    console.log(`  ✓ Primary: ${primaryColor} ${override?.primary ? "(override)" : ""}`);
    console.log(`  ✓ Accent: ${accentColor} ${override?.accent ? "(override)" : ""}`);
    
    if (analysis?.colors?.primary) {
      console.log(`  ℹ Primary Color Contrast: ${getContrastRatio(primaryColor, "#FFFFFF").toFixed(2)}:1 (vs white)`);
    }

    console.log("\n📋 CONTACT INFO DETECTED:");
    if (analysis?.contact?.emails?.length) {
      console.log(`  ✓ Email(s): ${analysis.contact.emails.join(", ")}`);
    }
    if (analysis?.contact?.phones?.length) {
      console.log(`  ✓ Phone(s): ${analysis.contact.phones.join(", ")}`);
    }
    if (analysis?.contact?.addresses?.length) {
      console.log(`  ✓ Address(es): ${analysis.contact.addresses.join(", ")}`);
    }

    // Prepare JSON prompt for LLaMA (structured input)
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

    // System prompt for GROQ/LLaMA-3.3-70b-versatile
    // Note: This prompt is model-agnostic and works identically with LLaMA as it did with Gemini
    const systemPrompt = `You are an expert HTML email template designer specializing in creating highly realistic, production-grade company communications for cybersecurity awareness training and phishing simulation.

You will receive a JSON object containing company branding data (logo, colors, fonts, contact information, and website details).

Your task: Generate a complete, pixel-perfect HTML email template that perfectly mimics legitimate corporate communications using ONLY publicly available branding information.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY EMAIL STRUCTURE (EXACT ORDER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DOCTYPE & Opening Tags
   <!DOCTYPE html>
   <html> with lang="en"
   <head> with charset, viewport, style tags
   <body> with margin/padding reset

2. Outer Wrapper (100% width, neutral background)
   <table width="100%" bgcolor="#f5f5f5" cellpadding="0" cellspacing="0">
   
3. Centered Container (600px max-width)
   Nested <table> with width="600" on centered row
   Critical: Use margin: 0 auto; on wrapper TD or nested table

4. HEADER SECTION (Required)
   - Logo placement: LEFT or CENTER alignment
   - Logo sizing: 24-40px height (NEVER exceed 80px)
   - Logo padding: 15px on all sides minimum
   - Navigation row (if applicable): Account | Support | Settings
   - Background color: Use primary brand color OR white with subtle divider

5. BANNER IMAGE SECTION (Conditional - Include ONLY if banner URL exists)
   - Full width inside 600px container (600px width)
   - Max height: 240px (NEVER exceed)
   - Proper <img> tag with alt text, no background images
   - Padding: Top 10px, Bottom 10px
   - If NO banner provided: OMIT this section entirely (no empty space)

6. BODY CONTENT SECTION (Required)
   - Background: White (#ffffff)
   - Padding: 25-30px left/right, 20px top/bottom
   - Line height: 1.6 for readability
   - Font size: 14-16px for body text
   - Heading size: 20-24px
   - CTA prominently placed (not buried)

7. CTA BUTTON SECTION (Required)
   - Use <a> with inline styles (NO <button> tags)
   - Button padding: 12px 24px minimum
   - Background color: Primary brand color OR #0066CC fallback
   - Text color: White, bold
   - Border-radius: 4px-6px
   - Font-size: 14-16px
   - Margin: 15px 0

8. FOOTER SECTION (Required)
   - Background: Light gray (#f5f5f5) OR slightly darker than body
   - Padding: 20px
   - Font size: 12px
   - Content order:
     a. Company name, address, contact info
     b. Links: Privacy Policy | Unsubscribe
     c. Social media icons (text links, NO SVG)
     d. MANDATORY disclaimer: "This email was auto-generated for cybersecurity awareness training purposes."
   - Border-top: 1px solid #dddddd
   - Text color: #666666

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLOR PALETTE ENFORCEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary Color Application:
- Header background OR header text
- CTA button background
- Links in body

Accent Color Application:
- Secondary CTA buttons (if multiple)
- Dividers/borders between sections
- Highlight text or callout boxes

Neutral Colors (Fixed):
- Body background: #ffffff
- Footer background: #f5f5f5
- Text: #333333 or #1a1a1a
- Borders: #dddddd or #e0e0e0

Color Contrast Rules:
- CTA button text MUST have contrast ratio ≥ 4.5:1 with background
- Primary color on white background: minimum 3:1 contrast
- If primary color is light: Use dark text OR add subtle background shade

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPOGRAPHY & FONT HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NO @font-face, NO CSS variables, NO icon fonts

Apply provided fonts ONLY as-is (already email-safe):
- title_font: Apply to <h1>, <h2>, headings (24px weight: bold)
- body_font: Apply to paragraph text, labels (14-16px weight: normal)

Font Stack Format:
  style="font-family: <provided_font>, Arial, Helvetica, sans-serif;"

Typography Rules:
- H1/H2: Bold, 20-28px
- Body text: Normal, 14-16px
- Labels/captions: 12-13px, #666666
- Links: Underline, primary color
- All font sizes: FIXED (no relative units)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE-BASED LAYOUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All structural elements MUST use HTML tables:
- cellpadding="0"
- cellspacing="0"
- border="0"
- All widths specified in pixels (600px max)
- Use <tr>, <td> for rows/cells
- Nested tables for complex layouts

DO NOT use:
- CSS Grid, Flexbox
- Block elements for layout
- Div-based layouts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL HIERARCHY CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Logo clearly visible in header (not tiny, not oversized)
✓ Heading immediately grabs attention (large, bold, primary color)
✓ Subheading provides context (slightly smaller, clear intent)
✓ Body text organized in short paragraphs (max 3-4 lines)
✓ CTA button is PROMINENT (centered, colored, padded, obvious link)
✓ Footer is distinct (separated by border, smaller text, neutral color)
✓ Whitespace used effectively (padding/margins prevent crowding)
✓ Color distribution: Primary on CTA + accents, neutral elsewhere
✓ Images (logo/banner) are high-quality and properly scaled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT GUIDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create urgent, time-sensitive messaging:
- Security alerts, account verification needed, limited-time offers, policy updates
- Include specific details: account numbers (#AB12345), timestamps, reference IDs
- Use professional corporate language with appropriate urgency
- Include realistic body content relevant to the company's industry/services
- Add realistic call-to-action (verify now, claim offer, update payment method)

Email Client Compatibility:
- Test assumptions: Must render correctly in Gmail, Outlook, Apple Mail, mobile
- NO hover effects, NO animations, NO JavaScript
- NO external stylesheets, NO @media queries unless explicitly requested
- NO SVG icons (use text links instead)
- Use absolute URLs for all images and links

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDUCATIONAL COMPLIANCE & DISCLAIMERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mandatory Elements:
1. HTML comment at top: <!-- Educational phishing simulation template -->
2. Footer disclaimer: "This email was auto-generated for cybersecurity awareness training purposes."
3. Disclaimer must NOT be removable or hidden
4. Ensure all links point to legitimate public company domains

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY the complete, render-ready HTML code:
- NO markdown formatting
- NO code blocks
- NO explanations or comments (except education compliance HTML comment)
- Copy-paste ready for direct email client use
- Valid HTML5 structure
- All inline styles preserved
- All images use absolute URLs

The final template should be indistinguishable from legitimate company emails while remaining compliant with email client constraints.`;

    // Call GROQ AI (LLaMA-3.3-70b-versatile) to generate the template
    // Function signature and behavior identical to previous Gemini implementation
    console.log("\n🤖 CALLING GROQ API");
    console.log("  Model: llama-3.3-70b-versatile");
    console.log("  Max tokens: 4096");
    
    const htmlTemplate = await callGroqAI(generatorPrompt, systemPrompt);

    console.log("\n✅ TEMPLATE GENERATION COMPLETE");

    // Validate that LLaMA returned HTML
    if (!htmlTemplate.includes("<!DOCTYPE") && !htmlTemplate.includes("<html")) {
      throw new Error(
        "LLaMA model did not return valid HTML. Please check the request and try again."
      );
    }

    console.log("\n📊 TEMPLATE VALIDATION:");
    console.log(`  ✓ Valid HTML5 structure`);
    console.log(`  ✓ Template size: ${(htmlTemplate.length / 1024).toFixed(2)}KB`);
    console.log(`  ✓ Includes disclaimer: ${htmlTemplate.includes("cybersecurity awareness training") ? "Yes" : "No"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return NextResponse.json({
      success: true,
      html: htmlTemplate,
      meta: analysis || {},
    });
  } catch (error: any) {
    console.error("\n❌ TEMPLATE GENERATION ERROR:", error.message);
    return NextResponse.json(
      {
        error: error.message || "Template generation failed",
        hint: error.message?.includes("GROQ_API_KEY")
          ? "Set GROQ_API_KEY in .env.local (get key from https://console.groq.com)"
          : undefined,
      },
      { status: 500 }
    );
  }
}

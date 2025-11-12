import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

async function scrapeDomain(domain: string) {
  try {
    // Ensure domain has a protocol
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

    // Fetch the HTML from the domain
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    } as any);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Parse logo from og:image, icon, or logo schema (exclude favicon.ico)
    let logo = $('link[rel="icon"]').attr("href");
    if (!logo) logo = $('link[rel="apple-touch-icon"]').attr("href");
    if (!logo) {
      const logoImg = $('img[alt*="logo" i]').first().attr("src");
      if (logoImg) logo = logoImg;
    }

    // Parse banner image
    let banner: string | undefined;

    // First try Open Graph image
    banner = $('meta[property="og:image"]').attr("content");
    if (!banner)
      banner = $('meta[property="og:image:secure_url"]').attr("content");

    // Then look for hero/banner images by class or id
    if (!banner)
      banner = $('img[class*="banner" i], img[id*="banner" i]')
        .first()
        .attr("src");
    if (!banner)
      banner = $('img[class*="hero" i], img[id*="hero" i]')
        .first()
        .attr("src");
    if (!banner)
      banner = $('img[class*="header" i], img[id*="header" i]')
        .first()
        .attr("src");

    // Try images in header/nav sections
    if (!banner) banner = $("header img, nav img").first().attr("src");

    // Last resort: find first large image (assume it's a banner)
    if (!banner) {
      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (
          src &&
          !src.includes("favicon") &&
          !src.includes("logo") &&
          !src.includes("icon")
        ) {
          banner = src;
          return false; // break
        }
      });
    }

    // Parse fonts from style tags and link tags
    const fonts: string[] = [];
    const baseUrl = new URL(url);

    // Check external CSS link tags and fetch their content
    const stylesheetPromises: Promise<void>[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const cssUrl = resolveUrl(url, href);
        stylesheetPromises.push(
          fetch(cssUrl, { 
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 5000,
          } as any)
            .then((res) => res.text())
            .then((css) => {
              // Extract font-family from fetched CSS
              const matches = css.match(/font-family:\s*([^;]+)/gi);
              if (matches) {
                matches.forEach((match) => {
                  const fontFamily = match.replace(/font-family:\s*/i, "").trim();
                  if (fontFamily && fontFamily.length > 0) fonts.push(fontFamily);
                });
              }
              // Also extract @font-face font names
              const fontFaceMatches = css.match(
                /@font-face\s*\{[^}]*font-family:\s*['"]?([^'"};]+)['"]?[^}]*\}/gi
              );
              if (fontFaceMatches) {
                fontFaceMatches.forEach((match) => {
                  const fontName = match.match(/font-family:\s*['"]?([^'"};]+)['"]?/i);
                  if (fontName && fontName[1]) {
                    fonts.push(`@font-face: ${fontName[1].trim()}`);
                  }
                });
              }
            })
            .catch(() => {}) // Ignore errors fetching CSS
        );
      }
    });

    // Wait for all stylesheet fetches to complete
    await Promise.all(stylesheetPromises);

    // Check inline styles on all elements
    $("*[style]").each((_, el) => {
      const style = $(el).attr("style");
      if (style) {
        const matches = style.match(/font-family:\s*([^;]+)/gi);
        if (matches) {
          matches.forEach((match) => {
            const fontFamily = match.replace(/font-family:\s*/i, "").trim();
            if (fontFamily && fontFamily.length > 0) fonts.push(fontFamily);
          });
        }
      }
    });

    // Check style tags for font-family declarations
    $("style").each((_, el) => {
      const styleContent = $(el).html();
      if (styleContent) {
        // Match all font-family declarations
        const matches = styleContent.match(/font-family:\s*([^;]+)/gi);
        if (matches) {
          matches.forEach((match) => {
            const fontFamily = match.replace(/font-family:\s*/i, "").trim();
            if (fontFamily && fontFamily.length > 0) fonts.push(fontFamily);
          });
        }

        // Also match @font-face declarations
        const fontFaceMatches = styleContent.match(
          /@font-face\s*\{[^}]*font-family:\s*['"]?([^'"};]+)['"]?[^}]*\}/gi
        );
        if (fontFaceMatches) {
          fontFaceMatches.forEach((match) => {
            const fontName = match.match(/font-family:\s*['"]?([^'"};]+)['"]?/i);
            if (fontName && fontName[1]) {
              fonts.push(`@font-face: ${fontName[1].trim()}`);
            }
          });
        }
      }
    });

    // Check Google Fonts links
    $('link[href*="fonts.googleapis.com"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        fonts.push(`Google Fonts: ${href}`);
        // Try to extract font names from the URL
        const params = new URLSearchParams(href.split("?")[1]);
        const family = params.get("family");
        if (family) {
          family.split("|").forEach((f) => {
            fonts.push(`  - ${f.trim()}`);
          });
        }
      }
    });

    // Check for Adobe Fonts (Typekit)
    $('link[href*="typekit.net"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) fonts.push(`Adobe Fonts: ${href}`);
    });

    // Check for @import in style tags
    $("style").each((_, el) => {
      const styleContent = $(el).html();
      if (styleContent) {
        const imports = styleContent.match(
          /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?;?/gi
        );
        if (imports) {
          imports.forEach((imp) => {
            fonts.push(`@import: ${imp.trim()}`);
          });
        }
      }
    });

    // Check for font-display and variable font declarations
    $("style").each((_, el) => {
      const styleContent = $(el).html();
      if (styleContent) {
        // Find src declarations in @font-face
        const srcMatches = styleContent.match(/src:\s*([^;]+);/gi);
        if (srcMatches) {
          srcMatches.forEach((match) => {
            fonts.push(`Font source: ${match.trim()}`);
          });
        }
      }
    });

    // Deduplicate and clean fonts
    const cleanedFonts = Array.from(new Set(fonts))
      .map((f) => {
        // Clean up the string
        let cleaned = f
          .replace(/['"]/g, "")
          .replace(/url\(|url\(|\)/g, "")
          .replace(/!important/gi, "")
          .trim();
        
        // Remove any CSS after font declaration (fix broken parsing)
        const semiColonIndex = cleaned.indexOf(".");
        if (semiColonIndex > 0 && cleaned.includes("}")) {
          cleaned = cleaned.substring(0, semiColonIndex).trim();
        }
        
        return cleaned;
      })
      .filter((f) => {
        // Remove empty strings and common CSS defaults
        if (
          !f ||
          f === "none" ||
          f === "inherit" ||
          f === "initial" ||
          f === "unset" ||
          f.length < 2
        ) {
          return false;
        }

        // Remove if it contains CSS selectors or properties (malformed)
        if (f.includes("{") || f.includes("}") || f.includes(":") || f.includes(";")) {
          return false;
        }

        // Remove icon fonts and icon-related fonts
        if (
          f.toLowerCase().includes("icon") ||
          f.toLowerCase().includes("awesome") ||
          f.toLowerCase().includes("symbol") ||
          f.toLowerCase().includes("font-awesome") ||
          f.toLowerCase().includes("fa-") ||
          f.toLowerCase().includes("slick") ||
          f.toLowerCase().includes("dingbat")
        ) {
          return false;
        }

        // Remove CSS variables and var() declarations
        if (f.includes("var(") || f.includes("--")) {
          return false;
        }

        // Remove generic variable names (single words like "primary", "body", "button")
        if (
          /^(primary|body|button|text|heading|title|display|mono|serif|sans)$/i.test(
            f
          )
        ) {
          return false;
        }

        // Remove @font-face labels
        if (f.startsWith("@font-face:")) {
          return false;
        }

        // Remove stylesheet and import labels
        if (
          f.startsWith("Stylesheet:") ||
          f.startsWith("@import:") ||
          f.startsWith("Font source:") ||
          f.startsWith("Google Fonts:") ||
          f.startsWith("Adobe Fonts:")
        ) {
          return false;
        }

        // Only keep fonts with actual names
        const fontStack = f.split(",").map((x) => x.trim());
        const firstFont = fontStack[0];

        // If it's a single generic keyword (serif, sans-serif, monospace), skip
        if (
          /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(
            firstFont
          )
        ) {
          return false;
        }

        // Keep if it has a real font name
        return firstFont.length > 2;
      });

    // Categorize fonts into heading and body
    const headingFonts: string[] = [];
    const bodyFonts: string[] = [];

    cleanedFonts.forEach((font) => {
      const lower = font.toLowerCase();
      // Fonts typically used for headings
      if (
        lower.includes("bold") ||
        lower.includes("display") ||
        lower.includes("headline") ||
        lower.includes("serif") ||
        /[A-Z][a-z]+[A-Z]/.test(font) // camelCase fonts like "Garamond"
      ) {
        headingFonts.push(font);
      } else {
        bodyFonts.push(font);
      }
    });

    // Return max 1 heading font and 1 body font
    const finalFonts: string[] = [];
    if (headingFonts.length > 0) finalFonts.push(headingFonts[0]);
    if (bodyFonts.length > 0) finalFonts.push(bodyFonts[0]);

    // Check if banner and logo are the same URL
    let finalBanner = banner ? resolveUrl(url, banner) : null;
    let finalLogo = logo ? resolveUrl(url, logo) : null;

    // If banner and logo are identical, keep banner and set logo to null
    // (logo is typically a favicon/small icon, banner is the main visual)
    if (
      finalBanner &&
      finalLogo &&
      finalBanner === finalLogo
    ) {
      finalLogo = null;
    }

    return {
      domain,
      logo: finalLogo,
      banner: finalBanner,
      fonts: finalFonts,
    };
  } catch (error: any) {
    throw new Error(`Scraping failed: ${error.message}`);
  }
}

// Helper to resolve relative URLs
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  if (relativeUrl.startsWith("http")) return relativeUrl;
  if (relativeUrl.startsWith("//"))
    return `https:${relativeUrl}`;
  const base = new URL(baseUrl);
  return new URL(relativeUrl, base).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const data = await scrapeDomain(domain);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Scraping failed" },
      { status: 500 }
    );
  }
}

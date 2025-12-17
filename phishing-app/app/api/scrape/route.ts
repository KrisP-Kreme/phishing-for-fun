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
    let logo: string | null = $('link[rel="icon"]').attr("href") || null;
    if (!logo) logo = $('link[rel="apple-touch-icon"]').attr("href") || null;
    
    // Filter out favicon.ico if it was selected
    if (logo && logo.includes("favicon.ico")) {
      logo = null;
    }
    
    if (!logo) {
      const logoImg = $('img[alt*="logo" i]').first().attr("src");
      if (logoImg) logo = logoImg;
    }
    if (logo) console.log("✓ Logo found (icon/apple-touch-icon/alt text):", logo);
    
    // If still no logo, try other image sources
    if (!logo) {
      // Try og:image as logo (high priority)
      logo = $('meta[property="og:image"]').attr("content") || null;
      if (logo) console.log("✓ Logo found (og:image):", logo);
    }
    
    // If still no logo, look for images in header/nav with common logo classes
    if (!logo) {
      logo = $('header img, nav img, .logo img, #logo img, [class*="logo"] img, [class*="brand"] img')
        .first()
        .attr("src") || null;
      if (logo) console.log("✓ Logo found (header/nav/logo classes):", logo);
    }
    
    // If still no logo, try images with specific role attributes
    if (!logo) {
      logo = $('img[role="img"], img[aria-label*="logo" i], img[title*="logo" i]')
        .first()
        .attr("src") || null;
      if (logo) console.log("✓ Logo found (role/aria-label/title):", logo);
    }
    
    // Last resort: take the first non-banner image from header/nav that's reasonably sized
    if (!logo) {
      $("header img, nav img").each((_, el) => {
        const src = $(el).attr("src");
        const width = $(el).attr("width");
        const height = $(el).attr("height");
        
        if (
          src &&
          !src.includes("banner") &&
          !src.includes("hero") &&
          !src.includes("background") &&
          !src.includes("loader") &&
          !src.includes("spinner")
        ) {
          logo = src;
          console.log("✓ Logo found (fallback header/nav image):", logo);
          return false; // break
        }
      });
    }
    if (!logo) console.log("⚠ No logo found for", domain);

    // Parse banner image with advanced context-aware detection
    let banner: string | undefined;

    // Strategy 1: Open Graph image (most reliable for social sharing / hero images)
    banner = $('meta[property="og:image"]').attr("content") || undefined;
    if (!banner)
      banner = $('meta[property="og:image:secure_url"]').attr("content") || undefined;
    if (banner) console.log("✓ Banner found (og:image):", banner);

    // Strategy 1b: Twitter card image (alternative marketing image)
    if (!banner) {
      banner = $('meta[name="twitter:image"]').attr("content") || undefined;
      if (banner) console.log("✓ Banner found (twitter:image):", banner);
    }

    if (!banner)
      banner = $('img[class*="banner" i], img[id*="banner" i]')
        .first()
        .attr("src") || undefined;
    if (!banner)
      banner = $('img[class*="hero" i], img[id*="hero" i]')
        .first()
        .attr("src") || undefined;
    if (!banner)
      banner = $('img[class*="header" i], img[id*="header" i]')
        .first()
        .attr("src") || undefined;
    if (!banner)
      banner = $('img[class*="featured" i], img[id*="featured" i]')
        .first()
        .attr("src") || undefined;
    if (!banner)
      banner = $('img[class*="main-visual" i], img[id*="main-visual" i]')
        .first()
        .attr("src") || undefined;

    // Strategy 3: Look for images in common banner containers
    if (!banner) {
      banner = $('section:first-child img, [role="banner"] img, .hero img, #hero img, .main-visual img, .featured-image img, .homepage-hero img')
        .first()
        .attr("src") || undefined;
    }

    // Strategy 4: Detect background images from CSS (via inline styles or common patterns)
    if (!banner) {
      let bannerFromBg: string | undefined;
      $('[class*="hero" i], [class*="banner" i], [class*="header" i], [class*="featured" i], section:first-child').each((_, el) => {
        const style = $(el).attr("style");
        if (style) {
          const bgMatch = style.match(/background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)?/i);
          if (bgMatch && bgMatch[1]) {
            bannerFromBg = bgMatch[1];
            return false; // break
          }
        }
      });
      if (bannerFromBg) banner = bannerFromBg;
    }

    // Strategy 5: Find largest/most prominent image in viewport (likely hero)
    if (!banner) {
      interface ImageScore {
        src: string;
        score: number;
      }
      let largestImg: ImageScore | null = null;

      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (!src) return;
        
        const srcStr = typeof src === 'string' ? src : String(src);
        const width = parseInt($(el).attr("width") || "0") || 0;
        const height = parseInt($(el).attr("height") || "0") || 0;
        const alt = $(el).attr("alt") || "";
        
        // Skip obvious non-banner images
        if (
          srcStr.includes("favicon") ||
          srcStr.includes("logo") ||
          srcStr.includes("icon") ||
          srcStr.includes("pixel") ||
          srcStr.includes("tracker") ||
          srcStr.includes("ad") ||
          srcStr.includes("advertisement") ||
          srcStr.includes("product") ||
          srcStr.includes("thumbnail") ||
          srcStr.includes("thumb") ||
          srcStr.includes("avatar") ||
          srcStr.includes("profile") ||
          srcStr.includes("spinner") ||
          srcStr.includes("loader") ||
          alt.toLowerCase().includes("icon") ||
          alt.toLowerCase().includes("logo") ||
          alt.toLowerCase().includes("product") ||
          alt.toLowerCase().includes("thumbnail")
        ) {
          return; // continue
        }

        // Calculate a score based on context clues
        let score = 0;

        // Width/height heuristics (banners are typically wide)
        if (width > 800 || height > 300) score += 50;
        if (width > 1200) score += 30;

        // Alt text indicating hero/banner/featured
        if (alt.toLowerCase().includes("hero") || alt.toLowerCase().includes("banner") || alt.toLowerCase().includes("featured")) score += 100;

        // Parent container context
        const parent = $(el).parent();
        const parentClass = parent.attr("class") || "";
        const parentId = parent.attr("id") || "";
        if (
          parentClass.toLowerCase().includes("hero") ||
          parentClass.toLowerCase().includes("banner") ||
          parentClass.toLowerCase().includes("featured") ||
          parentClass.toLowerCase().includes("header") ||
          parentId.toLowerCase().includes("hero") ||
          parentId.toLowerCase().includes("banner") ||
          parentId.toLowerCase().includes("featured")
        ) {
          score += 80;
        }

        // Image inside <section>, <header>, or <main> early in DOM
        const section = $(el).closest("section, header, main, [role='banner']");
        if (section.length > 0 && section.index() <= 1) score += 60;

        // URL patterns suggesting promotional/hero imagery
        if (srcStr.includes("hero") || srcStr.includes("banner") || srcStr.includes("featured") || srcStr.includes("main")) score += 40;
        if (srcStr.includes("marketing") || srcStr.includes("campaign")) score += 35;

        // Keep track of the highest-scoring image
        if (score > 0 && (!largestImg || score > largestImg.score)) {
          largestImg = { src: srcStr, score };
        }
      });

      if (largestImg && "src" in largestImg) {
        banner = (largestImg as any).src;
      }
    }

    // Strategy 6: Fallback to first meaningful image in header/nav/main
    if (!banner) banner = $("header img, nav img, main img").first().attr("src") || undefined;

    // Strategy 7: Last resort - first non-excluded image
    if (!banner) {
      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (
          src &&
          !src.includes("favicon") &&
          !src.includes("logo") &&
          !src.includes("icon") &&
          !src.includes("ad") &&
          !src.includes("tracker") &&
          !src.includes("pixel")
        ) {
          banner = src;
          return false; // break
        }
      });
    }

    // Parse fonts from style tags and link tags
    const fonts: string[] = [];
    const baseUrl = new URL(url);
    console.log("\n📄 Scraping fonts from:", domain);

    // Check external CSS link tags and fetch their content
    const stylesheetPromises: Promise<void>[] = [];
    const stylesheetCount = $('link[rel="stylesheet"]').length;
    if (stylesheetCount > 0) console.log(`  → Found ${stylesheetCount} external stylesheets`);
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
                console.log(`    ✓ Found ${matches.length} font-family declarations in stylesheet`);
                matches.forEach((match) => {
                  const fontFamily = match.replace(/font-family:\s*/i, "").trim();
                  if (fontFamily && fontFamily.length > 0) {
                    fonts.push(fontFamily);
                    console.log(`      - ${fontFamily}`);
                  }
                });
              }
              // Also extract @font-face font names
              const fontFaceMatches = css.match(
                /@font-face\s*\{[^}]*font-family:\s*['"]?([^'"};]+)['"]?[^}]*\}/gi
              );
              if (fontFaceMatches) {
                console.log(`    ✓ Found ${fontFaceMatches.length} @font-face declarations`);
                fontFaceMatches.forEach((match) => {
                  const fontName = match.match(/font-family:\s*['"']?([^'"'};]+)['"']?/i);
                  if (fontName && fontName[1]) {
                    const fontEntry = `@font-face: ${fontName[1].trim()}`;
                    fonts.push(fontEntry);
                    console.log(`      - ${fontEntry}`);
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
    const inlineStyleElements = $('*[style]').length;
    if (inlineStyleElements > 0) console.log(`  → Checking ${inlineStyleElements} elements with inline styles`);
    $('*[style]').each((_, el) => {
      const style = $(el).attr('style');
      if (style) {
        const matches = style.match(/font-family:\s*([^;]+)/gi);
        if (matches) {
          matches.forEach((match) => {
            const fontFamily = match.replace(/font-family:\s*/i, "").trim();
            if (fontFamily && fontFamily.length > 0) {
              fonts.push(fontFamily);
              console.log(`    ✓ Inline style font: ${fontFamily}`);
            }
          });
        }
      }
    });

    // Check style tags for font-family declarations
    const styleTags = $('style').length;
    if (styleTags > 0) console.log(`  → Checking ${styleTags} <style> tags`);
    $("style").each((_, el) => {
      const styleContent = $(el).html();
      if (styleContent) {
        // Match all font-family declarations
        const matches = styleContent.match(/font-family:\s*([^;]+)/gi);
        if (matches) {
          console.log(`    ✓ Found ${matches.length} font-family declarations in <style> tag`);
          matches.forEach((match) => {
            const fontFamily = match.replace(/font-family:\s*/i, "").trim();
            if (fontFamily && fontFamily.length > 0) {
              fonts.push(fontFamily);
              console.log(`      - ${fontFamily}`);
            }
          });
        }

        // Also match @font-face declarations
        const fontFaceMatches = styleContent.match(
          /@font-face\s*\{[^}]*font-family:\s*['"]?([^'"};]+)['"]?[^}]*\}/gi
        );
        if (fontFaceMatches) {
          console.log(`    ✓ Found ${fontFaceMatches.length} @font-face declarations in <style> tag`);
          fontFaceMatches.forEach((match) => {
            const fontName = match.match(/font-family:\s*['"']?([^'"'};]+)['"']?/i);
            if (fontName && fontName[1]) {
              const fontEntry = `@font-face: ${fontName[1].trim()}`;
              fonts.push(fontEntry);
              console.log(`      - ${fontEntry}`);
            }
          });
        }
      }
    });

    // Check Google Fonts links
    const googleFontsCount = $('link[href*="fonts.googleapis.com"]').length;
    if (googleFontsCount > 0) console.log(`  ✓ Found ${googleFontsCount} Google Fonts link(s)`);
    $('link[href*="fonts.googleapis.com"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        fonts.push(`Google Fonts: ${href}`);
        console.log(`    → ${href}`);
        // Try to extract font names from the URL
        const params = new URLSearchParams(href.split("?")[1]);
        const family = params.get("family");
        if (family) {
          family.split("|").forEach((f) => {
            const fontName = f.trim();
            fonts.push(`  - ${fontName}`);
            console.log(`      - ${fontName}`);
          });
        }
      }
    });

    // Check for Adobe Fonts (Typekit)
    const adobeFontsCount = $('link[href*="typekit.net"]').length;
    if (adobeFontsCount > 0) console.log(`  ✓ Found ${adobeFontsCount} Adobe Fonts (Typekit) link(s)`);
    $('link[href*="typekit.net"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        fonts.push(`Adobe Fonts: ${href}`);
        console.log(`    → ${href}`);
      }
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
      logo: finalLogo,
      banner: finalBanner,
      title_font: finalFonts[0] || null,
      body_font: finalFonts[1] || null,
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

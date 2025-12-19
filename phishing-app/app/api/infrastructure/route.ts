import { NextRequest, NextResponse } from "next/server";
import * as dns from "dns";
import { promises as dnsPromises } from "dns";
import * as net from "net";

/**
 * INFRASTRUCTURE RECONNAISSANCE ENDPOINT
 * 
 * Purpose: Gather passive infrastructure-level information about a target domain
 * using Node.js native DNS module and real WHOIS protocol queries
 * 
 * Methods used:
 * - Node.js DNS module: DNS queries (A, AAAA, MX, NS, TXT, SOA records)
 * - WHOIS Protocol (RFC 3912): Direct WHOIS server queries
 * - HTTP HEAD: Web server detection via headers
 * 
 * This is for EDUCATIONAL purposes only - phishing awareness simulation.
 * No vulnerability scanning, exploitation, or active probing performed.
 */

// WHOIS server mappings by TLD
const WHOIS_SERVERS: { [key: string]: string } = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.pir.org",
  edu: "whois.educause.edu",
  gov: "whois.nic.gov",
  au: "whois.aunic.net",
  uk: "whois.nic.uk",
  de: "whois.denic.de",
  fr: "whois.afnic.fr",
  it: "whois.nic.it",
  es: "whois.nic.es",
  br: "whois.registro.br",
  cn: "whois.cnnic.cn",
  jp: "whois.jprs.jp",
  in: "whois.registry.in",
  default: "whois.internic.net",
};

interface InfrastructureData {
  domain: string;
  timestamp: string;
  
  domain_registration?: {
    registrar?: string;
    creation_date?: string;
    expiration_date?: string;
    updated_date?: string;
    registrant_organization?: string;
    registrant_country?: string;
    status?: string[];
    nameServers?: string[];
    registrant_name?: string;
    registrant_email?: string;
    admin_name?: string;
    tech_name?: string;
    dnssec?: string;
  };
  
  dns?: {
    nameservers?: string[];
    a_records?: string[];
    aaaa_records?: string[];
    mx_records?: {
      priority: number;
      exchange: string;
    }[];
    txt_records?: string[];
    soa_record?: string;
    ns_provider?: string;
  };
  
  hosting?: {
    ip_address?: string;
    ipv6_addresses?: string[];
    ip_whois?: {
      asn?: string;
      organization?: string;
      isp?: string;
      country?: string;
      country_code?: string;
      continent?: string;
      city?: string;
      region?: string;
      latitude?: number;
      longitude?: number;
      is_vpn?: boolean;
      is_proxy?: boolean;
    };
  };
  
  web_server?: {
    server_header?: string;
    platform?: string;
    cdn_provider?: string;
  };
  
  email?: {
    mx_provider?: string;
    spf_record?: string;
    dmarc_record?: string;
    mx_details?: Array<{
      priority: number;
      exchange: string;
      provider: string;
    }>;
  };

  metadata?: {
    data_sources: string[];
    collection_method: string;
    notes?: string[];
    warnings?: string[];
  };
}

/**
 * Calculate risk scores and weights for infrastructure findings
 */
interface RiskScore {
  category: string;
  score: number; // 0-100
  severity: "critical" | "high" | "medium" | "low" | "info";
  weight: number; // 0-1, importance for phishing
  findings: string[];
  attackVectors: string[];
}

function calculateInfrastructureRisks(data: any): RiskScore[] {
  const risks: RiskScore[] = [];

  // 1. DOMAIN REGISTRATION RISKS
  if (data.domain_registration) {
    const regData = data.domain_registration;
    let regScore = 0;
    const regFindings: string[] = [];
    const regVectors: string[] = [];

    // Check expiration date
    if (regData.expiration_date) {
      const expiryDate = new Date(regData.expiration_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 30) {
        regScore += 25;
        regFindings.push(`Domain expires in ${daysUntilExpiry} days - HIGH URGENCY`);
        regVectors.push("Domain renewal phishing");
      } else if (daysUntilExpiry < 90) {
        regScore += 15;
        regFindings.push(`Domain expires in ${daysUntilExpiry} days`);
        regVectors.push("Domain renewal notification");
      }
    }

    // Check domain age
    if (regData.creation_date) {
      const createdDate = new Date(regData.creation_date);
      const ageInYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (ageInYears < 1) {
        regScore += 20;
        regFindings.push("Domain is very new (< 1 year old)");
        regVectors.push("New domain registration phishing");
      }
    }

    // Check registrant info availability
    if (regData.registrant_name) {
      regScore += 10;
      regFindings.push(`Registrant publicly listed: ${regData.registrant_name}`);
      regVectors.push("Registrant impersonation");
    }

    if (regData.registrant_email) {
      regScore += 8;
      regFindings.push(`Registrant email exposed: ${regData.registrant_email}`);
      regVectors.push("Email-based social engineering");
    }

    if (regData.registrar) {
      regScore += 5;
      regFindings.push(`Registrar: ${regData.registrar}`);
      regVectors.push("Registrar spoofing attacks");
    }

    // Check domain status issues
    if (regData.status && regData.status.length > 0) {
      const problematicStatuses = regData.status.filter((s: string) => 
        s.toLowerCase().includes("lock") === false
      );
      if (problematicStatuses.length > 0) {
        regScore += 15;
        regFindings.push(`Domain status issues: ${problematicStatuses.join(", ")}`);
        regVectors.push("Domain hijacking risk");
      }
    }

    risks.push({
      category: "Domain Registration",
      score: Math.min(regScore, 100),
      severity: regScore > 70 ? "critical" : regScore > 40 ? "high" : regScore > 20 ? "medium" : "info",
      weight: regScore / 100,
      findings: regFindings,
      attackVectors: regVectors,
    });
  }

  // 2. DNS SECURITY RISKS
  if (data.dns) {
    const dnsData = data.dns;
    let dnsScore = 0;
    const dnsFindings: string[] = [];
    const dnsVectors: string[] = [];

    // Check nameserver provider
    if (dnsData.ns_provider) {
      if (dnsData.ns_provider === "ISP/Registrar Default") {
        dnsScore += 10;
        dnsFindings.push("Using default/ISP nameservers - less secure");
        dnsVectors.push("DNS hijacking");
      } else {
        dnsScore -= 5;
        dnsFindings.push(`Using managed DNS: ${dnsData.ns_provider}`);
      }
    }

    // Check DNSSEC
    if (!dnsData.dnssec || dnsData.dnssec === "unsigned") {
      dnsScore += 20;
      dnsFindings.push("DNSSEC not enabled - vulnerable to DNS spoofing");
      dnsVectors.push("DNS spoofing attacks", "Man-in-the-middle attacks");
    } else {
      dnsScore -= 10;
      dnsFindings.push("DNSSEC enabled");
    }

    // Check for multiple nameservers (redundancy)
    if (dnsData.nameservers && dnsData.nameservers.length < 2) {
      dnsScore += 15;
      dnsFindings.push("Only 1 nameserver - single point of failure");
      dnsVectors.push("Single nameserver compromise");
    } else if (dnsData.nameservers && dnsData.nameservers.length >= 2) {
      dnsFindings.push(`${dnsData.nameservers.length} nameservers configured`);
    }

    // Check for A records
    if (!dnsData.a_records || dnsData.a_records.length === 0) {
      dnsScore += 10;
      dnsFindings.push("No A records found - site may be offline/misconfigured");
    }

    risks.push({
      category: "DNS Security",
      score: Math.min(dnsScore, 100),
      severity: dnsScore > 70 ? "critical" : dnsScore > 40 ? "high" : dnsScore > 20 ? "medium" : "info",
      weight: dnsScore / 100,
      findings: dnsFindings,
      attackVectors: dnsVectors,
    });
  }

  // 3. EMAIL SECURITY RISKS
  if (data.email) {
    const emailData = data.email;
    let emailScore = 0;
    const emailFindings: string[] = [];
    const emailVectors: string[] = [];

    // Check SPF
    if (!emailData.spf_record) {
      emailScore += 25;
      emailFindings.push("SPF record NOT configured - email spoofing possible");
      emailVectors.push("Email spoofing (high risk)", "Registrar spoofing", "Hosting provider phishing");
    } else {
      emailScore -= 10;
      emailFindings.push("SPF record configured");
    }

    // Check DMARC
    if (!emailData.dmarc_record) {
      emailScore += 20;
      emailFindings.push("DMARC record NOT configured");
      emailVectors.push("DMARC bypass phishing");
    } else {
      emailScore -= 10;
      emailFindings.push("DMARC record configured");
    }

    // Check email provider
    if (emailData.mx_provider === "Custom/Self-hosted") {
      emailScore += 15;
      emailFindings.push("Self-hosted email - higher compromise risk");
      emailVectors.push("Internal email system compromise");
    } else {
      emailFindings.push(`Email provider: ${emailData.mx_provider}`);
    }

    // Check for multiple MX records
    if (emailData.mx_details && emailData.mx_details.length < 2) {
      emailScore += 10;
      emailFindings.push("Only 1 MX record - single point of failure");
      emailVectors.push("Email service failure");
    }

    risks.push({
      category: "Email Security",
      score: Math.min(emailScore, 100),
      severity: emailScore > 70 ? "critical" : emailScore > 40 ? "high" : emailScore > 20 ? "medium" : "info",
      weight: emailScore / 100,
      findings: emailFindings,
      attackVectors: emailVectors,
    });
  }

  // 4. HOSTING/INFRASTRUCTURE RISKS
  if (data.hosting) {
    const hostingData = data.hosting;
    let hostScore = 0;
    const hostFindings: string[] = [];
    const hostVectors: string[] = [];

    if (hostingData.ip_whois) {
      const ipWhois = hostingData.ip_whois;

      // Check for VPN/Proxy
      if (ipWhois.is_vpn) {
        hostScore += 20;
        hostFindings.push("Hosting on VPN - suspicious activity possible");
        hostVectors.push("Anonymized phishing hosting");
      }

      if (ipWhois.is_proxy) {
        hostScore += 15;
        hostFindings.push("Hosting behind proxy - possible malicious use");
        hostVectors.push("Proxy-based phishing");
      }

      // Check ASN reputation
      if (ipWhois.asn) {
        hostFindings.push(`ASN: ${ipWhois.asn}`);
        hostVectors.push("ASN-based targeting");
      }

      // Check hosting country
      if (ipWhois.country && ipWhois.country !== "United States") {
        hostScore += 5;
        hostFindings.push(`Hosted in: ${ipWhois.country} - may indicate regional targeting`);
      }

      hostFindings.push(`Organization: ${ipWhois.organization || "Unknown"}`);
    }

    risks.push({
      category: "Hosting Infrastructure",
      score: Math.min(hostScore, 100),
      severity: hostScore > 70 ? "critical" : hostScore > 40 ? "high" : hostScore > 20 ? "medium" : "info",
      weight: hostScore / 100,
      findings: hostFindings,
      attackVectors: hostVectors,
    });
  }

  // 5. WEB SERVER RISKS
  if (data.web_server) {
    const webData = data.web_server;
    let webScore = 0;
    const webFindings: string[] = [];
    const webVectors: string[] = [];

    if (webData.server_header) {
      webFindings.push(`Server: ${webData.server_header}`);
      webVectors.push("Server-specific exploits");
    }

    if (webData.cdn_provider) {
      webScore -= 5;
      webFindings.push(`CDN: ${webData.cdn_provider} - provides DDoS protection`);
    } else if (webData.platform) {
      webScore += 5;
      webFindings.push(`Web server: ${webData.platform}`);
      webVectors.push(`${webData.platform} vulnerability targeting`);
    }

    risks.push({
      category: "Web Server",
      score: Math.min(webScore, 100),
      severity: webScore > 70 ? "critical" : webScore > 40 ? "high" : webScore > 20 ? "medium" : "info",
      weight: Math.max(webScore / 100, 0.1),
      findings: webFindings,
      attackVectors: webVectors,
    });
  }

  return risks;
}

/**
 * Extract top 5 attack surfaces from infrastructure data
 * Returns simple, prioritized attack vectors with risk scoring
 */
interface AttackSurface {
  vector: string;
  value: string;
  description: string;
  phishingTactic: string;
  riskSeverity?: "critical" | "high" | "medium" | "low" | "info";
  riskScore?: number; // 0-100
  weight?: number; // 0-1, importance for phishing
}

function extractTop5AttackSurfaces(data: any, riskScores: RiskScore[] = []): AttackSurface[] {
  const surfaces: AttackSurface[] = [];
  
  // Build a risk lookup map for quick access
  const riskMap = new Map<string, RiskScore>();
  riskScores.forEach(rs => {
    riskMap.set(rs.category, rs);
  });

  // 1. REGISTRAR - High priority for domain hijacking
  if (data.domain_registration?.registrar) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "medium";
    let riskScore = 50;
    let weight = 0.7;
    
    // Check domain expiration urgency
    if (data.domain_registration?.expiration_date) {
      const expiryDate = new Date(data.domain_registration.expiration_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 30) {
        riskSev = "critical";
        riskScore = 95;
        weight = 0.95;
      } else if (daysUntilExpiry < 90) {
        riskSev = "high";
        riskScore = 75;
        weight = 0.85;
      }
    }
    
    // Check domain age
    if (data.domain_registration?.creation_date) {
      const createdDate = new Date(data.domain_registration.creation_date);
      const ageInYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (ageInYears < 1) {
        riskSev = "high";
        riskScore = Math.max(riskScore, 80);
        weight = Math.max(weight, 0.8);
      }
    }

    surfaces.push({
      vector: "Registrar",
      value: data.domain_registration.registrar,
      description: `Domain registered with ${data.domain_registration.registrar}`,
      phishingTactic: "Spoof registrar communications about domain renewal, billing, or security alerts",
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // 2. EMAIL PROVIDER - Critical for email spoofing
  if (data.email?.mx_provider) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "medium";
    let riskScore = 60;
    let weight = 0.75;
    
    // Check SPF/DMARC security
    const hasSpf = !!data.email?.spf_record;
    const hasDmarc = !!data.email?.dmarc_record;
    
    if (!hasSpf && !hasDmarc) {
      riskSev = "critical";
      riskScore = 90;
      weight = 0.9;
    } else if (!hasSpf || !hasDmarc) {
      riskSev = "high";
      riskScore = 75;
      weight = 0.8;
    } else {
      riskSev = "low";
      riskScore = 30;
      weight = 0.3;
    }

    surfaces.push({
      vector: "Email Provider",
      value: data.email.mx_provider,
      description: `Using ${data.email.mx_provider} for email services`,
      phishingTactic: "Impersonate email provider with account alerts, security updates, or verification requests",
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // 3. NAMESERVER PROVIDER - DNS infrastructure risk
  if (data.dns?.ns_provider) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "medium";
    let riskScore = 50;
    let weight = 0.6;
    
    // Check DNSSEC and nameserver redundancy
    const hasDnssec = data.dns?.dnssec && data.dns.dnssec !== "unsigned";
    const nsCount = data.dns?.nameservers?.length || 0;
    
    if (!hasDnssec && nsCount < 2) {
      riskSev = "high";
      riskScore = 80;
      weight = 0.8;
    } else if (!hasDnssec) {
      riskSev = "medium";
      riskScore = 60;
      weight = 0.6;
    }

    surfaces.push({
      vector: "DNS Provider",
      value: data.dns.ns_provider,
      description: `DNS hosted by ${data.dns.ns_provider}`,
      phishingTactic: "Pose as DNS provider with urgent alerts about DNS configuration or security issues",
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // 4. REGISTRANT CONTACT - Social engineering risk
  if (data.domain_registration?.registrant_name || data.domain_registration?.registrant_organization) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "medium";
    let riskScore = 55;
    let weight = 0.65;
    
    const contactName = data.domain_registration?.registrant_name || data.domain_registration?.registrant_organization || "Unknown";
    const hasEmail = !!data.domain_registration?.registrant_email;
    
    if (hasEmail) {
      riskSev = "high";
      riskScore = 75;
      weight = 0.75;
    }

    surfaces.push({
      vector: "Registrant Contact",
      value: contactName,
      description: `Domain registered to ${contactName}`,
      phishingTactic: "Target registrant with personalized emails using their name and organization",
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // 5. HOSTING PROVIDER - Infrastructure targeting
  if (data.hosting?.ip_whois?.organization || data.hosting?.ip_whois?.isp) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "low";
    let riskScore = 40;
    let weight = 0.4;
    
    // Check for VPN/Proxy (suspicious)
    if (data.hosting.ip_whois?.is_vpn || data.hosting.ip_whois?.is_proxy) {
      riskSev = "high";
      riskScore = 75;
      weight = 0.75;
    }

    const hostProvider = data.hosting.ip_whois?.organization || data.hosting.ip_whois?.isp || "Unknown";

    surfaces.push({
      vector: "Hosting Provider",
      value: hostProvider,
      description: `Hosted by ${hostProvider}${data.hosting.ip_whois?.country ? ` (${data.hosting.ip_whois.country})` : ""}`,
      phishingTactic: "Impersonate hosting provider with security alerts or account verification requests",
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // 6. WEB SERVER PLATFORM - Platform-specific targeting
  if (data.web_server?.platform || data.web_server?.server_header) {
    let riskSev: "critical" | "high" | "medium" | "low" | "info" = "low";
    let riskScore = 35;
    let weight = 0.35;
    
    const platform = data.web_server?.platform || "Unknown";

    surfaces.push({
      vector: "Web Server",
      value: platform,
      description: `Running ${platform} web server`,
      phishingTactic: `Target ${platform}-specific vulnerabilities or platform administration teams`,
      riskSeverity: riskSev,
      riskScore,
      weight,
    });
  }

  // Sort by risk score and return top 5
  const sorted = surfaces
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5);

  return sorted;
}

/**
 * DNS Queries using Node.js native DNS module
 */
async function resolveDNS(domain: string): Promise<any> {
  const results: any = {};
  const resolver = new dnsPromises.Resolver();

  // Query Nameservers
  try {
    console.log(`  → Querying nameservers...`);
    results.nameservers = await resolver.resolveNs(domain);
    if (results.nameservers.length > 0) {
      console.log(`  ✓ Found ${results.nameservers.length} nameservers`);
    }
  } catch (e) {
    console.error(`  ⚠ Nameserver query failed`);
    results.nameservers = [];
  }

  // Query A Records (IPv4)
  try {
    console.log(`  → Querying A records...`);
    results.a_records = await resolver.resolve4(domain);
    if (results.a_records.length > 0) {
      console.log(`  ✓ Found ${results.a_records.length} A record(s): ${results.a_records.join(", ")}`);
    }
  } catch (e) {
    console.error(`  ⚠ A record query failed`);
    results.a_records = [];
  }

  // Query AAAA Records (IPv6)
  try {
    console.log(`  → Querying AAAA records...`);
    results.aaaa_records = await resolver.resolve6(domain);
    if (results.aaaa_records.length > 0) {
      console.log(`  ✓ Found ${results.aaaa_records.length} IPv6 record(s)`);
    }
  } catch (e) {
    results.aaaa_records = [];
  }

  // Query MX Records
  try {
    console.log(`  → Querying MX records...`);
    results.mx_records = await resolver.resolveMx(domain);
    if (results.mx_records.length > 0) {
      console.log(`  ✓ Found ${results.mx_records.length} MX record(s)`);
    }
  } catch (e) {
    console.error(`  ⚠ MX record query failed`);
    results.mx_records = [];
  }

  // Query TXT Records
  try {
    console.log(`  → Querying TXT records...`);
    results.txt_records = await resolver.resolveTxt(domain);
    if (results.txt_records.length > 0) {
      console.log(`  ✓ Found ${results.txt_records.length} TXT record(s)`);
    }
  } catch (e) {
    console.error(`  ⚠ TXT record query failed`);
    results.txt_records = [];
  }

  // Query SOA Record
  try {
    console.log(`  → Querying SOA record...`);
    results.soa_record = await resolver.resolveSoa(domain);
    if (results.soa_record) {
      console.log(`  ✓ SOA record found`);
    }
  } catch (e) {
    results.soa_record = null;
  }

  // Query DMARC Record (_dmarc subdomain)
  try {
    console.log(`  → Querying DMARC record...`);
    const dmarcTxt = await resolver.resolveTxt(`_dmarc.${domain}`);
    if (dmarcTxt && dmarcTxt.length > 0) {
      const dmarcRecord = dmarcTxt.flat().join("");
      if (dmarcRecord.includes("v=DMARC1")) {
        results.dmarc_txt = dmarcRecord;
        console.log(`  ✓ DMARC record found`);
      }
    }
  } catch (e) {
    results.dmarc_txt = null;
  }

  return results;
}

/**
 * Query WHOIS server via TCP socket (RFC 3912)
 */
function queryWhoisServer(host: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: 43 });
    let response = "";

    socket.setTimeout(10000); // 10 second timeout

    socket.on("connect", () => {
      socket.write(`${query}\r\n`);
    });

    socket.on("data", (data) => {
      response += data.toString();
    });

    socket.on("end", () => {
      resolve(response);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("WHOIS query timeout"));
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Get the appropriate WHOIS server for a domain
 */
function getWhoisServer(domain: string): string {
  const parts = domain.split(".");
  const tld = parts[parts.length - 1].toLowerCase();
  return WHOIS_SERVERS[tld] || WHOIS_SERVERS.default;
}

/**
 * Parse WHOIS response text
 */
function parseWhoisResponse(whoisText: string): any {
  const result: any = {};

  if (!whoisText) return result;

  // Split by lines and process
  const lines = whoisText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%") || trimmed.startsWith(">")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (!value) continue;

    // Map various WHOIS field names to standard keys
    if (key.includes("domain name")) result.domain_name = value;
    if (key.includes("registry domain id")) result.registry_domain_id = value;
    if (key.includes("registrar whois server")) result.registrar_whois_server = value;
    if (key.includes("registrar url") || key === "registrar url") result.registrar_url = value;
    if (key === "registrar" || (key.includes("registrar") && key.includes("name"))) result.registrar = value;
    if (key.includes("registrar abuse contact email")) result.registrar_abuse_email = value;
    if (key.includes("registrar abuse contact phone")) result.registrar_abuse_phone = value;
    if (key.includes("reseller")) result.reseller_name = value;
    
    if (key.includes("creation date") || key.includes("created")) result.creation_date = value;
    if (key.includes("expir") && (key.includes("date") || key.includes("expir"))) result.expiration_date = value;
    if (key.includes("updated") && key.includes("date")) result.updated_date = value;
    if (key.includes("last modified")) result.last_modified = value;
    
    if (key.includes("registrant") && key.includes("name")) result.registrant_name = value;
    if (key.includes("registrant") && key.includes("id")) result.registrant_id = value;
    if (key.includes("registrant") && key.includes("organization")) result.registrant_organization = value;
    if (key.includes("registrant") && key.includes("country")) result.registrant_country = value;
    if (key.includes("registrant") && key.includes("email")) result.registrant_email = value;
    if (key.includes("registrant") && key.includes("phone")) result.registrant_phone = value;
    
    if (key.includes("admin") && key.includes("name")) result.admin_name = value;
    if (key.includes("admin") && key.includes("id")) result.admin_id = value;
    if (key.includes("admin") && key.includes("email")) result.admin_email = value;
    
    if (key.includes("tech") && key.includes("name")) result.tech_name = value;
    if (key.includes("tech") && key.includes("id")) result.tech_id = value;
    if (key.includes("tech") && key.includes("email")) result.tech_email = value;
    
    if (key.includes("billing") && key.includes("name")) result.billing_name = value;
    if (key.includes("billing") && key.includes("id")) result.billing_id = value;
    
    if (key.includes("name server") || key.includes("nameserver")) {
      if (!result.nameservers) result.nameservers = [];
      result.nameservers.push(value);
    }
    
    if (key.includes("status")) {
      if (!result.status) result.status = [];
      result.status.push(value);
    }
    
    if (key.includes("status reason")) result.status_reason = value;
    if (key.includes("dnssec")) result.dnssec = value;
    if (key.includes("eligibility type")) result.eligibility_type = value;
  }

  return result;
}

/**
 * WHOIS Lookup using real WHOIS protocol
 */
async function getWhoisInfo(domain: string): Promise<any> {
  const whoisInfo: any = {};

  try {
    console.log(`  → Querying WHOIS server for ${domain}...`);
    
    const whoisServer = getWhoisServer(domain);
    console.log(`  → Using WHOIS server: ${whoisServer}`);

    // Query the WHOIS server
    const whoisResponse = await queryWhoisServer(whoisServer, domain);
    
    if (whoisResponse) {
      // Parse the response
      const parsed = parseWhoisResponse(whoisResponse);
      
      // Merge with result
      Object.assign(whoisInfo, parsed);
      
      if (Object.keys(whoisInfo).length > 0) {
        console.log(`  ✓ WHOIS data retrieved: ${whoisInfo.registrar || "Unknown registrar"}`);
        console.log(`    - Domain: ${whoisInfo.domain_name || "—"}`);
        console.log(`    - Created: ${whoisInfo.creation_date ? whoisInfo.creation_date.split("T")[0] : "—"}`);
        console.log(`    - Expires: ${whoisInfo.expiration_date ? whoisInfo.expiration_date.split("T")[0] : "—"}`);
      }
    }
  } catch (err) {
    console.error(`  ⚠ WHOIS lookup failed:`, err instanceof Error ? err.message : "Unknown error");
  }

  return whoisInfo;
}

/**
 * HTTP Headers - Detect web server
 */
async function getHttpHeaders(domain: string): Promise<any> {
  const headers: any = {};

  try {
    console.log(`  → Fetching HTTP headers...`);
    const url = `https://${domain}`;
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InfrastructureScanner/1.0)",
      },
      timeout: 10000,
      redirect: "follow",
    } as any);

    const server = response.headers.get("server") || "";
    const powerBy = response.headers.get("x-powered-by") || "";
    const cfRay = response.headers.get("cf-ray") || "";

    headers.server_header = server;
    headers.powered_by = powerBy;
    headers.status = response.status;

    // Detect CDN/reverse proxy
    if (server.toLowerCase().includes("cloudflare") || cfRay) {
      headers.cdn_provider = "Cloudflare";
    } else if (server.toLowerCase().includes("akamai")) {
      headers.cdn_provider = "Akamai";
    }

    // Detect platform
    if (server.toLowerCase().includes("nginx")) {
      headers.platform = "Nginx";
    } else if (server.toLowerCase().includes("apache")) {
      headers.platform = "Apache";
    } else if (server.toLowerCase().includes("iis")) {
      headers.platform = "Microsoft IIS";
    }

    if (server) {
      console.log(`  ✓ Server: ${server}`);
    }
    if (headers.cdn_provider) {
      console.log(`  ✓ CDN: ${headers.cdn_provider}`);
    }

    return headers;
  } catch (err) {
    console.error("  ⚠ HTTP header check failed");
    return headers;
  }
}

/**
 * Detect email provider from MX records
 */
function detectEmailProvider(exchange: string): string {
  const lower = exchange.toLowerCase();

  if (lower.includes("google") || lower.includes("gmail")) return "Google Workspace";
  if (lower.includes("microsoft") || lower.includes("outlook")) return "Microsoft 365";
  if (lower.includes("zoho")) return "Zoho Mail";
  if (lower.includes("protonmail")) return "Proton Mail";
  if (lower.includes("mailgun")) return "Mailgun";
  if (lower.includes("sendgrid")) return "SendGrid";
  if (lower.includes("fastmail")) return "Fastmail";
  if (lower.includes("aws") || lower.includes("ses")) return "Amazon SES";
  if (lower.includes("office365")) return "Microsoft 365";

  return "Custom/Self-hosted";
}

/**
 * Detect nameserver provider
 */
function detectNsProvider(nameservers: string[]): string {
  if (!Array.isArray(nameservers) || nameservers.length === 0) return "Unknown";

  const ns = nameservers[0].toLowerCase();

  if (ns.includes("cloudflare")) return "Cloudflare";
  if (ns.includes("route53") || ns.includes("awsdns")) return "AWS Route 53";
  if (ns.includes("akamai")) return "Akamai";
  if (ns.includes("google") && ns.includes("dns")) return "Google Cloud DNS";
  if (ns.includes("azure")) return "Azure DNS";

  return "ISP/Registrar Default";
}

/**
 * IP WHOIS Lookup - Get hosting provider and ASN info
 */
async function getIpWhoisInfo(ipAddress: string): Promise<any> {
  const ipWhoisInfo: any = {};

  try {
    console.log(`  → Querying IP WHOIS data for ${ipAddress}...`);
    
    // Try ipwhois.com API (free, no key required)
    const ipWhoisUrl = `https://ipwhois.app/json/${ipAddress}`;
    const response = await fetch(ipWhoisUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InfrastructureScanner/1.0)",
      },
      timeout: 10000,
    } as any);

    if (response.ok) {
      const data = await response.json();
      
      if (data.success !== false) {
        if (data.asn) ipWhoisInfo.asn = data.asn;
        if (data.org) ipWhoisInfo.organization = data.org;
        if (data.isp) ipWhoisInfo.isp = data.isp;
        if (data.country) ipWhoisInfo.country = data.country;
        if (data.country_code) ipWhoisInfo.country_code = data.country_code;
        if (data.continent) ipWhoisInfo.continent = data.continent;
        if (data.city) ipWhoisInfo.city = data.city;
        if (data.region) ipWhoisInfo.region = data.region;
        if (data.latitude) ipWhoisInfo.latitude = data.latitude;
        if (data.longitude) ipWhoisInfo.longitude = data.longitude;
        if (data.is_vpn) ipWhoisInfo.is_vpn = data.is_vpn;
        if (data.is_proxy) ipWhoisInfo.is_proxy = data.is_proxy;
        
        if (Object.keys(ipWhoisInfo).length > 0) {
          console.log(`  ✓ IP WHOIS data retrieved: ${ipWhoisInfo.organization || ipWhoisInfo.isp || "Unknown"}`);
          console.log(`    - ASN: ${ipWhoisInfo.asn || "—"}`);
          console.log(`    - Country: ${ipWhoisInfo.country || "—"}`);
          console.log(`    - City: ${ipWhoisInfo.city || "—"}`);
          if (ipWhoisInfo.is_vpn) console.log(`    ⚠ VPN detected`);
          if (ipWhoisInfo.is_proxy) console.log(`    ⚠ Proxy detected`);
        }
      }
    }
  } catch (err) {
    console.error(`  ⚠ IP WHOIS lookup failed:`, err instanceof Error ? err.message : "Unknown error");
  }

  return ipWhoisInfo;
}

/**
 * Main handler: POST /api/infrastructure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Normalize domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .toLowerCase();

    console.log("\n🔍 INFRASTRUCTURE RECONNAISSANCE START");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📍 Target Domain: ${cleanDomain}`);

    const result: InfrastructureData = {
      domain: cleanDomain,
      timestamp: new Date().toISOString(),
      metadata: {
        data_sources: ["Node.js DNS Module", "WHOIS Protocol", "HTTP Headers", "ipwhois.app API"],
        collection_method: "Passive Reconnaissance (Native & Public APIs)",
        notes: ["Using Node.js DNS resolver for queries", "WHOIS data from real WHOIS servers", "No command-line tools required", "Windows compatible"],
        warnings: [],
      },
    };

    // DNS Resolution
    console.log("\n📡 Resolving DNS records...");
    const dnsData = await resolveDNS(cleanDomain);
    
    if (dnsData.a_records?.length > 0) {
      result.dns = {
        nameservers: dnsData.nameservers || [],
        a_records: dnsData.a_records || [],
        aaaa_records: dnsData.aaaa_records || [],
        mx_records: dnsData.mx_records || [],
        txt_records: dnsData.txt_records?.flat().map((record: any) => 
          Array.isArray(record) ? record.join("") : record
        ) || [],
        soa_record: dnsData.soa_record ? JSON.stringify(dnsData.soa_record) : undefined,
        ns_provider: detectNsProvider(dnsData.nameservers || []),
      };
    }

    // HTTP Headers
    console.log("\n🌐 Fetching HTTP headers...");
    const httpHeaders = await getHttpHeaders(cleanDomain);
    if (httpHeaders.server_header || httpHeaders.powered_by) {
      result.web_server = {
        server_header: httpHeaders.server_header,
        platform: httpHeaders.platform,
        cdn_provider: httpHeaders.cdn_provider,
      };
    }

    // WHOIS Data
    console.log("\n📋 Querying WHOIS registry...");
    const whoisData = await getWhoisInfo(cleanDomain);
    if (Object.keys(whoisData).length > 0) {
      result.domain_registration = whoisData;
    } else {
      if (result.metadata?.warnings) {
        result.metadata.warnings.push("WHOIS data unavailable");
      }
    }

    // Email Infrastructure
    if (dnsData.mx_records && dnsData.mx_records.length > 0) {
      const emailRecords: any = {};
      
      // Check for SPF
      const txtRecordsFlat = dnsData.txt_records?.flat() || [];
      const spfRecord = txtRecordsFlat.find((txt: any) => {
        const str = Array.isArray(txt) ? txt.join("") : txt;
        return str.includes("v=spf1");
      });
      
      if (spfRecord) {
        emailRecords.spf_record = Array.isArray(spfRecord) ? spfRecord.join("") : spfRecord;
      }

      // DMARC
      if (dnsData.dmarc_txt) {
        emailRecords.dmarc_record = dnsData.dmarc_txt;
      }

      const emailProvider = detectEmailProvider(dnsData.mx_records[0].exchange);
      
      result.email = {
        mx_provider: emailProvider,
        spf_record: emailRecords.spf_record,
        dmarc_record: emailRecords.dmarc_record,
        mx_details: dnsData.mx_records.map((mx: any) => ({
          priority: mx.priority,
          exchange: mx.exchange,
          provider: detectEmailProvider(mx.exchange),
        })),
      };

      console.log(`\n📧 Email Infrastructure:`);
      console.log(`  ✓ Email Provider: ${emailProvider}`);
      console.log(`  ✓ SPF: ${emailRecords.spf_record ? "✓ Configured" : "—"}`);
      console.log(`  ✓ DMARC: ${emailRecords.dmarc_record ? "✓ Configured" : "—"}`);
    }

    // IP Geolocation (if A record exists)
    if (dnsData.a_records?.[0]) {
      console.log("\n🖥️  Hosting Information:");
      const ipWhoisData = await getIpWhoisInfo(dnsData.a_records[0]);
      result.hosting = {
        ip_address: dnsData.a_records[0],
        ipv6_addresses: dnsData.aaaa_records,
        ip_whois: ipWhoisData,
      };
      console.log(`  ✓ IP: ${dnsData.a_records[0]}`);
    }

    // Calculate Risk Scores
    console.log("\n⚠️ Calculating Risk Scores...");
    const riskScores = calculateInfrastructureRisks(result);
    result.metadata!.notes!.push("Risk scores calculated for each category");

    // Extract Top 5 Attack Surfaces
    console.log("\n🎯 Extracting Top 5 Attack Surfaces...");
    const attackSurfaces = extractTop5AttackSurfaces(result, riskScores);

    console.log("\n✅ RECONNAISSANCE COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Display JSON summary (clean output)
    console.log("\n📊 RECONNAISSANCE RESULTS:\n");
    console.log(JSON.stringify({ result, riskScores, attackSurfaces }, null, 2));
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return NextResponse.json({ result, riskScores, attackSurfaces });
  } catch (error: any) {
    console.error("Infrastructure reconnaissance error:", error);
    return NextResponse.json(
      {
        error: error.message || "Infrastructure reconnaissance failed",
      },
      { status: 500 }
    );
  }
}

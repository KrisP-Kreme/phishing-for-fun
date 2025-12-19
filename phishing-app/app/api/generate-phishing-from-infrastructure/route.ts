import { NextRequest, NextResponse } from "next/server";
import { callGroqAI } from "@/lib/ai/groq-client";

/**
 * INFRASTRUCTURE-BASED PHISHING TEMPLATE GENERATOR
 * 
 * Takes infrastructure reconnaissance data and generates phishing templates
 * that exploit the discovered attack surfaces.
 * 
 * Educational purposes only - for authorized phishing simulations.
 */

interface InfrastructurePhishingRequest {
  domain: string;
  infrastructureData: {
    domain_registration?: any;
    dns?: any;
    hosting?: any;
    web_server?: any;
    email?: any;
  };
  attackSurfaces?: Array<{
    vector: string;
    value: string;
    description: string;
    phishingTactic: string;
  }>;
}

/**
 * Generate infrastructure-based phishing prompt using attack surfaces
 */
function generateInfrastructurePhishingPrompt(
  domain: string,
  attackSurfaces: any[]
): string {
  // Format attack surfaces for the prompt
  const surfacesText = attackSurfaces
    .map(
      (surface, index) =>
        `${index + 1}. ${surface.vector}: ${surface.value}
   Description: ${surface.description}
   Phishing Tactic: ${surface.phishingTactic}`
    )
    .join("\n\n");

  return `TARGET DOMAIN: ${domain}

TOP 5 ATTACK SURFACES IDENTIFIED:

${surfacesText}

TASK: Create a highly realistic phishing email template that exploits ONE of the attack surfaces above.

REQUIREMENTS:
- Generate a complete HTML email template
- Choose the most convincing attack surface to exploit
- Include the actual domain name and attack surface details
- Use professional formatting and urgent language
- Include a credential capture form or link
- Make it appear to come from the identified infrastructure provider
- Add specific details that demonstrate reconnaissance (prove it's targeted)
- Highlight phishing red flags for training purposes (subtle indicators)
- The email should be convincing enough to fool most users

EXAMPLE ATTACKS:
- If registrar is "GoDaddy", send fake "Domain Renewal Notice" from GoDaddy
- If email provider is "Microsoft 365", send fake "Account Security Alert" from Microsoft
- If nameserver is "Cloudflare", send fake "DNS Configuration Alert" from Cloudflare
- Use the registrant contact name in the email (e.g., "Dear [Name]...")
- Reference specific infrastructure details to build trust

Output ONLY the valid HTML email template, nothing else.`;
}

/**
 * POST /api/generate-phishing-from-infrastructure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InfrastructurePhishingRequest;
    const { domain, infrastructureData, attackSurfaces } = body;

    if (!domain || !infrastructureData) {
      return NextResponse.json(
        { error: "Domain and infrastructure data are required" },
        { status: 400 }
      );
    }

    console.log(`\n🎣 GENERATING INFRASTRUCTURE-BASED PHISHING TEMPLATE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Target Domain: ${domain}`);
    
    // Display attack surfaces
    if (attackSurfaces && Array.isArray(attackSurfaces)) {
      console.log(`\n🎯 TOP 5 ATTACK SURFACES:`);
      attackSurfaces.forEach((surface, index) => {
        console.log(`   ${index + 1}. ${surface.vector}: ${surface.value}`);
        console.log(`      → ${surface.phishingTactic}`);
      });
    }

    // Generate the phishing prompt based on attack surfaces
    const phishingPrompt = generateInfrastructurePhishingPrompt(
      domain,
      attackSurfaces || []
    );

    console.log(`\n🤖 Generating phishing template with AI...`);

    // Call Groq API
    const htmlTemplate = await callGroqAI(
      phishingPrompt,
      `You are a phishing simulation expert. Create a HIGHLY REALISTIC phishing email that exploits infrastructure vulnerabilities. The email should be convincing and well-formatted, appearing to come from legitimate infrastructure providers. Include subtle phishing indicators that security-aware users should spot. Output ONLY the HTML email template, no other text.`
    );

    console.log(`✅ Template generated successfully`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return NextResponse.json({
      success: true,
      domain,
      html: htmlTemplate,
      attackSurfaces: attackSurfaces,
      metadata: {
        vector: "Infrastructure-based social engineering",
        targetDomain: domain,
        surfaceCount: attackSurfaces?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Infrastructure phishing generation error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate infrastructure-based phishing template",
      },
      { status: 500 }
    );
  }
}

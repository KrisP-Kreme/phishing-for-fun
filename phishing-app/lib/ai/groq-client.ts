/**
 * GROQ AI Client - Centralized LLaMA Integration
 * 
 * This module provides a unified interface for calling GROQ's API using LLaMA models.
 * It replaces the previous Gemini integration with GROQ + LLaMA-3.3-70b-versatile.
 * 
 * Key improvements over Gemini:
 * - Faster inference with GROQ's specialized LLM inference engine
 * - Better cost efficiency
 * - LLaMA open-source model alignment
 * - Drop-in replacement with identical function signatures
 * 
 * Model: LLaMA-3.3-70b-versatile (updated from deprecated 3.1 model)
 * - Released: December 2024
 * - Performance: Improved quality and reasoning capabilities
 * - Inference Speed: Optimized on GROQ's infrastructure
 */

/**
 * Call GROQ API with LLaMA model
 * 
 * @param prompt - The user/task prompt
 * @param systemPrompt - The system instructions
 * @returns The model's text response
 * @throws Error if GROQ_API_KEY is missing or API call fails
 */
export async function callGroqAI(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  // Validate API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY environment variable not set. Please add it to .env.local"
    );
  }

  // Set up request timeout (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // GROQ API endpoint - Uses official Groq API
    // Model: llama-3.3-70b-versatile (latest stable LLaMA model, recommended replacement for deprecated 3.1)
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // LLaMA 3.3 70B - improved versatile model with better quality than 3.1
          // Use case: General tasks, code generation, instruction following, HTML email templates
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          // Response configuration
          max_tokens: 4096, // Match Gemini's maxOutputTokens
          temperature: 0.7, // Match Gemini's temperature for consistent output quality
          top_p: 1.0, // Use nucleus sampling for controlled diversity
        }),
        // @ts-ignore - AbortSignal not fully typed in older versions
        signal: controller.signal,
      }
    );

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `GROQ API error: ${response.status} - ${
          errorData?.error?.message ||
          errorData.error?.message ||
          JSON.stringify(errorData)
        }`
      );
    }

    // Extract response data
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No text response from GROQ API");
    }

    return text;
  } catch (error: any) {
    // Handle timeout errors specifically
    if (error.name === "AbortError") {
      throw new Error("GROQ API request timeout (30s)");
    }
    throw error;
  } finally {
    // Always clean up timeout
    clearTimeout(timeoutId);
  }
}

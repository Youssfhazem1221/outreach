export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { leadData, offer, idToken } = await req.json();

    if (!idToken || !adminAuth || !adminDb) {
      return new Response(JSON.stringify({ error: "Unauthorized or System Error" }), { status: 401 });
    }

    // Verify Firebase Auth Token
    const decodedToken = await adminAuth!.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Multi-tier API Key Lookup: User Profile -> Global Settings -> Env Var
    const userSettingsDoc = await adminDb!.collection("users").doc(userId).collection("settings").doc("api_keys").get();
    const globalSettingsDoc = await adminDb!.collection("settings").doc("api_keys").get();
    
    let providers: any[] = userSettingsDoc.data()?.ai_providers || globalSettingsDoc.data()?.ai_providers || [];
    
    // Filter to only active providers
    let activeProviders = providers.filter(p => p.isActive && p.apiKey && p.model);

    // Legacy fallback for old env vars if no providers configured
    if (activeProviders.length === 0) {
      if (process.env.GROQ_API_KEY) {
        activeProviders.push({
          name: "Legacy Env Groq",
          providerType: "groq",
          apiKey: process.env.GROQ_API_KEY,
          model: "llama-3.1-8b-instant",
          isActive: true
        });
      }
      if (process.env.OPENAI_API_KEY) {
        activeProviders.push({
          name: "Legacy Env OpenAI",
          providerType: "openai",
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-4o",
          isActive: true
        });
      }
    }

    if (activeProviders.length === 0) {
      return new Response(JSON.stringify({ error: "No AI Providers configured. Please add one in Settings." }), { status: 400 });
    }

    const prompt = `
You are an expert bilingual outreach copywriter (English and Egyptian Arabic).
Write a highly personalized, Hormozi-style cold outreach message for this business.

BUSINESS DATA:
Name: ${leadData.name}
Niche: ${leadData.niche}
Pain Point: ${leadData.pain}
Decision Maker: ${leadData.decisionMaker || "Owner/Manager"}
City: ${leadData.city}

OFFER TO PITCH:
"${offer}"

INSTRUCTIONS:
1. Write a 4-line message in English.
2. Write a 4-line message in Egyptian Arabic (عامية مصرية).
3. Line 1: Specific observation about their business or pain point.
4. Line 2: What we do (done-for-you AI automation).
5. Line 3: A concrete result (number-based).
6. Line 4: One soft yes/no question.

Return ONLY a JSON object (no markdown formatting, no \`\`\`json) with these exact keys:
{
  "en_message": "...",
  "ar_message": "..."
}
`;

    let lastError = null;

    for (const provider of activeProviders) {
      try {
        let modelClient;
        if (provider.providerType === "openrouter") {
          modelClient = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: provider.apiKey })(provider.model);
        } else if (provider.providerType === "openai") {
          modelClient = createOpenAI({ apiKey: provider.apiKey })(provider.model);
        } else if (provider.providerType === "groq") {
          modelClient = createGroq({ apiKey: provider.apiKey })(provider.model);
        } else if (provider.providerType === "google") {
          modelClient = createGoogleGenerativeAI({ apiKey: provider.apiKey })(provider.model);
        } else if (provider.providerType === "anthropic") {
          // You would need @ai-sdk/anthropic for native anthropic, but we can fallback to openai compatibility if needed
          // For now, if they use openrouter they get anthropic.
          console.warn("Native Anthropic SDK not yet installed, skipping.");
          continue;
        } else {
          continue;
        }

        const result = streamText({
          model: modelClient,
          prompt: prompt,
          temperature: 0.3,
        });
        
        return result.toTextStreamResponse();
      } catch (apiError: unknown) {
        const apiMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.error(`Provider ${provider.name} (${provider.providerType}) failed:`, apiMessage);
        lastError = apiMessage;
        // Continue to the next provider in the loop
      }
    }

    // If loop exhausts without returning, all providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Groq Outreach Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

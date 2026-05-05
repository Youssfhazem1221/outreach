export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";

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
    
    const GROQ_API_KEY = userSettingsDoc.data()?.groq || globalSettingsDoc.data()?.groq || process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Groq API key is missing. Please add one in Settings." }), { status: 400 });
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

    try {
      const groq = createGroq({ apiKey: GROQ_API_KEY });
      const result = streamText({
        model: groq("llama-3.1-8b-instant"),
        prompt: prompt,
        temperature: 0.3,
      });
      
      return result.toTextStreamResponse();
    } catch (apiError: unknown) {
      const apiMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error("Groq API Error:", apiMessage);
      throw new Error(`AI generation failed: ${apiMessage}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Groq Outreach Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

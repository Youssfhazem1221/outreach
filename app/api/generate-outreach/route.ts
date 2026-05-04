import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";

export const runtime = 'edge';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { leadData, offer, idToken } = await req.json();

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Verify Firebase Auth Token
    await adminAuth!.verifyIdToken(idToken);

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

    const result = streamText({
      model: groq("llama-3.1-8b-instant"),
      prompt: prompt,
      temperature: 0.3,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Groq Outreach Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

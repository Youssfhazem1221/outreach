import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Initialize the Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { niche, location, country, scope, companySize, offer, count, idToken } = await req.json();

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Verify Firebase Auth Token
    const decodedToken = await adminAuth!.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const prompt = `
You are an expert B2B lead researcher.
Use Google Search to find exactly ${count} REAL businesses.

SEARCH PARAMETERS:
- Industry: "${niche}"
- Location: "${location}, ${country}"
- Scope: ${scope} (if "Local": search only this city. if "Global": search across the entire country)
- Target Size: ${companySize} employees

FOR EACH BUSINESS, EXTRACT FROM THE WEB:
1. Exact business name
2. Phone number (with country code — REQUIRED, skip if not found)
3. Email address (check website footer, contact page, Google listing)
4. Website URL
5. Full street address
6. City and Country
7. Owner/Manager name and title (if available)
8. Estimated employee count
9. Google rating and review count
10. Instagram handle (if found)
11. Facebook page URL (if found)
12. LinkedIn company URL (if found)
13. Whether they have a website (true/false)

THEN FOR EACH LEAD, GENERATE:
- One specific pain point based on their online presence
- Recommended outreach channel (WhatsApp/LinkedIn/Instagram/Email)
- A 4-line Hormozi-style English outreach message pitching: "${offer}"
- A 4-line Egyptian Arabic (عامية) outreach message

Return ONLY a valid JSON array of objects with these exact keys:
name, phone, email, website, address, city, country, niche, decisionMaker, decisionMakerTitle, employeeCount, rating, reviewCount, instagram, facebook, linkedin, hasWebsite, pain, channel, en_message, ar_message.

No markdown blocks like \`\`\`json. Just the raw JSON array.
`;

    // Note: We use generateText here and then manually write to Firestore 
    // to ensure the data is saved, but we'll return a fast response.
    // In a truly streamed UI, we would use streamText, but since we are
    // parsing a strict JSON array, we need the full text to parse it securely 
    // before writing to Firestore. To bypass Vercel's 10s timeout while waiting, 
    // Vercel's Hobby tier allows up to 60s for Route Handlers in App Router now 
    // by default, or we can use the Edge runtime.
    
    // Let's use Edge runtime to ensure no timeouts
    
    const { text } = await generateText({
      model: google("gemini-2.5-flash", {
        useSearchGrounding: true, // This enables Google Search!
      }),
      prompt: prompt,
      temperature: 0.2,
    });

    let leads = [];
    try {
      leads = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
      console.error("Failed to parse Gemini output:", text);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500 });
    }

    if (!Array.isArray(leads)) {
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), { status: 500 });
    }

    // Batch write to Firestore
    const batch = adminDb!.batch();
    const leadsRef = adminDb!.collection("leads");

    const savedLeads = leads.map((lead: any) => {
      const docRef = leadsRef.doc();
      const leadData = {
        ...lead,
        userId,
        status: "New",
        source: "gemini_search",
        rating: lead.rating ? parseFloat(lead.rating) : null,
        hasWebsite: lead.hasWebsite === true || lead.hasWebsite === "true",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(docRef, leadData);
      return { id: docRef.id, ...leadData };
    });

    await batch.commit();

    return new Response(JSON.stringify({ success: true, leads: savedLeads }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Lead Engine Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

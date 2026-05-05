export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// Helper to extract phone number using regex
function extractPhone(text: string): string {
  const phoneRegex = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4,6})/g;
  const match = text.match(phoneRegex);
  return match ? match[0] : "[No Phone Found]";
}

// Helper to detect social media
function detectSocial(url: string, content: string): { type: string, link: string | null } {
  const socials = [
    { name: "Facebook", pattern: /facebook\.com/i },
    { name: "Instagram", pattern: /instagram\.com/i },
    { name: "LinkedIn", pattern: /linkedin\.com/i },
    { name: "Twitter", pattern: /twitter\.com|x\.com/i }
  ];

  for (const s of socials) {
    if (s.pattern.test(url)) return { type: s.name, link: url };
  }

  const linkRegex = /(https?:\/\/(?:www\.)?(?:facebook|instagram|linkedin|twitter|x)\.com\/[^\s\)]+)/gi;
  const match = content.match(linkRegex);
  if (match) {
    for (const s of socials) {
      if (s.pattern.test(match[0])) return { type: s.name, link: match[0] };
    }
  }

  return { type: "Website", link: null };
}

// Helper to extract name from URL slug if title is junk
function extractNameFromUrl(url: string, title: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(p => p && p !== "pages" && p !== "p" && p.length > 2);
    
    if ((url.includes("facebook.com") || url.includes("instagram.com")) && 
        (title.toLowerCase().includes("instagram") || title.toLowerCase().includes("facebook") || title.length < 5 || /^[A-Z0-9]{5,}$/.test(title))) {
      if (pathParts.length > 0) {
        return pathParts[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  } catch (e) {}
  return title;
}

// Gibberish detector
function isGibberish(text: string): boolean {
  if (!text) return true;
  if (text.length < 3) return true;
  // If it's mostly random alphanumeric without spaces
  if (text.split(" ").length === 1 && text.length > 8 && /[0-9]/.test(text) && /[A-Z]/.test(text)) return true;
  // Banned generic names
  const banned = ["Dental Center", "Contact Us", "Log In", "Instagram", "Facebook", "Home", "Welcome", "About Us", "Dental Clinics"];
  if (banned.some(b => text.toLowerCase() === b.toLowerCase())) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const { query, location, country, scope, offer, count, idToken } = await req.json();

    if (!idToken || !adminAuth || !adminDb) return NextResponse.json({ error: "Unauthorized or System Error" }, { status: 401 });
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const settingsDoc = await adminDb.collection("settings").doc("api_keys").get();
    const globalSettings = settingsDoc.data() || {};
    
    // Multi-tier API Key Lookup: User Profile -> Global Settings -> Env Var
    const userSettingsDoc = await adminDb.collection("users").doc(userId).collection("settings").doc("api_keys").get();
    const userSettings = userSettingsDoc.data() || {};

    const TAVILY_API_KEY = userSettings.tavily || globalSettings.tavily || process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return NextResponse.json({ error: "Tavily API key is missing. Please add one in Settings." }, { status: 400 });
    }

    const tvly = tavily({ apiKey: TAVILY_API_KEY });
    const searchQuery = `${query} ${location} ${country} business contact info facebook instagram -directory -list`;
    
    const searchResponse = await tvly.search(searchQuery, {
      searchDepth: "advanced",
      maxResults: Math.floor((count || 10) * 3), // Get many more to filter out the "idiots"
    });

    const seenNames = new Set();
    const seenUrls = new Set();

    const leads = searchResponse.results
      .map((result: any) => {
        const detectedPhone = extractPhone(result.content);
        const socialInfo = detectSocial(result.url, result.content);
        
        // Smarter Name Extraction: Try slug first for social media
        let cleanName = result.title;
        if (socialInfo.link && (cleanName.toLowerCase().includes(socialInfo.type.toLowerCase()) || cleanName.length < 5)) {
           cleanName = extractNameFromUrl(result.url, result.title);
        }

        // Refined Cleaning: Only remove TRUE SEO noise, keep brand terms like "Dental" or "Maadi"
        cleanName = cleanName
          .replace(/Contact Us|Home|About Us|Welcome to|Top \d+|Best \d+|Results for|Log In|Sign Up/gi, "")
          .split(/[|—\-\:]/)[0]
          .trim();

        // Fallback to URL if still generic
        if (!cleanName || cleanName.toLowerCase().includes("instagram") || cleanName.toLowerCase().includes("facebook")) {
          cleanName = extractNameFromUrl(result.url, result.title);
        }

        const finalUrl = socialInfo.link || (result.url.includes("google.com/maps") ? null : result.url);
        const urlLabel = socialInfo.link ? `🌐 ${socialInfo.type}` : (finalUrl ? "🌐 Website" : "[No Link]");

        return {
          name: cleanName,
          niche: query,
          address: `${location}, ${country}`,
          city: location,
          country: country,
          phone: detectedPhone,
          website: finalUrl || "[No Link Found]",
          websiteLabel: urlLabel,
          decisionMaker: "Manual Verification",
          decisionMakerTitle: "N/A",
          pain: "Research activity on social",
          rating: Math.floor(result.score * 5) || 3,
          hasWebsite: !!finalUrl,
          tempId: Math.random().toString(36).substring(7),
          source: "tavily_filtered_extraction"
        };
      })
      .filter((l) => {
        if (isGibberish(l.name)) return false;
        if (seenNames.has(l.name.toLowerCase())) return false;
        if (l.website !== "[No Link Found]" && seenUrls.has(l.website.toLowerCase())) return false;
        
        seenNames.add(l.name.toLowerCase());
        if (l.website !== "[No Link Found]") seenUrls.add(l.website.toLowerCase());
        return true;
      })
      .slice(0, count || 10);

    return NextResponse.json({ success: true, leads });

  } catch (error: any) {
    console.error("Lead Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

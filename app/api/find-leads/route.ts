export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// ─── Extraction Helpers ───────────────────────────────────────────────────────

function extractPhone(text: string): string {
  const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,6}/g;
  const matches = text.match(phoneRegex);
  if (!matches) return "[No Phone Found]";
  // Return the longest match (most likely a full number)
  return matches.sort((a, b) => b.length - a.length)[0].trim();
}

function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches) return null;
  // Filter out junk emails
  const junkPatterns = /^(noreply|no-reply|support|admin|privacy|webmaster|info@example|mailer|daemon|postmaster|hostmaster|abuse)/i;
  const validEmails = matches.filter(e => !junkPatterns.test(e));
  return validEmails[0] || null;
}

// ─── Social Media Detection ───────────────────────────────────────────────────

function detectSocial(url: string, content: string): { type: string; link: string | null } {
  const socials = [
    { name: "Facebook", pattern: /facebook\.com/i },
    { name: "Instagram", pattern: /instagram\.com/i },
    { name: "LinkedIn", pattern: /linkedin\.com/i },
    { name: "Twitter", pattern: /twitter\.com|x\.com/i },
    { name: "TikTok", pattern: /tiktok\.com/i },
  ];

  for (const s of socials) {
    if (s.pattern.test(url)) return { type: s.name, link: url };
  }

  const linkRegex = /(https?:\/\/(?:www\.)?(?:facebook|instagram|linkedin|twitter|x|tiktok)\.com\/[^\s\)\"']+)/gi;
  const match = content.match(linkRegex);
  if (match) {
    for (const s of socials) {
      if (s.pattern.test(match[0])) return { type: s.name, link: match[0] };
    }
  }

  return { type: "Website", link: null };
}

// ─── Name Cleaning ────────────────────────────────────────────────────────────

function extractNameFromUrl(url: string, title: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split("/")
      .filter((p) => p && p !== "pages" && p !== "p" && p.length > 2);

    if (
      (url.includes("facebook.com") || url.includes("instagram.com")) &&
      (title.toLowerCase().includes("instagram") ||
        title.toLowerCase().includes("facebook") ||
        title.length < 5 ||
        /^[A-Z0-9]{5,}$/.test(title))
    ) {
      if (pathParts.length > 0) {
        return pathParts[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  } catch (e) {}
  return title;
}

// ─── Gibberish / Junk Detection (Enhanced) ────────────────────────────────────

function isGibberish(text: string): boolean {
  if (!text) return true;
  if (text.length < 3) return true;

  // Mostly random alphanumeric
  if (
    text.split(" ").length === 1 &&
    text.length > 10 &&
    /[0-9]/.test(text) &&
    /[A-Z]/.test(text)
  )
    return true;

  // Banned exact names
  const bannedExact = [
    "dental center", "contact us", "log in", "sign up", "instagram",
    "facebook", "home", "welcome", "about us", "dental clinics",
    "privacy policy", "terms of service", "cookie policy",
  ];
  if (bannedExact.includes(text.toLowerCase().trim())) return true;

  // Listicle / directory patterns
  const junkPatterns = /^(top \d+|best \d+|\d+ best|results for|list of|find .* near|directory|category:|tag:)/i;
  if (junkPatterns.test(text)) return true;

  return false;
}

function isJunkUrl(url: string): boolean {
  const junkUrlPatterns = [
    /\/search\?/,
    /\/category\//,
    /\/tag\//,
    /\/page\/\d+/,
    /google\.com\/maps/,
    /yelp\.com\/search/,
    /yellowpages\.com/,
    /tripadvisor\.com\/Tourism/,
    /wikipedia\.org/,
  ];
  return junkUrlPatterns.some((p) => p.test(url));
}

// ─── Lead Scoring ─────────────────────────────────────────────────────────────

function scoreLead(lead: any, nicheKeyword: string): number {
  let score = 0;
  const maxScore = 8;

  if (lead.phone && lead.phone !== "[No Phone Found]") score += 2;
  if (lead.email) score += 2;
  if (lead.socialLink) score += 1;
  if (lead.website && lead.website !== "[No Link Found]") score += 1;
  if (!isGibberish(lead.name)) score += 1;
  // Content relevance: does the source mention the niche?
  if (lead._rawContent?.toLowerCase().includes(nicheKeyword.toLowerCase())) score += 1;

  // Normalize to 1-5 stars
  return Math.max(1, Math.round((score / maxScore) * 5));
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { query, location, country, scope, offer, count, idToken } =
      await req.json();

    if (!idToken || !adminAuth || !adminDb)
      return NextResponse.json(
        { error: "Unauthorized or System Error" },
        { status: 401 }
      );

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // ─── API Key Resolution (Multi-tier) ──────────────────────────────
    const settingsDoc = await adminDb
      .collection("settings")
      .doc("api_keys")
      .get();
    const globalSettings = settingsDoc.data() || {};

    const userSettingsDoc = await adminDb
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("api_keys")
      .get();
    const userSettings = userSettingsDoc.data() || {};

    const TAVILY_API_KEY =
      userSettings.tavily ||
      globalSettings.tavily ||
      process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return NextResponse.json(
        { error: "Tavily API key is missing. Please add one in Settings." },
        { status: 400 }
      );
    }

    const tvly = tavily({ apiKey: TAVILY_API_KEY });
    const resultsPerPass = Math.ceil(((count || 10) * 2));

    // ─── Multi-Pass Search (3 parallel queries) ───────────────────────

    const locationStr = scope === "Global" ? country : `${location} ${country}`;

    const searchQueries = [
      // Pass 1: Direct business pages with contact info
      `${query} ${locationStr} business contact phone email`,
      // Pass 2: Social media profiles
      `${query} ${locationStr} site:facebook.com OR site:instagram.com`,
      // Pass 3: Review/listing sites with real business data
      `${query} near ${location} ${country} reviews contact`,
    ];

    const searchPromises = searchQueries.map((q) =>
      tvly
        .search(q, {
          searchDepth: "advanced",
          maxResults: resultsPerPass,
        })
        .catch((err) => {
          console.error(`Search pass failed for: "${q}"`, err.message);
          return { results: [] }; // Graceful degradation
        })
    );

    const searchResults = await Promise.all(searchPromises);

    // ─── Merge & Deduplicate Raw Results ──────────────────────────────

    const allRawResults: any[] = [];
    const seenRawUrls = new Set<string>();

    for (const response of searchResults) {
      for (const result of (response as any).results || []) {
        const normalizedUrl = result.url?.toLowerCase().replace(/\/$/, "");
        if (normalizedUrl && !seenRawUrls.has(normalizedUrl)) {
          seenRawUrls.add(normalizedUrl);
          allRawResults.push(result);
        }
      }
    }

    // ─── Process & Extract Lead Data ──────────────────────────────────

    const seenNames = new Set<string>();
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    const leads = allRawResults
      .filter((result) => !isJunkUrl(result.url))
      .map((result: any) => {
        const content = result.content || "";
        const detectedPhone = extractPhone(content);
        const detectedEmail = extractEmail(content);
        const socialInfo = detectSocial(result.url, content);

        // Smart Name Extraction
        let cleanName = result.title;
        if (
          socialInfo.link &&
          (cleanName.toLowerCase().includes(socialInfo.type.toLowerCase()) ||
            cleanName.length < 5)
        ) {
          cleanName = extractNameFromUrl(result.url, result.title);
        }

        // Refined Cleaning
        cleanName = cleanName
          .replace(
            /Contact Us|Home|About Us|Welcome to|Top \d+|Best \d+|Results for|Log In|Sign Up|\| .*$|— .*$/gi,
            ""
          )
          .split(/[|—\-\:]/)[0]
          .trim();

        // Fallback to URL slug if still generic
        if (
          !cleanName ||
          cleanName.toLowerCase().includes("instagram") ||
          cleanName.toLowerCase().includes("facebook")
        ) {
          cleanName = extractNameFromUrl(result.url, result.title);
        }

        const finalUrl =
          socialInfo.link ||
          (result.url.includes("google.com/maps") ? null : result.url);
        const urlLabel = socialInfo.link
          ? `🌐 ${socialInfo.type}`
          : finalUrl
            ? "🌐 Website"
            : "[No Link]";

        return {
          name: cleanName,
          niche: query,
          address: `${location}, ${country}`,
          city: location,
          country: country,
          phone: detectedPhone,
          email: detectedEmail,
          website: finalUrl || "[No Link Found]",
          websiteLabel: urlLabel,
          socialLink: socialInfo.link,
          channel: socialInfo.link ? socialInfo.type.toLowerCase() : "website",
          decisionMaker: "Manual Verification",
          decisionMakerTitle: "N/A",
          pain: "Research activity on social",
          hasWebsite: !!finalUrl,
          tempId: Math.random().toString(36).substring(7),
          source: "tavily_multipass",
          _rawContent: content, // Used for scoring, stripped before sending
        };
      })
      .filter((l) => {
        if (isGibberish(l.name)) return false;

        // Deduplicate by name
        const lowerName = l.name.toLowerCase();
        if (seenNames.has(lowerName)) return false;
        seenNames.add(lowerName);

        // Deduplicate by phone (if it's a real phone)
        if (l.phone !== "[No Phone Found]") {
          const normalizedPhone = l.phone.replace(/\D/g, "");
          if (normalizedPhone.length > 6 && seenPhones.has(normalizedPhone)) return false;
          if (normalizedPhone.length > 6) seenPhones.add(normalizedPhone);
        }

        // Deduplicate by email
        if (l.email) {
          const lowerEmail = l.email.toLowerCase();
          if (seenEmails.has(lowerEmail)) return false;
          seenEmails.add(lowerEmail);
        }

        return true;
      })
      .map((l) => {
        // Score the lead
        const rating = scoreLead(l, query);
        // Strip internal fields before returning
        const { _rawContent, ...cleanLead } = l;
        return { ...cleanLead, rating };
      })
      // Sort by score descending (best leads first)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, count || 10);

    // ─── DB Deduplication (check existing leads) ──────────────────────

    let existingPhones = new Set<string>();
    let existingEmails = new Set<string>();

    try {
      const existingLeadsSnap = await adminDb
        .collection("leads")
        .where("userId", "==", userId)
        .get();

      existingLeadsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.phone && data.phone !== "[No Phone Found]") {
          existingPhones.add(data.phone.replace(/\D/g, ""));
        }
        if (data.email) {
          existingEmails.add(data.email.toLowerCase());
        }
      });
    } catch (err) {
      console.error("DB dedup check failed (non-fatal):", err);
    }

    // Mark leads that are already in the CRM
    const leadsWithDupFlag = leads.map((lead) => {
      const phoneNorm = lead.phone?.replace(/\D/g, "") || "";
      const emailNorm = lead.email?.toLowerCase() || "";

      const alreadyInCRM =
        (phoneNorm.length > 6 && existingPhones.has(phoneNorm)) ||
        (emailNorm && existingEmails.has(emailNorm));

      return { ...lead, alreadyInCRM };
    });

    return NextResponse.json({
      success: true,
      leads: leadsWithDupFlag,
      meta: {
        totalRawResults: allRawResults.length,
        afterFiltering: leads.length,
        passesCompleted: searchResults.filter((r: any) => (r as any).results?.length > 0).length,
      },
    });
  } catch (error: any) {
    console.error("Lead Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

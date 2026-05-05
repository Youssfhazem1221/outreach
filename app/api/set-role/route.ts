export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { targetUid, newRole, idToken } = await req.json();

    if (!idToken || !targetUid || !newRole || !adminAuth) {
      return new Response(JSON.stringify({ error: "Missing required fields or System Error" }), { status: 400 });
    }

    // Verify caller is admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (decodedToken.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403 });
    }

    // Set custom claim
    await adminAuth.setCustomUserClaims(targetUid, { role: newRole });

    return new Response(JSON.stringify({ success: true, message: `Role ${newRole} assigned to ${targetUid}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Set Role Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

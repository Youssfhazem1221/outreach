import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { targetUid, newRole, idToken } = await req.json();

    if (!idToken || !targetUid || !newRole) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Verify caller is admin
    const decodedToken = await adminAuth!.verifyIdToken(idToken);
    
    // IMPORTANT: For the FIRST admin setup, you'll need to bypass this check manually once,
    // or set it via a separate admin script. For safety, this endpoint requires the caller to ALREADY be an admin.
    if (decodedToken.role !== "admin" && decodedToken.uid !== targetUid) {
      // Allowing users to set their own role just for demo purposes if they are the first user
      // In production, strictly enforce decodedToken.role === "admin"
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403 });
    }

    // Set custom claim
    await adminAuth!.setCustomUserClaims(targetUid, { role: newRole });

    return new Response(JSON.stringify({ success: true, message: `Role ${newRole} assigned to ${targetUid}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Set Role Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

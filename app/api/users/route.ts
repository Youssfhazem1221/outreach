export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

type AdminUserSummary = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  creationTime?: string;
  lastSignInTime?: string;
  role: string;
};

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken || !adminAuth) {
      return new Response(JSON.stringify({ error: "Unauthorized or System Error" }), { status: 401 });
    }

    // Verify caller is admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (decodedToken.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403 });
    }

    // List all users (limit 1000 for now)
    const listUsersResult = await adminAuth.listUsers(1000);
    
    const users: AdminUserSummary[] = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      role: userRecord.customClaims?.role || "user",
    }));

    return new Response(JSON.stringify({ success: true, users }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Fetch Users Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

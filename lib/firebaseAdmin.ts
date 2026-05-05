import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Handle escaped newlines in the private key string from env vars
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/^"(.*)"$/, '$1').replace(/\\n/g, "\n")
  : undefined;

// Singleton pattern to prevent re-initialization crashes in Next.js development and edge
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Check if we have valid credentials and they aren't just placeholder strings
  const isConfigured = 
    projectId && projectId !== "undefined" &&
    clientEmail && clientEmail !== "undefined" &&
    privateKey && privateKey !== "undefined";

  if (isConfigured) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId as string,
          clientEmail: clientEmail as string,
          privateKey: privateKey as string,
        }),
      });
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
      return null;
    }
  }

  return null;
}

const adminApp = initializeAdminApp();
const adminDb = adminApp ? adminApp.firestore() : null;
const adminAuth = adminApp ? adminApp.auth() : null;

export { adminDb, adminAuth };

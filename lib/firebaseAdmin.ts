import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Handle escaped newlines in the private key string from env vars
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

// Singleton pattern to prevent re-initialization crashes in Next.js development and edge
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Only initialize if we have the credentials, otherwise we might be in a build step where they aren't provided
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return null;
}

const adminApp = initializeAdminApp();
const adminDb = adminApp ? adminApp.firestore() : null;
const adminAuth = adminApp ? adminApp.auth() : null;

export { adminDb, adminAuth };

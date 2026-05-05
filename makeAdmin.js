const admin = require("firebase-admin");
const fs = require("fs");
const dotenv = require("dotenv");

// Load env vars
const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

async function makeFirstUserAdmin() {
  try {
    const listUsersResult = await admin.auth().listUsers(10);
    if (listUsersResult.users.length === 0) {
      console.log("No users found. Please log into the app first!");
      process.exit(1);
    }

    const firstUser = listUsersResult.users[0];
    await admin.auth().setCustomUserClaims(firstUser.uid, { role: "admin" });
    console.log(`SUCCESS! Made user ${firstUser.email} an Admin!`);
    
    // Log them out everywhere so their token refreshes
    await admin.auth().revokeRefreshTokens(firstUser.uid);
    console.log("Tokens revoked. Please refresh the page and log in again to see the Settings tab.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

makeFirstUserAdmin();

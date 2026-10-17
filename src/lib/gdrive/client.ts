import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
}

/**
 * Resolves Google Cloud Service Account credentials from environment variables
 * or local JSON key files.
 */
export function getGoogleDriveCredentials(): {
  clientEmail: string;
  privateKey: string;
} | null {
  // 1. Direct environment variables
  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  ) {
    return {
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
        /\\n/g,
        "\n",
      ),
    };
  }

  // 2. Raw JSON string in environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      ) as ServiceAccountCredentials;
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch (err) {
      console.error("[gdrive] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", err);
    }
  }

  // 3. Specified file path
  const candidatePaths: string[] = [];
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    candidatePaths.push(
      path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH),
    );
  }

  // 4. Common default filenames in project root
  candidatePaths.push(
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), "google-credentials.json"),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), "service-account.json"),
  );

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content) as ServiceAccountCredentials;
        if (parsed.client_email && parsed.private_key) {
          return {
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          };
        }
      } catch (err) {
        console.error(`[gdrive] Failed to read credentials from ${filePath}:`, err);
      }
    }
  }

  return null;
}

export function isOAuth2Configured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

export function getParentFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "GOOGLE_DRIVE_PARENT_FOLDER_ID belum disetel di environment variables.",
    );
  }
  return folderId.trim();
}

export function isGoogleDriveConfigured(): boolean {
  return (
    (isOAuth2Configured() || getGoogleDriveCredentials() !== null) &&
    Boolean(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID)
  );
}

/**
 * Returns an authenticated Google Drive client instance.
 * Supports:
 * 1. OAuth 2.0 user credentials (uses user's personal Gmail quota)
 * 2. Service Account JWT (uses organization/Shared Drive quota)
 */
export function getGoogleDriveClient() {
  // Option A: OAuth 2.0 (Best for personal @gmail.com accounts)
  if (isOAuth2Configured()) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // Option B: Service Account (Best for Google Workspace Shared Drives)
  const creds = getGoogleDriveCredentials();
  if (!creds) {
    throw new Error(
      "Kredensial Google Drive tidak ditemukan. Setel OAuth 2.0 atau Google Service Account.",
    );
  }

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { getGoogleDriveClient, getParentFolderId } from "./client";

export interface ActivityFolderInfo {
  folderId: string;
  folderUrl: string;
}

function formatDatePrefix(date: Date): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ensures a Google Drive subfolder exists for the given activity.
 * If already created and stored in the database, returns the cached info.
 * Otherwise, creates a new folder in Google Drive and updates the activity row.
 */
export async function getOrCreateActivityFolder(
  activityId: string,
): Promise<ActivityFolderInfo> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      date: true,
      partner: true,
      driveFolderId: true,
      driveFolderUrl: true,
      location: { select: { name: true } },
    },
  });

  if (!activity) {
    throw new Error(`Kegiatan dengan ID "${activityId}" tidak ditemukan.`);
  }

  // If already created, return it
  if (activity.driveFolderId && activity.driveFolderUrl) {
    return {
      folderId: activity.driveFolderId,
      folderUrl: activity.driveFolderUrl,
    };
  }

  const drive = getGoogleDriveClient();
  const parentFolderId = getParentFolderId();

  const dateStr = formatDatePrefix(activity.date);
  const partnerName = activity.partner.trim() || activity.location?.name || "Kegiatan";
  const folderName = `${dateStr} - ${partnerName}`;

  // 1. Create subfolder inside parent folder
  const createRes = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id, webViewLink",
  });

  const folderId = createRes.data.id;
  const folderUrl =
    createRes.data.webViewLink ||
    `https://drive.google.com/drive/folders/${folderId}`;

  if (!folderId) {
    throw new Error("Gagal mendapatkan ID folder dari Google Drive.");
  }

  // 2. Set permission so anyone with link can view (friendly for WhatsApp reports)
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (permError) {
    console.warn(
      "[gdrive] Warning: Tidak dapat mengubah hak akses publik folder (akan mewarisi folder induk):",
      permError,
    );
  }

  // 3. Persist to database
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      driveFolderId: folderId,
      driveFolderUrl: folderUrl,
    },
  });

  return { folderId, folderUrl };
}

/**
 * Initiates a Google Drive resumable upload session for direct client-to-drive upload.
 * This completely avoids Vercel's 4.5 MB request payload limit for videos.
 */
export async function createResumableUploadSession({
  activityId,
  filename,
  mimeType,
  size,
  origin,
}: {
  activityId: string;
  filename: string;
  mimeType: string;
  size?: number;
  origin?: string;
}): Promise<{ uploadUrl: string; folderId: string; folderUrl: string }> {
  const { folderId, folderUrl } = await getOrCreateActivityFolder(activityId);
  const drive = getGoogleDriveClient();

  // Obtain OAuth access token from JWT client or OAuth2 client
  const auth = drive.context._options.auth as {
    getAccessToken: () => Promise<{ token?: string | null }>;
  };
  const tokenRes = await auth.getAccessToken();
  const token = tokenRes.token;

  if (!token) {
    throw new Error("Gagal memperoleh access token Google Drive.");
  }

  // Initiate resumable session with Google Drive API
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": mimeType || "application/octet-stream",
  };

  if (origin) {
    headers["Origin"] = origin;
  }

  if (size !== undefined && size > 0) {
    headers["X-Upload-Content-Length"] = String(size);
  }

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,size,mimeType",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: filename,
        parents: [folderId],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gagal membuat sesi upload Google Drive (${response.status}): ${errorText}`,
    );
  }

  const uploadUrl = response.headers.get("Location") || response.headers.get("location");
  if (!uploadUrl) {
    throw new Error(
      "Google Drive API tidak mengembalikan header Location untuk sesi upload.",
    );
  }

  return { uploadUrl, folderId, folderUrl };
}

/**
 * Direct server-side upload to Google Drive for smaller files or fallback.
 */
export async function uploadBufferToDrive({
  activityId,
  filename,
  mimeType,
  buffer,
}: {
  activityId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string; size: number }> {
  const { folderId } = await getOrCreateActivityFolder(activityId);
  const drive = getGoogleDriveClient();

  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, size",
  });

  const fileId = res.data.id;
  const webViewLink =
    res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  if (!fileId) {
    throw new Error("Gagal mengunggah file ke Google Drive.");
  }

  return {
    fileId,
    webViewLink,
    size: Number(res.data.size) || buffer.length,
  };
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  try {
    const drive = getGoogleDriveClient();
    try {
      await drive.files.delete({ fileId, supportsAllDrives: true });
    } catch {
      await drive.files.update({
        fileId,
        supportsAllDrives: true,
        requestBody: { trashed: true },
      });
    }
  } catch (error) {
    console.error(`[gdrive] Gagal menghapus file ${fileId} dari Google Drive:`, error);
  }
}

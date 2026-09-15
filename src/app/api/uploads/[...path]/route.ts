import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createSignedFileUrl, isUsingLocalStorage } from "@/lib/storage";

/**
 * Serves documentation files behind the session check.
 *
 * Blobs are stored privately, so there is no public URL to link to: this route
 * redirects to a short-lived signed URL instead. In development it reads the
 * same files from the disk fallback, which keeps a single URL shape in the
 * database across both modes.
 */
export const runtime = "nodejs";

const DEV_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".zip": "application/zip",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const { path: segments } = await context.params;

  if (!isUsingLocalStorage()) {
    try {
      const signedUrl = await createSignedFileUrl(segments.join("/"));

      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: signedUrl,
          // Well under the signed URL's lifetime, so a cached redirect can
          // never outlive the URL it points at.
          "Cache-Control": "private, max-age=600",
        },
      });
    } catch (error) {
      console.error("[uploads]", error);
      return new NextResponse(null, { status: 404 });
    }
  }

  // Resolve first, then confirm the result is still inside the upload folder.
  // A segment like ".." would otherwise escape it.
  const target = path.resolve(DEV_UPLOAD_DIR, ...segments);
  const root = path.resolve(DEV_UPLOAD_DIR);

  if (target !== root && !target.startsWith(root + path.sep)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const file = await fs.readFile(target);
    const contentType =
      CONTENT_TYPES[path.extname(target).toLowerCase()] ??
      "application/octet-stream";

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

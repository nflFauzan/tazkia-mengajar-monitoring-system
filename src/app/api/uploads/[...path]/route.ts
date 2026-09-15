import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { isUsingLocalStorage } from "@/lib/storage";

/**
 * Serves files written by the development disk fallback in lib/storage.
 *
 * Only active when no Blob token is configured; in production the files live in
 * Vercel Blob and are served from its own URL, so this route refuses to do
 * anything. That keeps it from becoming an accidental file-read endpoint on a
 * deployed instance.
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
  if (!isUsingLocalStorage()) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const { path: segments } = await context.params;

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

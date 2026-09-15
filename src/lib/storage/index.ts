import { promises as fs } from "node:fs";
import path from "node:path";
import { del, issueSignedToken, presignUrl, put } from "@vercel/blob";

/**
 * Object storage for documentation files.
 *
 * Production uses Vercel Blob. When BLOB_READ_WRITE_TOKEN is absent in
 * development, files fall back to a local folder so the whole upload pipeline —
 * validation, WebP conversion, metadata, preview, delete — can be exercised
 * without provisioning a store first.
 *
 * The fallback is development-only on purpose. Vercel's filesystem is
 * ephemeral, so silently using it in production would lose every upload on the
 * next deploy; `assertStorageConfigured` makes that a startup error instead.
 *
 * Blobs are stored with private access: documentation contains photos of
 * children, which must not be readable by anyone holding a guessed URL. Both
 * storage modes therefore hand out an app URL served by /api/uploads, which
 * checks the session before streaming the file or redirecting to a signed one.
 */

/** Signed URLs are short-lived; the browser re-requests through /api/uploads. */
const SIGNED_URL_TTL_MS = 60 * 60 * 1000;

export interface StoredFile {
  /** Storage pathname, used later to sign and delete the object. */
  key: string;
  /** App URL the browser loads the file from, always behind authentication. */
  url: string;
}

const DEV_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Called at upload time rather than module load, so a missing token surfaces as
 * a clear error on the one route that needs it instead of breaking the build.
 */
export function assertStorageConfigured(): void {
  if (isProduction() && !hasBlobToken()) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Production uploads require Vercel Blob; " +
        "the local disk fallback is development-only because Vercel's filesystem is ephemeral.",
    );
  }
}

export function isUsingLocalStorage(): boolean {
  return !hasBlobToken() && !isProduction();
}

export async function putFile(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<StoredFile> {
  assertStorageConfigured();

  if (isUsingLocalStorage()) {
    const target = path.join(DEV_UPLOAD_DIR, pathname);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);

    return { key: pathname, url: `/api/uploads/${pathname}` };
  }

  const blob = await put(pathname, body, {
    access: "private",
    contentType,
    // Vercel Blob appends a random suffix by default, which prevents one upload
    // from overwriting another that happens to share a filename.
    addRandomSuffix: true,
  });

  // The suffix makes the stored pathname differ from the requested one, so the
  // key and the URL both come from the result rather than the input.
  return { key: blob.pathname, url: `/api/uploads/${blob.pathname}` };
}

/**
 * Builds a temporary direct URL for a private blob, so the browser fetches the
 * bytes from Blob storage instead of streaming them through a function.
 */
export async function createSignedFileUrl(key: string): Promise<string> {
  const signedToken = await issueSignedToken({
    pathname: key,
    operations: ["get"],
    validUntil: Date.now() + SIGNED_URL_TTL_MS,
  });

  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname: key,
    access: "private",
  });

  return presignedUrl;
}

export async function deleteFile(key: string): Promise<void> {
  if (isUsingLocalStorage()) {
    const target = path.join(DEV_UPLOAD_DIR, key);
    await fs.rm(target, { force: true });
    return;
  }

  await del(key);
}

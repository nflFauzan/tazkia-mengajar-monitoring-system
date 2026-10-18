"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Video as VideoIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteDocumentationAction } from "@/server/actions/documentation";
import { cn } from "@/lib/utils";

export interface DocumentationItem {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  url: string;
  isImage: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string, isImage: boolean) {
  if (isImage || mimeType.startsWith("image/")) {
    return <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (mimeType.startsWith("video/")) {
    return <VideoIcon className="size-4 text-sky-600 dark:text-sky-400" />;
  }
  return <FileText className="text-muted-foreground size-4" />;
}

export function DocumentationPanel({
  activityId,
  documents,
  driveFolderUrl: initialDriveFolderUrl,
  readOnly = false,
}: {
  activityId: string;
  documents: DocumentationItem[];
  driveFolderUrl?: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(
    initialDriveFolderUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  /**
   * Attempts Google Drive direct resumable upload.
   * If Google Drive is not configured, gracefully falls back to local /api/upload.
   */
  async function uploadFileToDrive(
    file: File,
  ): Promise<{ ok: boolean; error?: string; isConfigError?: boolean }> {
    try {
      // 1. Request a resumable upload session from backend
      const sessionRes = await fetch("/api/upload/gdrive-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        return {
          ok: false,
          error:
            sessionData.error ||
            `Gagal membuat sesi upload Google Drive (${sessionRes.status}).`,
          isConfigError: sessionRes.status === 503,
        };
      }

      if (sessionData.folderUrl) {
        setDriveFolderUrl(sessionData.folderUrl);
      }

      // 2. Upload file directly to Google Drive with automatic server fallback if CORS is blocked
      let driveFile: {
        id: string;
        name: string;
        webViewLink?: string;
        mimeType?: string;
        size?: string;
      } | null = null;

      try {
        const uploadRes = await fetch(sessionData.uploadUrl, {
          method: "PUT",
          body: file,
        });

        if (uploadRes.ok) {
          driveFile = (await uploadRes.json()) as {
            id: string;
            name: string;
            webViewLink?: string;
            mimeType?: string;
            size?: string;
          };
        }
      } catch (directErr) {
        console.warn(
          "[upload] Direct client upload blocked by browser policy, using server relay:",
          directErr,
        );
      }

      // If direct client upload was blocked by browser CORS, upload via backend server
      if (!driveFile) {
        const fbRes = await uploadStandardFallback([file]);
        if (fbRes.error || (fbRes.errors && fbRes.errors.length > 0)) {
          return {
            ok: false,
            error: fbRes.error || fbRes.errors?.[0] || `"${file.name}" gagal diunggah.`,
          };
        }
        return { ok: true };
      }

      // 3. Confirm to backend to persist metadata into database
      const confirmRes = await fetch("/api/upload/gdrive-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          fileId: driveFile.id,
          originalFilename: file.name,
          mimeType: file.type || driveFile.mimeType || "application/octet-stream",
          size: file.size,
          webViewLink: driveFile.webViewLink,
        }),
      });

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json();
        return {
          ok: false,
          error: confirmData.error || "Gagal mencatat metadata dokumentasi.",
        };
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : `Gagal mengunggah "${file.name}". Periksa koneksi internet.`,
      };
    }
  }

  /**
   * Fallback to standard server-side upload if Google Drive is not configured.
   */
  async function uploadStandardFallback(files: File[]) {
    const formData = new FormData();
    formData.append("activityId", activityId);
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    return (await response.json()) as {
      uploaded?: Array<{ id: string }>;
      errors?: string[];
      error?: string;
    };
  }

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;

    setIsUploading(true);
    setErrors([]);
    setUploadStatus("");

    const failedMessages: string[] = [];
    let successCount = 0;
    const fallbackList: File[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setUploadStatus(`Mengunggah (${i + 1}/${list.length}): ${file.name}...`);

      const result = await uploadFileToDrive(file);

      if (result.ok) {
        successCount++;
      } else if (result.error === "FALLBACK_STANDARD") {
        fallbackList.push(file);
      } else {
        failedMessages.push(result.error || `"${file.name}" gagal diunggah.`);
        if (result.isConfigError) {
          // If Google Drive is not configured on the server, abort remaining uploads
          break;
        }
      }
    }

    if (fallbackList.length > 0) {
      if (!isMountedRef.current) return;
      setUploadStatus("Mengunggah via server penyimpanan lokal...");
      const fbResult = await uploadStandardFallback(fallbackList);
      if (fbResult.error) {
        failedMessages.push(fbResult.error);
      } else {
        if (fbResult.uploaded?.length) successCount += fbResult.uploaded.length;
        if (fbResult.errors?.length) failedMessages.push(...fbResult.errors);
      }
    }

    if (!isMountedRef.current) return;

    if (successCount > 0) {
      toast.success(`${successCount} berkas berhasil diunggah.`);
      router.refresh();
    }

    if (failedMessages.length > 0) {
      setErrors(Array.from(new Set(failedMessages)));
    }

    setIsUploading(false);
    setUploadStatus("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Google Drive Folder Banner */}
      {driveFolderUrl ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border-2 border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-[var(--shadow-brutal)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Folder Google Drive Kegiatan
              </p>
              <p className="text-muted-foreground text-xs">
                Dokumentasi foto dan video tersimpan di Google Drive. Tautan ini juga disertakan otomatis di laporan.
              </p>
            </div>
          </div>
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "shrink-0 flex items-center gap-1.5",
            )}
          >
            Buka Google Drive
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {errors.map((error, idx) => (
                <li key={`${error}-${idx}`}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {readOnly ? null : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void upload(event.dataTransfer.files);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors shadow-sm",
            isDragging ? "border-primary bg-primary/5" : "border-muted",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void upload(event.target.files);
            }}
          />

          <Upload className="text-muted-foreground mx-auto mb-3 size-6" />
          <p className="text-sm font-medium">
            Tarik foto & video ke sini atau pilih dari perangkat
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Berkas langsung terunggah ke Google Drive ke dalam subfolder kegiatan tanpa membebani penyimpanan aplikasi web.
          </p>

          <Button
            variant="outline"
            className="mt-4"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" />
                {uploadStatus || "Mengunggah..."}
              </>
            ) : (
              "Pilih Foto / Video"
            )}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumentasi."
          description="Laporan kegiatan membutuhkan minimal satu berkas foto atau video dokumentasi."
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
            <span>Berkas Terunggah ({documents.length})</span>
            {driveFolderUrl && (
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Lihat Semua di Google Drive
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          <ul className="rounded-lg border-2 border-border divide-y divide-border bg-card shadow-[var(--shadow-brutal)] overflow-hidden">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded bg-muted/60 shrink-0">
                    {getFileIcon(doc.mimeType, doc.isImage)}
                  </div>
                  <div className="min-w-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-xs sm:text-sm hover:underline truncate block text-foreground"
                    >
                      {doc.originalFilename}
                    </a>
                    <p className="text-muted-foreground text-xs">
                      {formatSize(doc.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Buka ${doc.originalFilename}`}
                    title="Buka di tab baru"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    )}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  {readOnly ? null : <DeleteDocumentButton doc={doc} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DeleteDocumentButton({ doc }: { doc: DocumentationItem }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Hapus ${doc.originalFilename}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus dokumentasi?"
        description={`"${doc.originalFilename}" akan dihapus permanen dari penyimpanan.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Dokumentasi dihapus."
        destructive
        action={async () => {
          const result = await deleteDocumentationAction(doc.id);
          if (result.ok) startTransition(() => router.refresh());
          return result;
        }}
      />
    </>
  );
}

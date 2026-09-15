"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

/**
 * Step 5. Uploads go to /api/upload rather than straight to storage, so the
 * blob token stays on the server and every file is validated and converted
 * before it is stored.
 */
export function DocumentationPanel({
  activityId,
  documents,
  readOnly = false,
}: {
  activityId: string;
  documents: DocumentationItem[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;

    setIsUploading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("activityId", activityId);
      for (const file of list) {
        formData.append("files", file);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        uploaded?: Array<{ id: string }>;
        errors?: string[];
        error?: string;
      };

      if (result.error) {
        setErrors([result.error]);
      } else {
        if (result.uploaded?.length) {
          toast.success(`${result.uploaded.length} berkas diunggah.`);
          router.refresh();
        }
        // Partial failures are shown alongside whatever did succeed.
        if (result.errors?.length) setErrors(result.errors);
      }
    } catch {
      setErrors(["Gagal mengunggah berkas. Periksa koneksi lalu coba lagi."]);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
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
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void upload(event.target.files);
            }}
          />

          <Upload className="text-muted-foreground mx-auto mb-3 size-6" />
          <p className="text-sm font-medium">
            Tarik berkas ke sini atau pilih dari perangkat
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Gambar otomatis dikonversi ke WebP. PDF, dokumen, dan video
            disimpan apa adanya. Maksimal 25 MB per berkas.
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
                Mengunggah...
              </>
            ) : (
              "Pilih Berkas"
            )}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumentasi."
          description="Laporan final membutuhkan minimal satu berkas dokumentasi."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <li key={doc.id} className="border-border overflow-hidden rounded-lg border-2 shadow-[var(--shadow-brutal)]">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="bg-muted flex aspect-video items-center justify-center"
              >
                {doc.isImage ? (
                  <Image
                    src={doc.url}
                    alt={doc.originalFilename}
                    width={320}
                    height={180}
                    className="size-full object-cover"
                    unoptimized
                  />
                ) : (
                  <FileText className="text-muted-foreground size-8" />
                )}
              </a>
              <div className="flex items-start justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {doc.originalFilename}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatSize(doc.size)}
                    {doc.isImage ? " · WebP" : ""}
                  </p>
                </div>
                {readOnly ? null : <DeleteDocumentButton doc={doc} />}
              </div>
            </li>
          ))}
        </ul>
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
        <Trash2 className="size-3.5" />
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

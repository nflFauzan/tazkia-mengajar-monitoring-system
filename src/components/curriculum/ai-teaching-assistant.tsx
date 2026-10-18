"use client";

import { useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Gamepad2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  copyTextToClipboard,
  generateTeachingPrompt,
  openInChatGPT,
  openInGemini,
  PROMPT_MODES,
  type MaterialPromptContext,
  type TeachingPromptMode,
} from "@/lib/ai-prompt";
import { cn } from "@/lib/utils";

interface AiTeachingAssistantProps {
  material: MaterialPromptContext;
}

export function AiTeachingAssistant({ material }: AiTeachingAssistantProps) {
  const [activeMode, setActiveMode] =
    useState<TeachingPromptMode>("lesson-plan");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = generateTeachingPrompt(material, activeMode);
  const activeModeMeta =
    PROMPT_MODES.find((m) => m.id === activeMode) ?? PROMPT_MODES[0];

  async function handleCopy() {
    const ok = await copyTextToClipboard(prompt);
    if (ok) {
      setCopied(true);
      toast.success("Prompt materi berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Gagal menyalin teks ke clipboard.");
    }
  }

  async function handleChatGPT() {
    await copyTextToClipboard(prompt);
    toast.success("Membuka ChatGPT! Teks prompt sudah otomatis disiapkan.");
    openInChatGPT(prompt);
  }

  async function handleGemini() {
    await copyTextToClipboard(prompt);
    toast.success(
      "Prompt telah disalin! Tinggal tekan Ctrl+V (Tempel) di kotak chat Gemini.",
    );
    openInGemini();
  }

  return (
    <div className="rounded-lg border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-primary/5 to-transparent p-4 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              Asisten Persiapan Mengajar (AI)
            </h4>
            <p className="text-xs text-muted-foreground">
              Pilih fokus bantuan, lalu kirim ke AI favorit Anda untuk panduan mengajar anak-anak.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px]"
        >
          Kolaborasi AI
        </Badge>
      </div>

      {/* Mode Selector Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Pilih Kebutuhan Anda:
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PROMPT_MODES.map((mode) => {
            const isSelected = mode.id === activeMode;
            let ModeIcon = Clock;
            if (mode.id === "games") ModeIcon = Gamepad2;
            if (mode.id === "analogy") ModeIcon = BookOpen;
            if (mode.id === "quiz") ModeIcon = HelpCircle;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2 text-left text-xs transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "border-border bg-background hover:bg-muted/70 text-foreground",
                )}
              >
                <ModeIcon className="size-3.5 shrink-0" />
                <span className="truncate">{mode.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground italic pt-0.5">
          👉 {activeModeMeta.description}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleChatGPT}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
        >
          <Bot className="size-3.5" />
          <span>Buka di ChatGPT</span>
          <ExternalLink className="size-3 opacity-70" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGemini}
          className="gap-1.5 text-xs border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
        >
          <Sparkles className="size-3.5" />
          <span>Buka di Gemini</span>
          <ExternalLink className="size-3 opacity-70" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="gap-1.5 text-xs hover:bg-muted text-foreground"
          title="Salin isi prompt ke clipboard"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-green-600" />
              <span className="text-green-600">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Salin Prompt</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-muted-foreground ml-auto gap-1"
        >
          <span>{showPreview ? "Sembunyikan Draf" : "Lihat Draf Prompt"}</span>
          {showPreview ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </Button>
      </div>

      {/* Accordion Preview of Generated Prompt */}
      {showPreview ? (
        <div className="relative rounded-md border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/50 mb-2">
            <span className="font-semibold text-[11px] text-muted-foreground">
              DRAF PROMPT OTOMATIS:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <Copy className="size-3" /> Salin Teks
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 leading-relaxed max-h-48 overflow-y-auto">
            {prompt}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

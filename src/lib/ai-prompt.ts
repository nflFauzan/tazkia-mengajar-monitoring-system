export type TeachingPromptMode =
  | "lesson-plan"
  | "games"
  | "analogy"
  | "quiz";

export interface MaterialPromptContext {
  curriculumName: string;
  periodName: string;
  title: string;
  meetingLabel?: string | null;
  objective?: string | null;
  description?: string | null;
  notes?: string | null;
}

export interface PromptModeOption {
  id: TeachingPromptMode;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
}

export const PROMPT_MODES: PromptModeOption[] = [
  {
    id: "lesson-plan",
    label: "Rencana Kelas (RPP 60 Menit)",
    shortLabel: "RPP 60 Menit",
    description: "Alokasi menit, pembuka ceria, penyampaian materi, game, dan penutup",
    iconName: "Clock",
  },
  {
    id: "games",
    label: "Ice Breaking & Games Seru",
    shortLabel: "Games & Ice Breaking",
    description: "Ide permainan interaktif yang relevan tanpa butuh alat rumit",
    iconName: "Gamepad2",
  },
  {
    id: "analogy",
    label: "Analogi & Dongeng Anak",
    shortLabel: "Analogi & Cerita",
    description: "Perumpamaan dunia nyata agar materi abstrak mudah dibayangkan murid",
    iconName: "BookOpen",
  },
  {
    id: "quiz",
    label: "Pertanyaan Pemantik & Kuis",
    shortLabel: "Kuis & Tanya Jawab",
    description: "Kuis interaktif santai untuk mengukur pemahaman tanpa rasa tegang",
    iconName: "HelpCircle",
  },
];

/**
 * Menghasilkan prompt pedagogis yang kaya konteks sesuai kurikulum Tazkia Mengajar.
 */
export function generateTeachingPrompt(
  material: MaterialPromptContext,
  mode: TeachingPromptMode = "lesson-plan",
): string {
  const meetingPrefix = material.meetingLabel ? `${material.meetingLabel}: ` : "";
  const fullTitle = `${meetingPrefix}${material.title}`;

  const details: string[] = [
    `Halo! Saya adalah relawan pengajar di Tazkia Mengajar. Saya sedang mempersiapkan materi pembelajaran untuk murid-murid dengan rincian kurikulum berikut:`,
    ``,
    `📚 INFORMASI MATERI KURIKULUM:`,
    `- Kurikulum: ${material.curriculumName}`,
    `- Tahap/Periode: ${material.periodName}`,
    `- Judul Pertemuan & Materi: ${fullTitle}`,
  ];

  if (material.objective?.trim()) {
    details.push(`- Capaian/Tujuan Pembelajaran: ${material.objective.trim()}`);
  }
  if (material.description?.trim()) {
    details.push(`- Ringkasan Materi: ${material.description.trim()}`);
  }
  if (material.notes?.trim()) {
    details.push(`- Catatan Khusus Pengajar: ${material.notes.trim()}`);
  }

  const baseHeader = details.join("\n");

  let modeSpecificRequest = "";

  switch (mode) {
    case "lesson-plan":
      modeSpecificRequest = `Tolong buatkan panduan Rencana Pelaksanaan Pembelajaran (RPP) praktis & seru berdurasi total 60 Menit yang cocok untuk pengajar relawan:
1. Pembuka & Ice Breaking (10 menit): Aktivitas awal yang ceria untuk menarik perhatian dan semangat murid.
2. Penyampaian Materi Inti (20 menit): Cara menjelaskan materi di atas secara bertahap dengan bahasa yang ramah anak, jelas, dan tidak kaku.
3. Aktivitas Praktek / Game Interaktif (20 menit): Latihan atau permainan kelompok untuk mempraktikkan pemahaman materi.
4. Penutup & Refleksi (10 menit): Cara mengecek pemahaman singkat, doa/apresiasi, dan kalimat penyemangat sebelum pulang.

Sertakan tips singkat bila ada anak yang pasif, pendiam, atau mudah bosan di kelas.`;
      break;

    case "games":
      modeSpecificRequest = `Tolong berikan 2 atau 3 ide Ice Breaking atau Games Edukatif yang terhubung langsung dengan materi ini:
- Aturan main sederhana dan mudah dipahami anak-anak dalam 1 menit.
- Tidak memerlukan alat atau bahan yang rumit (cukup gerakan tubuh, tepuk tangan, kertas, atau benda di sekitar).
- Membuat suasana kelas hidup dan pesan materi tetap tersampaikan dengan menyenangkan.
- Sertakan petunjuk singkat bagi pengajar untuk memandu permainannya.`;
      break;

    case "analogy":
      modeSpecificRequest = `Tolong bantu saya dengan Analogi atau Cerita Pendek yang pas untuk anak-anak:
- Buatkan 1-2 perumpamaan sehari-hari yang sangat akrab dengan dunia anak agar konsep materi ini mudah dicerna.
- Buatkan 1 cerita fabel atau dongeng singkat (2-3 paragraf) yang memiliki pesan moral sesuai dengan tujuan materi ini.
- Berikan contoh kalimat atau kata-kata pembuka yang bisa langsung diucapkan pengajar di kelas.`;
      break;

    case "quiz":
      modeSpecificRequest = `Tolong buatkan Kuis Santai dan Pertanyaan Pemantik untuk menguji pemahaman murid tanpa membuat mereka tegang:
- 3 Pertanyaan Pemantik di awal kelas: Memancing rasa penasaran murid sebelum materi dijelaskan.
- 5 Pertanyaan Kuis Menyenangkan di akhir kelas: Format seru (misal: tebak gerakan, tebak kata, atau pilihan benar/salah).
- Cara memberikan apresiasi hangat kepada murid yang berani mencoba menjawab (termasuk jika jawabannya belum tepat).`;
      break;
  }

  return `${baseHeader}

🎯 PERMINTAAN BANTUAN MENGAJAR:
${modeSpecificRequest}

Gunakan gaya bahasa yang suportif, ramah anak, santai, dan langsung dapat dipraktikkan oleh pengajar. Terima kasih!`;
}

/**
 * Menyalin teks ke clipboard dengan dukungan fallback untuk kompatibilitas lintas browser.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, attempting fallback:", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error("Fallback copy failed:", fallbackErr);
    return false;
  }
}

/**
 * Membuka ChatGPT dengan query prompt terisi secara otomatis.
 */
export function openInChatGPT(prompt: string): void {
  const encoded = encodeURIComponent(prompt);
  const targetUrl = `https://chatgpt.com/?q=${encoded}`;
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

/**
 * Membuka Google Gemini di tab baru.
 */
export function openInGemini(): void {
  window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
}

import { sanitizeIndonesianPhone } from "@/lib/whatsapp";

export interface FonnteSendResult {
  ok: boolean;
  isMock?: boolean;
  error?: string;
}

/**
 * Sends a WhatsApp message using Fonnte API Gateway.
 * If FONNTE_TOKEN is not configured in the environment, it safely falls back
 * to Dev Mock Mode by logging the message content to console.
 */
export async function sendWhatsAppMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<FonnteSendResult> {
  const cleanPhone = sanitizeIndonesianPhone(to);
  if (!cleanPhone) {
    return { ok: false, error: "Nomor WhatsApp tidak valid." };
  }

  const token = process.env.FONNTE_TOKEN;

  // Development / Test Fallback: when no token is present
  if (!token) {
    console.info(
      "\n==================== [FONNTE DEV MOCK] ====================\n" +
        `Target  : ${cleanPhone} (Original: ${to})\n` +
        `Message :\n${message}\n` +
        "===========================================================\n",
    );
    return { ok: true, isMock: true };
  }

  try {
    const formData = new FormData();
    formData.append("target", cleanPhone);
    formData.append("message", message);
    formData.append("countryCode", "62");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = (await response.json().catch(() => null)) as
      | { status?: boolean; reason?: string }
      | null;

    if (!response.ok || (data && data.status === false)) {
      const errorMsg = data?.reason || `HTTP ${response.status}`;
      console.error("[Fonnte] Error sending message:", errorMsg);
      return { ok: false, error: `Gagal mengirim WhatsApp: ${errorMsg}` };
    }

    return { ok: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Fonnte] Network or request error:", errorMsg);
    return { ok: false, error: "Gagal terhubung ke WhatsApp Gateway." };
  }
}

/**
 * WhatsApp helpers for formatting Indonesian phone numbers and generating
 * direct Click-to-Chat (wa.me) URLs for Tazkia Mengajar login credentials.
 */

/**
 * Cleans and sanitizes Indonesian phone numbers into international format (628...).
 * Examples:
 *   - "0812-3456-7890"  -> "6281234567890"
 *   - "+62 812 3456 789" -> "628123456789"
 *   - "81234567890"     -> "6281234567890"
 *   - "6281234567890"    -> "6281234567890"
 */
export function sanitizeIndonesianPhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  }
  if (digits.startsWith("8")) {
    return "62" + digits;
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  return digits;
}

/**
 * Builds a direct `https://wa.me/...` URL with prefilled text message.
 * If phone is empty or invalid, returns a generic wa.me link allowing the user
 * to select a contact in WhatsApp.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string {
  const cleanPhone = sanitizeIndonesianPhone(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Formats a friendly and professional WhatsApp notification message containing
 * the volunteer's initial login credentials.
 */
export function buildLoginCredentialsMessage({
  fullName,
  nickname,
  username,
  temporaryPassword,
  loginUrl,
}: {
  fullName: string;
  nickname?: string | null;
  username: string;
  temporaryPassword?: string;
  loginUrl?: string;
}): string {
  const name = nickname?.trim() || fullName.trim() || "Pengajar";
  const url =
    loginUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "https://tazkia-mengajar.vercel.app/login");

  let msg = `*Assalamu'alaikum Warahmatullahi Wabarakatuh Kak ${name}!*\n\n`;
  msg += `Alhamdulillah, akun relawan pengajar Kakak di *Tazkia Mengajar Monitoring System* telah berhasil diaktifkan.\n\n`;
  msg += `Berikut kredensial untuk masuk ke sistem:\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Link Login*      : ${url}\n`;
  msg += `*Username*        : ${username}\n`;
  if (temporaryPassword) {
    msg += `*Password Sem.*   : ${temporaryPassword}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*Catatan Penting & Petunjuk Masuk:*\n`;
  msg += `1. Buka link di atas, lalu masuk menggunakan username dan password sementara di atas.\n`;
  msg += `2. Saat pertama kali masuk, Anda akan diminta langsung membuat password baru pribadi.\n`;
  msg += `3. Di dalam sistem, Kakak dapat melakukan absensi kegiatan secara mandiri, melihat jadwal, dan membaca Panduan & SOP mengajar.\n\n`;
  msg += `Terima kasih banyak atas dedikasi dan semangat Kakak dalam membimbing adik-adik binaan. Semoga menjadi amal jariyah yang penuh berkah!\n\n`;
  msg += `_Salam hangat,_\n*Pengurus Tazkia Mengajar*`;

  return msg;
}

/**
 * Formats a message for when an admin resets a volunteer's password.
 */
export function buildPasswordResetMessage({
  fullName,
  nickname,
  username,
  temporaryPassword,
  loginUrl,
}: {
  fullName: string;
  nickname?: string | null;
  username: string;
  temporaryPassword: string;
  loginUrl?: string;
}): string {
  const name = nickname?.trim() || fullName.trim() || "Pengajar";
  const url =
    loginUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "https://tazkia-mengajar.vercel.app/login");

  let msg = `*Assalamu'alaikum Warahmatullahi Wabarakatuh Kak ${name}!*\n\n`;
  msg += `Password akun *Tazkia Mengajar Monitoring System* Kakak telah direset oleh Admin.\n\n`;
  msg += `Berikut kredensial baru untuk masuk:\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Link Login*      : ${url}\n`;
  msg += `*Username*        : ${username}\n`;
  msg += `*Password Baru*   : ${temporaryPassword}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*Catatan:*\n`;
  msg += `Silakan login menggunakan password baru di atas, lalu Anda akan diminta membuat password baru pilihan Anda sendiri.\n\n`;
  msg += `_Salam hangat,_\n*Pengurus Tazkia Mengajar*`;

  return msg;
}

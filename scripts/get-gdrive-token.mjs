import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("\n❌ Error: GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum ada di .env!");
    console.log("Silakan buat OAuth Client ID (Web Application) di Google Cloud Console:");
    console.log("1. Buka https://console.cloud.google.com/apis/credentials");
    console.log("2. Klik '+ CREATE CREDENTIALS' -> 'OAuth client ID'");
    console.log("3. Application type: 'Web application'");
    console.log(`4. Authorized redirect URIs: tambahkan '${REDIRECT_URI}'`);
    console.log("5. Masukkan Client ID & Client Secret ke file .env lalu jalankan script ini lagi.\n");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    REDIRECT_URI,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      const code = reqUrl.searchParams.get("code");

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Gagal: Kode otorisasi tidak ditemukan.</h1>");
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Google tidak mengembalikan refresh token.</h1><p>Coba cabut akses aplikasi di akun Google Anda lalu jalankan script ini lagi.</p>",
        );
        return;
      }

      // Append to .env
      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

      if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
        envContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN="${refreshToken}"`,
        );
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN="${refreshToken}"\n`;
      }

      fs.writeFileSync(envPath, envContent);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #16a34a;">✅ Berhasil Terhubung ke Google Drive!</h1>
          <p>Refresh token telah otomatis disimpan ke file <code>.env</code> Anda.</p>
          <p>Anda bisa menutup tab ini dan kembali ke terminal.</p>
        </div>
      `);

      console.log("\n🎉 SUKSES! GOOGLE_REFRESH_TOKEN berhasil disimpan ke .env!");
      console.log("Token:", refreshToken);
      console.log("\nSilakan restart `npm run dev` dan coba upload lagi!\n");

      server.close();
      process.exit(0);
    } catch (err) {
      console.error("\n❌ Error saat menukar token:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: " + err.message);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log("\n=== Otorisasi Akun Google Drive Pribadi ===");
    console.log("Buka URL berikut di browser Anda untuk mengizinkan akses:");
    console.log("\n👉 \x1b[36m" + authUrl + "\x1b[0m\n");
    console.log(`Menunggu otorisasi di ${REDIRECT_URI}...`);
  });
}

main().catch(console.error);

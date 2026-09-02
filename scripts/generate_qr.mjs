import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const folder = path.join(rootDir, 'qr code');
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, { recursive: true });
}

// Live Vercel Production URLs
const universalUrl = 'https://combined-app-eight.vercel.app/kpm';
const adminUrl = 'https://combined-app-eight.vercel.app/kpm';
const personelUrl = 'https://combined-app-eight.vercel.app/kpm/personel';

function downloadQR(dataUrl, filename) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(dataUrl)}`;
  const filePath = path.join(folder, filename);
  const file = fs.createWriteStream(filePath);

  https.get(qrApiUrl, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Saved: ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`Error downloading ${filename}:`, err.message);
  });
}

downloadQR(universalUrl, 'qr_kpm_universal.png');
downloadQR(adminUrl, 'qr_admin_kpm.png');
downloadQR(personelUrl, 'qr_personel_driver.png');

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>QR Code Akses Sistem KPM - Pintu Masuk Tunggal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafd;
      padding: 40px 20px;
      text-align: center;
      color: #202124;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 8px;
      color: #202124;
    }
    p.sub {
      color: #5f6368;
      margin-bottom: 36px;
      font-size: 14px;
    }
    .container {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
      max-width: 960px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15), 0 1px 2px 0 rgba(60, 64, 67, 0.3);
      width: 380px;
      box-sizing: border-box;
      border: 1px solid #e9eef6;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px 3px rgba(60, 64, 67, 0.15), 0 1px 3px 0 rgba(60, 64, 67, 0.3);
    }
    .card-universal::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5px;
      background: linear-gradient(90deg, #4285f4, #ea4335, #fbbc05, #34a853);
    }
    .card-sub::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: #1a73e8;
    }
    .card h2 {
      font-size: 19px;
      font-weight: 800;
      margin: 14px 0 6px;
      color: #202124;
    }
    .card p.desc {
      color: #5f6368;
      font-size: 13px;
      margin-bottom: 20px;
      line-height: 1.4;
    }
    .card img {
      width: 260px;
      height: 260px;
      border-radius: 16px;
      border: 1px solid #dadce0;
      padding: 8px;
      background: white;
    }
    .card .link-text {
      font-family: monospace;
      font-size: 12px;
      color: #1a73e8;
      background: #e8f0fe;
      padding: 9px 14px;
      border-radius: 9999px;
      margin-top: 18px;
      word-break: break-all;
      font-weight: 600;
    }
    .tag {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .tag-universal {
      background: #f1f3f4;
      color: #1a73e8;
      border: 1px solid #dadce0;
    }
    .tag-driver {
      background: #e6f4ea;
      color: #188038;
      border: 1px solid #ceead6;
    }
    .badges {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 14px;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .badge-admin { background: #e8f0fe; color: #1a73e8; }
    .badge-driver { background: #e6f4ea; color: #188038; }
    @media print {
      body { background: white; padding: 0; }
      .card { box-shadow: none; border: 2px solid #dadce0; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>QR Code Akses Sistem Line Feeding (KPM)</h1>
  <p class="sub">Pintu Masuk Terpadu — Cukup 1 Link / QR Code, Sistem Otomatis Mengarahkan Berdasarkan Akun</p>
  <div class="container">
    <div class="card card-universal">
      <span class="tag tag-universal">⚡ 1 LINK UNTUK SEMUA (UNIVERSAL)</span>
      <h2>Portal KPM Terpadu</h2>
      <p class="desc">Admin & Driver scan QR yang sama.<br>Setelah login, halaman langsung menyesuaikan otomatis.</p>
      <img src="qr_kpm_universal.png" alt="QR Universal">
      <div class="badges">
        <span class="badge badge-admin">✓ Login Admin</span>
        <span class="badge badge-driver">✓ Login Driver</span>
      </div>
      <div class="link-text">https://combined-app-eight.vercel.app/kpm</div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(folder, 'print_qr_codes.html'), htmlContent, 'utf-8');
console.log('Saved: print_qr_codes.html');

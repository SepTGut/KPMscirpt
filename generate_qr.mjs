import fs from 'fs';
import path from 'path';
import https from 'https';

const folder = path.join(process.cwd(), 'qr code');
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, { recursive: true });
}

const adminUrl = 'https://linefeedingd.netlify.app/kpm';
const personelUrl = 'https://linefeedingd.netlify.app/kpm/personel';

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

downloadQR(adminUrl, 'qr_admin_kpm.png');
downloadQR(personelUrl, 'qr_personel_driver.png');

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>QR Code Akses Sistem KPM</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; padding: 40px 20px; text-align: center; color: #1e293b; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #0f172a; }
    p.sub { color: #64748b; margin-bottom: 40px; font-size: 15px; }
    .container { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; max-width: 900px; margin: 0 auto; }
    .card { background: white; border-radius: 20px; padding: 32px 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); width: 340px; box-sizing: border-box; border: 1px solid #e2e8f0; }
    .card h2 { font-size: 20px; margin: 12px 0 6px; }
    .card p.desc { color: #64748b; font-size: 13px; margin-bottom: 20px; }
    .card img { width: 260px; height: 260px; border-radius: 12px; border: 1px solid #cbd5e1; padding: 8px; background: white; }
    .card .link-text { font-family: monospace; font-size: 12px; color: #2563eb; background: #eff6ff; padding: 8px 12px; border-radius: 8px; margin-top: 16px; word-break: break-all; }
    .tag { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-weight: 700; font-size: 11px; letter-spacing: 0.05em; }
    .tag-admin { background: #dbeafe; color: #1e40af; }
    .tag-driver { background: #dcfce7; color: #166534; }
    @media print {
      body { background: white; padding: 0; }
      .card { box-shadow: none; border: 2px solid #cbd5e1; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>QR Code Akses Sistem Line Feeding (KPM)</h1>
  <p class="sub">Scan menggunakan kamera HP untuk langsung membuka halaman sistem</p>
  <div class="container">
    <div class="card">
      <span class="tag tag-admin">PORTAL ADMIN</span>
      <h2>Admin Dashboard</h2>
      <p class="desc">Buat KPM baru & monitoring live</p>
      <img src="qr_admin_kpm.png" alt="QR Admin">
      <div class="link-text">https://linefeedingd.netlify.app/kpm</div>
    </div>
    <div class="card">
      <span class="tag tag-driver">PORTAL PERSONEL / DRIVER</span>
      <h2>Update Status & Foto</h2>
      <p class="desc">Ambil foto bukti & update perjalanan</p>
      <img src="qr_personel_driver.png" alt="QR Personel">
      <div class="link-text">https://linefeedingd.netlify.app/kpm/personel</div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(folder, 'print_qr_codes.html'), htmlContent, 'utf-8');
console.log('Saved: print_qr_codes.html');

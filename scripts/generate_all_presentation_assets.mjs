import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const baseOutDir = path.join(rootDir, 'presentation-assets');
const dirs = {
  desktop: path.join(baseOutDir, 'ui-desktop'),
  mobile: path.join(baseOutDir, 'ui-mobile'),
  print: path.join(baseOutDir, 'physical-print'),
  diagrams: path.join(baseOutDir, 'diagrams'),
  metrics: path.join(baseOutDir, 'data-metrics'),
};

for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Output directories initialized.');

// Read local QR codes as Base64 for instant, offline, rock-solid rendering
const localQrFolder = path.join(rootDir, 'assets', 'qr-codes');
const qrUniversalB64 = fs.existsSync(path.join(localQrFolder, 'qr_kpm_universal.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(localQrFolder, 'qr_kpm_universal.png')).toString('base64')}`
  : '';
const qrDriverB64 = fs.existsSync(path.join(localQrFolder, 'qr_personel_driver.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(localQrFolder, 'qr_personel_driver.png')).toString('base64')}`
  : '';
const qrAdminB64 = fs.existsSync(path.join(localQrFolder, 'qr_admin_kpm.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(localQrFolder, 'qr_admin_kpm.png')).toString('base64')}`
  : '';

// ─── 1. Write data-metrics/pitch_summary.json ─────────────────────────
const summaryData = {
  systemName: "KPM Line Feeding Tracking System",
  version: "1.0.0-p (Production Release 2026)",
  fiveStepWorkflow: [
    {
      step: 1,
      name: "Admin Creates the KPM & Prints Document",
      role: "Admin / Gudang (Warehouse Staff)",
      actions: "Input rute muatan, PIC, material items, generate KPM & cetak lembar fisik Triple QR",
      assets: [
        "ui-desktop/02_admin_monitoring_board.png",
        "physical-print/kpm_triple_qr_sheet.png"
      ]
    },
    {
      step: 2,
      name: "Driver Logs In & Prepares Cargo",
      role: "Truck Driver (Supir Armada)",
      actions: "Scan QR ID badge, pilih batch muatan 1 truk di ponsel, foto bak truk & minta izin Gate Out",
      assets: [
        "physical-print/driver_qr_card.png",
        "ui-mobile/01_driver_tasks.png"
      ]
    },
    {
      step: 3,
      name: "Gate Checker Authorizes Exit (Gate Out)",
      role: "Security Guard / Gate Checker (Pos Gerbang)",
      actions: "Scan QR 2 (Tengah), cek fisik muatan vs foto supir, 1-klik izin seluruh batch (<30 detik)",
      assets: [
        "ui-desktop/03_checker_gate_out.png"
      ]
    },
    {
      step: 4,
      name: "On the Road & Live Fleet Radar",
      role: "Driver & Logistics Dispatcher",
      actions: "1-Klik navigasi Google Maps, background streaming GPS tiap 10s, radar satelit kantor real-time",
      assets: [
        "ui-mobile/02_driver_navigation.png",
        "ui-desktop/01_fleet_radar.png"
      ]
    },
    {
      step: 5,
      name: "Arrival & Frictionless Recipient Handover",
      role: "Workshop Recipient (Penerima Bengkel Tujuan)",
      actions: "Scan QR 3 tanpa login/app, pilih nama, foto bukti bongkar material, 1-klik konfirmasi selesai",
      assets: [
        "ui-mobile/03_recipient_confirm.png",
        "diagrams/5_step_process_flow.png"
      ]
    }
  ]
};

fs.writeFileSync(
  path.join(dirs.metrics, 'pitch_summary.json'),
  JSON.stringify(summaryData, null, 2),
  'utf8'
);
console.log('Saved: data-metrics/pitch_summary.json');

// Helper to render Mermaid diagram
async function renderDiagram(browser, mermaidCode, title, subtitle, outPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #090D16;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .title {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
          text-align: center;
        }
        .subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 25px;
          font-weight: 600;
          text-align: center;
        }
        #diagram-card {
          background: #0f172a;
          padding: 36px 44px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.7);
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
      <div id="diagram-card">
        <div id="mermaid-target"></div>
      </div>
      <script>
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#0f172a',
            primaryColor: '#1e3a8a',
            primaryBorderColor: '#3b82f6',
            primaryTextColor: '#ffffff',
            lineColor: '#60a5fa',
            secondaryColor: '#064e3b',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '13px'
          }
        });
        const code = ${JSON.stringify(mermaidCode)};
        mermaid.render('diagramSvg', code).then(({ svg }) => {
          document.getElementById('mermaid-target').innerHTML = svg;
        }).catch(err => {
          console.error(err);
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#mermaid-target svg', { timeout: 15000 });
  const card = await page.$('#diagram-card');
  await card.screenshot({ path: outPath, omitBackground: false });
  await page.close();
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  console.log('Headless Chrome initialized.');

  try {
    // ══════════════════════════════════════════════════════════════════
    // PART 1: DIAGRAMS
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- 1. Rendering Diagrams ---');

    const archMermaid = `flowchart TD
    subgraph Clients["📱 Antarmuka Klien"]
        DriverApp["📱 Driver Mobile App<br/>(Capacitor 7 + Vue 3)"]
        WebPortal["💻 Web Portal Admin & Ekspedisi<br/>(Vue 3 + Leaflet Radar)"]
    end

    subgraph Streaming["⚡ Real-time Fleet Layer"]
        Firebase["🔥 Firebase RTDB<br/>/active_tracking/{kpmId}"]
    end

    subgraph Backend["⚙️ Cloud State Machine & API"]
        VercelProxy["▲ Vercel Edge Serverless Proxy<br/>/api"]
        DockerProxy["🐳 Standalone Docker Server<br/>server.mjs (Port 3000)"]
        GAS["🛡️ Google Apps Script Modular<br/>(gas/*.gs REST Controller)"]
    end

    subgraph StorageLayer["💾 Persistence Layer"]
        Sheets["📊 Google Sheets<br/>- KPM Monitor 2026 (Col A-Z)<br/>- T.Log (Cold Retention Archive)<br/>- Users (RBAC)"]
        Drive["📁 Google Drive<br/>Folder Foto Bukti Muat & Tiba"]
    end

    DriverApp -->|"Streaming GPS (10s)"| Firebase
    DriverApp -->|"Direct POST Status & Foto"| GAS
    WebPortal -->|"Polling Radar Visual (3s)"| Firebase
    WebPortal -->|"API Requests"| VercelProxy
    WebPortal -->|"Local API Requests"| DockerProxy
    VercelProxy -->|"Secure HTTPS Forward"| GAS
    DockerProxy -->|"Secure HTTPS Forward"| GAS
    GAS -->|"Batch Data Sync"| Sheets
    GAS -->|"Photo Upload Stream"| Drive`;

    await renderDiagram(
      browser,
      archMermaid,
      "Arsitektur Sistem Terintegrasi KPM Line Feeding",
      "Multi-Tier Cloud Architecture • Zero Server License Cost Stack",
      path.join(dirs.diagrams, 'system_architecture.png')
    );
    console.log('✓ Rendered: diagrams/system_architecture.png');

    const flowMermaid = `flowchart TD
    classDef s1 fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef s2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff;
    classDef s3 fill:#854d0e,stroke:#f59e0b,stroke-width:2px,color:#ffffff;
    classDef s4 fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#ffffff;
    classDef s5 fill:#047857,stroke:#34d399,stroke-width:2px,color:#ffffff;

    Step1["📋 <b>1. Admin / Gudang: Terbitkan KPM & Cetak</b><br/>Input rute, PIC & material ➔ Simpan KPM ➔ Cetak Lembar A4 Triple QR"]:::s1
    Step2["🚚 <b>2. Driver: Login QR ID Pass & Siapkan Muatan</b><br/>Pilih batch 1 truk di ponsel, ambil foto bak truk ➔ Klik 'Minta Izin Gate Out'"]:::s2
    Step3["🛡️ <b>3. Pos Gerbang: 1-Klik Otorisasi Keluar</b><br/>Petugas scan QR 2 (Tengah), cek fisik barang vs foto ➔ Klik '✓ Izinkan Seluruh Batch' (<30s)"]:::s3
    Step4["🗺️ <b>4. Di Jalan: Navigasi Google Maps & GPS Radar</b><br/>1-Klik Google Maps arah tujuan, ponsel streaming GPS tiap 10s, kantor pantau radar live"]:::s4
    Step5["✍️ <b>5. Bengkel Tujuan: Serah Terima Tanpa Login</b><br/>Penerima scan QR 3 di lembar/HP, pilih nama, foto barang bongkar ➔ Status TIBA tuntas"]:::s5

    Step1 --> Step2 --> Step3 --> Step4 --> Step5`;

    await renderDiagram(
      browser,
      flowMermaid,
      "Alur Operasional 5-Langkah KPM Line Feeding (Satu Alur Pasti)",
      "Gudang ➔ Driver ➔ Checker Gerbang ➔ Perjalanan GPS ➔ Penerima Workshop",
      path.join(dirs.diagrams, '5_step_process_flow.png')
    );
    console.log('✓ Rendered: diagrams/5_step_process_flow.png');

    // ══════════════════════════════════════════════════════════════════
    // PART 2: PHYSICAL PRINT ASSETS
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Rendering Physical Print Assets ---');

    // 1. kpm_triple_qr_sheet.png
    const printPage = await browser.newPage();
    await printPage.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    const tripleQrHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Surat Penugasan KPM Line Feeding (Triple QR)</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #f1f5f9;
            padding: 30px;
            display: flex;
            justify-content: center;
          }
          .sheet {
            width: 960px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 15px 35px -5px rgba(0,0,0,0.1);
            padding: 40px 48px;
            border: 2px solid #cbd5e1;
          }
          .header-banner {
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-title {
            font-size: 22px;
            font-weight: 900;
            color: #1e3a8a;
            letter-spacing: -0.02em;
          }
          .company-sub {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 2px;
          }
          .doc-badge {
            background: #e0f2fe;
            border: 1.5px solid #0284c7;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 800;
            color: #0369a1;
            font-family: 'JetBrains Mono', monospace;
          }
          .kpm-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin: 20px 0;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .meta-item .lbl {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .meta-item .val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
          }
          .sec-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #334155;
            margin: 18px 0 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 800;
            text-align: left;
            padding: 9px 12px;
            border-bottom: 2px solid #cbd5e1;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            padding: 9px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
            font-weight: 600;
          }
          .triple-qr-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin-top: 16px;
          }
          .qr-box {
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 18px 14px;
            text-align: center;
          }
          .qr-box.qr-1 { border-top: 5px solid #2563eb; }
          .qr-box.qr-2 { border-top: 5px solid #d97706; }
          .qr-box.qr-3 { border-top: 5px solid #059669; }
          .qr-tag {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 10px;
            border-radius: 9999px;
            display: inline-block;
            margin-bottom: 10px;
          }
          .tag-1 { background: #dbeafe; color: #1d4ed8; }
          .tag-2 { background: #fef3c7; color: #b45309; }
          .tag-3 { background: #d1fae5; color: #047857; }
          .qr-role {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 3px;
          }
          .qr-desc {
            font-size: 10.5px;
            color: #64748b;
            margin-bottom: 12px;
            line-height: 1.35;
          }
          .qr-img {
            width: 155px;
            height: 155px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 6px;
            background: #ffffff;
            margin: 0 auto 8px;
            display: block;
          }
          .qr-footer-note {
            font-size: 10px;
            font-family: 'JetBrains Mono', monospace;
            color: #64748b;
          }
          .sign-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
            text-align: center;
          }
          .sign-col .role {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .sign-col .box {
            height: 50px;
            margin: 8px 0;
            border-bottom: 1px solid #94a3b8;
          }
          .sign-col .name {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="sheet" id="kpm-print-sheet">
          <div class="header-banner">
            <div>
              <div class="company-title">PT REKAINDO GLOBAL JASA</div>
              <div class="company-sub">SISTEM KARTU PENUGASAN MATERIAL (KPM) LINE FEEDING</div>
            </div>
            <div class="doc-badge">KPM: 001/PPO/LF/IX/2026</div>
          </div>

          <div class="kpm-meta-grid">
            <div class="meta-item">
              <div class="lbl">Proyek Manufaktur</div>
              <div class="val">Struktur Line A</div>
            </div>
            <div class="meta-item">
              <div class="lbl">Rute Pengiriman</div>
              <div class="val">Candi Sewu ➔ Tiron</div>
            </div>
            <div class="meta-item">
              <div class="lbl">PIC Gudang Asal</div>
              <div class="val">Budi Santoso</div>
            </div>
            <div class="meta-item">
              <div class="lbl">Driver & Plat Armada</div>
              <div class="val">Pak Budi (TRK-01 • AE 8241 UZ)</div>
            </div>
          </div>

          <div class="sec-title">📦 Daftar Material Yang Diangkut</div>
          <table>
            <thead>
              <tr>
                <th style="width: 45px;">No</th>
                <th>Deskripsi Komponen / Material</th>
                <th style="width: 140px;">Jumlah</th>
                <th style="width: 120px;">Satuan (UoM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Baut Hexagonal M12x50 Grade 8.8 High Tensile</td>
                <td><b>250</b></td>
                <td>PCS</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Plat Baja Karbon 4mm x 1200mm Fabrikasi</td>
                <td><b>15</b></td>
                <td>LEMBAR</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Bracket Penyangga Utama WF-200 Sub-Assembly</td>
                <td><b>40</b></td>
                <td>UNIT</td>
              </tr>
            </tbody>
          </table>

          <div class="sec-title">🔲 Lembar Otorisasi Triple QR Code (Scan Tanpa Ketik)</div>
          <div class="triple-qr-grid">
            <div class="qr-box qr-1">
              <span class="qr-tag tag-1">QR 1 • TRACKING PUBLIK</span>
              <div class="qr-role">Monitoring Status</div>
              <div class="qr-desc">Scan untuk cek posisi GPS & status perjalanan terbuka.</div>
              <img class="qr-img" src="${qrUniversalB64}" alt="QR 1">
              <div class="qr-footer-note">lnfd.vercel.app/monitor</div>
            </div>

            <div class="qr-box qr-2">
              <span class="qr-tag tag-2">QR 2 • POS GERBANG</span>
              <div class="qr-role">Checker Gate Out</div>
              <div class="qr-desc">Scan oleh petugas gerbang untuk verifikasi muatan & izin jalan.</div>
              <img class="qr-img" src="${qrAdminB64}" alt="QR 2">
              <div class="qr-footer-note">lnfd.vercel.app/checker</div>
            </div>

            <div class="qr-box qr-3">
              <span class="qr-tag tag-3">QR 3 • SERAH TERIMA</span>
              <div class="qr-role">Penerima Workshop</div>
              <div class="qr-desc">Scan oleh workshop tujuan untuk tanda tangan & upload foto.</div>
              <img class="qr-img" src="${qrDriverB64}" alt="QR 3">
              <div class="qr-footer-note">lnfd.vercel.app/confirm</div>
            </div>
          </div>

          <div class="sign-grid">
            <div class="sign-col">
              <div class="role">Diserahkan Oleh (Gudang Asal)</div>
              <div class="box"></div>
              <div class="name">Budi Santoso (Admin Gudang)</div>
            </div>
            <div class="sign-col">
              <div class="role">Diperiksa Oleh (Pos Gerbang)</div>
              <div class="box"></div>
              <div class="name">Petugas Checker Gerbang</div>
            </div>
            <div class="sign-col">
              <div class="role">Diterima Oleh (Workshop Tujuan)</div>
              <div class="box"></div>
              <div class="name">AANG / Tim Workshop Tiron</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await printPage.setContent(tripleQrHtml, { waitUntil: 'domcontentloaded' });
    const sheetEl = await printPage.$('#kpm-print-sheet');
    await sheetEl.screenshot({ path: path.join(dirs.print, 'kpm_triple_qr_sheet.png') });
    console.log('✓ Rendered: physical-print/kpm_triple_qr_sheet.png');

    // 2. driver_qr_card.png
    const driverCardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: transparent;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 30px;
          }
          .card-badge {
            width: 420px;
            background: linear-gradient(145deg, #1e293b, #0f172a);
            border-radius: 26px;
            padding: 30px 28px;
            color: white;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.12);
            position: relative;
            overflow: hidden;
          }
          .card-badge::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 6px;
            background: linear-gradient(90deg, #3b82f6, #10b981, #f59e0b);
          }
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .title-area h2 {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -0.01em;
          }
          .title-area p {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
          }
          .chip-tier {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.4);
            color: #34d399;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 9999px;
            font-family: 'JetBrains Mono', monospace;
          }
          .driver-profile {
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(255, 255, 255, 0.05);
            padding: 14px 16px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            margin-bottom: 20px;
          }
          .avatar {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            border: 2px solid rgba(255, 255, 255, 0.2);
          }
          .d-name {
            font-size: 15px;
            font-weight: 800;
          }
          .d-fleet {
            font-size: 11.5px;
            color: #cbd5e1;
            margin-top: 2px;
            font-family: 'JetBrains Mono', monospace;
          }
          .qr-box {
            background: white;
            border-radius: 18px;
            padding: 16px;
            text-align: center;
            margin-bottom: 16px;
          }
          .qr-box img {
            width: 190px;
            height: 190px;
            display: block;
            margin: 0 auto;
          }
          .card-footer {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card-badge" id="driver-card">
          <div class="card-header">
            <div class="title-area">
              <h2>DRIVER ID & PASS CARD</h2>
              <p>KPM LINE FEEDING SYSTEM</p>
            </div>
            <div class="chip-tier">ARMADA TRUK</div>
          </div>
          <div class="driver-profile">
            <div class="avatar">🚚</div>
            <div>
              <div class="d-name">PAK BUDI SANTOSO</div>
              <div class="d-fleet">ID: DRV-014 • PLAT: AE 8241 UZ</div>
            </div>
          </div>
          <div class="qr-box">
            <img src="${qrDriverB64}" alt="QR Driver">
          </div>
          <div class="card-footer">
            Scan untuk Akses Otomatis Portal Driver KPM (Tanpa Password)
          </div>
        </div>
      </body>
      </html>
    `;

    await printPage.setContent(driverCardHtml, { waitUntil: 'domcontentloaded' });
    const cardEl = await printPage.$('#driver-card');
    await cardEl.screenshot({ path: path.join(dirs.print, 'driver_qr_card.png'), omitBackground: true });
    console.log('✓ Rendered: physical-print/driver_qr_card.png');
    await printPage.close();

    // ══════════════════════════════════════════════════════════════════
    // PART 3: CLEAN DESKTOP UI (1920x1080)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- 3. Rendering Clean Desktop UI Screenshots (1920x1080) ---');

    // 1. ui-desktop/02_admin_monitoring_board.png: Populated Board & Create Form
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    const adminHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0B0F19; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-[#080C15] border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0">
          <div class="space-y-6">
            <div class="flex items-center gap-3 px-2">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/30">
                LF
              </div>
              <div>
                <div class="font-black text-sm tracking-tight text-white">KPM Line Feeding</div>
                <div class="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> PROD v1.0
                </div>
              </div>
            </div>

            <!-- User Info -->
            <div class="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
              <div class="flex items-center gap-2 text-slate-300 font-bold">
                <span>👑 Super Admin ST</span>
              </div>
              <div class="text-[10px] text-amber-400 font-mono mt-0.5">ROLE: SUPER ADMIN &bull; PPIC</div>
            </div>

            <!-- Nav Links -->
            <nav class="space-y-1 text-xs font-semibold">
              <div class="text-[10px] uppercase tracking-wider text-slate-500 px-3 py-1 font-bold">Operasional KPM</div>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>➕ Buat KPM Baru</span>
              </a>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30">
                <span>📋 Monitoring KPM</span>
              </a>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>🗺️ Live Radar Armada</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400 ml-auto"></span>
              </a>

              <div class="text-[10px] uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1 font-bold">Pos Lapangan</div>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>🛡️ Pos Checker (Gate Out)</span>
              </a>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>✍️ Tanda Terima (Workshop)</span>
              </a>
            </nav>
          </div>

          <div class="text-[10px] text-slate-500 text-center font-mono">
            PT Rekaindo Global Jasa &bull; 2026
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col overflow-y-auto bg-[#090D16]">
          <!-- Topbar -->
          <header class="h-14 border-b border-slate-800/80 px-8 flex items-center justify-between bg-[#080C15]/80 backdrop-blur-md shrink-0">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span class="font-mono text-slate-500">WORKSPACE</span>
              <span>/</span>
              <span class="font-bold text-white">Admin Hub</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">PROD</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span>🔍 Cari KPM, Proyek, Plat...</span>
                <span class="text-[10px] font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">Ctrl K</span>
              </div>
              <button class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5">
                <span>🖨️ Cetak Triple QR</span>
              </button>
            </div>
          </header>

          <!-- Body -->
          <div class="p-8 space-y-6 max-w-7xl w-full mx-auto">
            <!-- 4 Live KPI Stat Cards -->
            <div class="grid grid-cols-4 gap-4">
              <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 border-l-4 border-l-blue-500">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total KPM Aktif</div>
                <div class="text-3xl font-black text-white mono mt-1">4</div>
                <div class="text-[11px] text-slate-400 mt-1">Dalam siklus rantai operasional</div>
              </div>

              <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 border-l-4 border-l-amber-500">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Dalam Perjalanan</div>
                <div class="text-3xl font-black text-amber-400 mono mt-1">2</div>
                <div class="text-[11px] text-slate-400 mt-1">Armada aktif di rute GPS</div>
              </div>

              <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 border-l-4 border-l-teal-500">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Menunggu Gerbang</div>
                <div class="text-3xl font-black text-teal-400 mono mt-1">1</div>
                <div class="text-[11px] text-slate-400 mt-1">Staged / Siap otorisasi Checker</div>
              </div>

              <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 border-l-4 border-l-emerald-500">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiba & Selesai</div>
                <div class="text-3xl font-black text-emerald-400 mono mt-1">1</div>
                <div class="text-[11px] text-slate-400 mt-1">Serah terima material tuntas</div>
              </div>
            </div>

            <!-- Inlaid Step 1 Creation Panel Preview -->
            <div class="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/80 border border-blue-800/50 flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-blue-600 text-white">LANGKAH 1</span>
                  <h3 class="text-base font-bold text-white">Form Penerbitan KPM & Lembar Triple QR Fisik</h3>
                </div>
                <p class="text-xs text-slate-300">
                  Rute: <b>Candi Sewu ➔ Tiron</b> &bull; Driver: <b>Pak Budi (TRK-01 • AE 8241 UZ)</b> &bull; Muatan: <b>Baut M12, Plat Baja, Bracket WF-200</b>
                </p>
              </div>
              <div class="flex items-center gap-3">
                <button class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition">
                  📄 Buka Form KPM
                </button>
                <button class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5">
                  <span>✓ Simpan & Terbitkan KPM</span>
                </button>
              </div>
            </div>

            <!-- Real Populated Monitoring Table -->
            <div class="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-white">Daftar Antrean Surat Penugasan KPM</span>
                  <span class="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">4 Dokumen</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold">Semua (4)</span>
                  <span class="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">Baru Dibuat (1)</span>
                  <span class="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">Jalan (2)</span>
                  <span class="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">Tiba (1)</span>
                </div>
              </div>

              <table class="w-full text-left text-xs">
                <thead class="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-6">Nomor KPM</th>
                    <th class="py-3 px-6">Proyek & Material</th>
                    <th class="py-3 px-6">Rute Workshop</th>
                    <th class="py-3 px-6">Driver & Armada</th>
                    <th class="py-3 px-6">Status Operasional</th>
                    <th class="py-3 px-6 text-right">Aksi Dokumen</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                  <!-- Row 1 -->
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-4 px-6 font-mono font-bold text-blue-400">001/PPO/LF/IX/2026</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Komponen Struktur Line A</div>
                      <div class="text-[11px] text-slate-400">250 Baut M12, 15 Plat Baja, 40 Bracket WF</div>
                    </td>
                    <td class="py-4 px-6 font-semibold">Candi Sewu ➔ Tiron</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Pak Budi Santoso</div>
                      <div class="text-[11px] font-mono text-slate-400">TRK-01 • AE 8241 UZ</div>
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-amber-950/90 text-amber-400 border border-amber-800/80 flex items-center gap-1.5 w-max">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        JALAN (35 menit)
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <span class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold border border-slate-700 cursor-pointer">
                        🖨️ Cetak QR
                      </span>
                    </td>
                  </tr>

                  <!-- Row 2 -->
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-4 px-6 font-mono font-bold text-teal-400">004/PPO/LF/IX/2026</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Kabel Tray & Elektrikal Line B</div>
                      <div class="text-[11px] text-slate-400">30 Cable Ladder, 60 Joint Plate</div>
                    </td>
                    <td class="py-4 px-6 font-semibold">Candi Sewu ➔ Tiron</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Pak Budi Santoso</div>
                      <div class="text-[11px] font-mono text-slate-400">TRK-01 • AE 8241 UZ</div>
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-teal-950/90 text-teal-400 border border-teal-800/80 flex items-center gap-1.5 w-max">
                        <span class="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                        STAGED (Siap Gate Out)
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <span class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold border border-slate-700 cursor-pointer">
                        🖨️ Cetak QR
                      </span>
                    </td>
                  </tr>

                  <!-- Row 3 -->
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-4 px-6 font-mono font-bold text-slate-300">002/PPO/LF/IX/2026</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Material Finishing Cat Line C</div>
                      <div class="text-[11px] text-slate-400">20 Pail Epoxy Gray, 10 Can Thinner</div>
                    </td>
                    <td class="py-4 px-6 font-semibold">Sukosari ➔ Remul</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Pak Joko Widodo</div>
                      <div class="text-[11px] font-mono text-slate-400">TRK-03 • AE 9180 UZ</div>
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-blue-950/90 text-blue-400 border border-blue-800/80 flex items-center gap-1.5 w-max">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        BARU DIBUAT
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <span class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold border border-slate-700 cursor-pointer">
                        🖨️ Cetak QR
                      </span>
                    </td>
                  </tr>

                  <!-- Row 4 -->
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-4 px-6 font-mono font-bold text-emerald-400">003/PPO/LF/IX/2026</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Sparepart Maintenance Mesin Bubut</div>
                      <div class="text-[11px] text-slate-400">12 Bearing SKF, 8 V-Belt Mitsuboshi</div>
                    </td>
                    <td class="py-4 px-6 font-semibold">Tiron ➔ Sukosari</td>
                    <td class="py-4 px-6">
                      <div class="font-bold text-white">Pak Eko Prasetyo</div>
                      <div class="text-[11px] font-mono text-slate-400">TRK-02 • AE 7451 UZ</div>
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5 w-max">
                        ✓ TIBA (Selesai • 1j 12m)
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <span class="px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-800 cursor-pointer">
                        Lihat BAP ✓
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </body>
      </html>
    `;

    await adminPage.setContent(adminHtml, { waitUntil: 'domcontentloaded' });
    await adminPage.screenshot({ path: path.join(dirs.desktop, '02_admin_monitoring_board.png') });
    console.log('✓ Rendered: ui-desktop/02_admin_monitoring_board.png');
    await adminPage.close();

    // 2. ui-desktop/03_checker_gate_out.png: Gate Checker Inspection Screen
    const checkerPage = await browser.newPage();
    await checkerPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    const checkerHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #070B14; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex items-center justify-center p-8 bg-deck">
        <div class="max-w-5xl w-full bg-[#0F172A] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
          <!-- Modal Header -->
          <div class="px-8 py-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
                🛡️
              </div>
              <div>
                <h2 class="text-lg font-black text-white">Verifikasi Otorisasi Pos Gerbang Asal (Gate Out)</h2>
                <p class="text-xs text-slate-400">Pemeriksaan fisik muatan truk sebelum armada meninggalkan gerbang pabrik</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                SCAN QR 2 TERVERIFIKASI
              </span>
            </div>
          </div>

          <!-- Body: Split Cargo Photo & Batch Checklist -->
          <div class="p-8 grid grid-cols-12 gap-8">
            <!-- Left: Driver Cargo Photo Upload -->
            <div class="col-span-5 space-y-3">
              <div class="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                📷 Foto Fisik Bak Truk (Diunggah Driver)
              </div>
              <div class="rounded-2xl overflow-hidden border border-slate-700 relative bg-slate-950 shadow-inner group">
                <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80" alt="Muatan Bak Truk" class="w-full h-64 object-cover">
                <div class="absolute bottom-2 inset-x-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 border border-slate-800 flex justify-between">
                  <span>Waktu Unggah: 08:28 WIB</span>
                  <span class="text-emerald-400 font-bold">Tersegel ✓</span>
                </div>
              </div>
              <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div><b>Driver:</b> Pak Budi Santoso (DRV-014)</div>
                <div><b>Armada:</b> Truk Bak Mitsubishi Colt Diesel (<b>AE 8241 UZ</b>)</div>
                <div><b>Tujuan:</b> Workshop Tiron (Rute Langsung)</div>
              </div>
            </div>

            <!-- Right: Manifest Checklist for 1-Click Batch -->
            <div class="col-span-7 space-y-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    📦 Daftar KPM Dalam Truk Ini (Batch 1 Truk)
                  </div>
                  <span class="text-xs font-mono text-emerald-400 font-bold">2 Dokumen KPM</span>
                </div>

                <!-- Items Container -->
                <div class="space-y-2.5">
                  <!-- KPM 1 -->
                  <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="font-mono font-bold text-xs text-blue-400">001/PPO/LF/IX/2026</span>
                      <span class="text-[10.5px] font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">Komponen Struktur</span>
                    </div>
                    <div class="text-xs font-semibold text-white">Baut Hexagonal M12 (250 pcs), Plat Baja 4mm (15 lbr), Bracket WF (40 unit)</div>
                    <div class="text-[11px] text-emerald-400 font-mono">✓ Cocok dengan pemeriksaan fisik</div>
                  </div>

                  <!-- KPM 2 -->
                  <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="font-mono font-bold text-xs text-teal-400">004/PPO/LF/IX/2026</span>
                      <span class="text-[10.5px] font-mono bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800">Elektrikal Line B</span>
                    </div>
                    <div class="text-xs font-semibold text-white">Cable Ladder Galvanized W300 (30 btg), Joint Plate Type A (60 set)</div>
                    <div class="text-[11px] text-emerald-400 font-mono">✓ Cocok dengan pemeriksaan fisik</div>
                  </div>
                </div>

                <!-- Catatan Petugas -->
                <div class="mt-3">
                  <label class="block text-[11px] font-mono text-slate-400 mb-1">Catatan Pemeriksaan Pos Gerbang (Opsional):</label>
                  <input type="text" value="Muatan lengkap, segel terpasang rapi, driver membawa lembar A4 Triple QR." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none">
                </div>
              </div>

              <!-- Action Clearance Buttons -->
              <div class="pt-2 flex items-center gap-3">
                <button class="px-4 py-3 rounded-2xl bg-red-950/60 hover:bg-red-900/60 text-red-400 text-xs font-bold border border-red-800/80 transition">
                  ✕ Tolak Keberangkatan
                </button>
                <button class="flex-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2">
                  <span>✓ Izinkan Seluruh Batch (2 KPM Sekaligus) - Gate Out</span>
                  <span class="px-2 py-0.5 rounded-md bg-emerald-700 text-[11px] font-mono">&lt; 30 Detik</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await checkerPage.setContent(checkerHtml, { waitUntil: 'domcontentloaded' });
    await checkerPage.screenshot({ path: path.join(dirs.desktop, '03_checker_gate_out.png') });
    console.log('✓ Rendered: ui-desktop/03_checker_gate_out.png');
    await checkerPage.close();

    // 3. ui-desktop/01_fleet_radar.png: Dark Radar Map with Moving Truck & Polyline
    const radarPage = await browser.newPage();
    await radarPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    const radarHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #070B14; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-[#080C15] border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0">
          <div class="space-y-6">
            <div class="flex items-center gap-3 px-2">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/30">
                LF
              </div>
              <div>
                <div class="font-black text-sm tracking-tight text-white">KPM Line Feeding</div>
                <div class="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> PROD v1.0
                </div>
              </div>
            </div>

            <nav class="space-y-1 text-xs font-semibold">
              <div class="text-[10px] uppercase tracking-wider text-slate-500 px-3 py-1 font-bold">Pengawasan Lapangan</div>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>📋 Monitoring KPM</span>
              </a>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30">
                <span>🗺️ Live Radar Armada</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400 ml-auto animate-pulse"></span>
              </a>
              <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
                <span>🛡️ Pos Checker (Gate Out)</span>
              </a>
            </nav>

            <!-- Active Fleet Mini List -->
            <div class="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
              <div class="text-[11px] font-mono font-bold text-slate-400 flex items-center justify-between">
                <span>ARMADA AKTIF</span>
                <span class="text-emerald-400 font-bold">1 TRUK (LIVE)</span>
              </div>
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-white">Pak Budi (TRK-01)</span>
                  <span class="text-[10px] font-mono text-emerald-400 font-bold">42 km/h</span>
                </div>
                <div class="text-[10.5px] text-slate-400">Candi Sewu ➔ Tiron</div>
                <div class="text-[10px] font-mono text-blue-400">ETA: 12 menit lagi</div>
              </div>
            </div>
          </div>

          <div class="text-[10px] text-slate-500 text-center font-mono">
            Sistem Radar Real-Time &bull; Firebase RTDB
          </div>
        </aside>

        <!-- Main Radar Canvas -->
        <main class="flex-1 relative flex flex-col bg-[#050811] overflow-hidden">
          <!-- Top Floating Bar -->
          <div class="absolute top-6 inset-x-8 z-20 flex items-center justify-between pointer-events-none">
            <div class="pointer-events-auto bg-slate-900/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="text-sm font-extrabold text-white">Live Fleet Radar</span>
              </div>
              <span class="text-slate-600">|</span>
              <div class="text-xs font-mono text-slate-300">
                Streaming GPS: <b class="text-emerald-400">Tiap 10 Detik</b>
              </div>
              <span class="text-slate-600">|</span>
              <div class="text-xs text-slate-400">
                Workshop Rute: <b class="text-white">Madiun Logistics Network</b>
              </div>
            </div>

            <div class="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs font-mono">
              <button class="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold">Peta Satelit</button>
              <button class="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white">Pos Workshop</button>
              <button class="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white">Fokus Truk</button>
            </div>
          </div>

          <!-- Clean High-Tech Dark Vector Map Graphic -->
          <div class="w-full h-full relative flex items-center justify-center">
            <!-- Simulated High-Precision Satellite Canvas -->
            <svg class="w-full h-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#050811" stop-opacity="1"/>
                </radialGradient>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="50%" stop-color="#06b6d4"/>
                  <stop offset="100%" stop-color="#10b981"/>
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- Map Background Grid -->
              <rect width="1600" height="1000" fill="#070B14"/>
              <rect width="1600" height="1000" fill="url(#radarGlow)"/>

              <!-- Grid Lines -->
              <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
                <line x1="200" y1="0" x2="200" y2="1000"/>
                <line x1="400" y1="0" x2="400" y2="1000"/>
                <line x1="600" y1="0" x2="600" y2="1000"/>
                <line x1="800" y1="0" x2="800" y2="1000"/>
                <line x1="1000" y1="0" x2="1000" y2="1000"/>
                <line x1="1200" y1="0" x2="1200" y2="1000"/>
                <line x1="1400" y1="0" x2="1400" y2="1000"/>
                <line x1="0" y1="200" x2="1600" y2="200"/>
                <line x1="0" y1="400" x2="1600" y2="400"/>
                <line x1="0" y1="600" x2="1600" y2="600"/>
                <line x1="0" y1="800" x2="1600" y2="800"/>
              </g>

              <!-- Main Roads in Madiun Area -->
              <g stroke="#1e293b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <path d="M 150 780 Q 400 700 680 520 T 1150 280 T 1450 180"/>
                <path d="M 680 520 L 920 620 L 1200 680"/>
                <path d="M 320 880 L 450 750 L 520 620"/>
                <path d="M 920 620 L 980 820"/>
              </g>
              <g stroke="#334155" stroke-width="2" stroke-dasharray="8 6" fill="none">
                <path d="M 150 780 Q 400 700 680 520 T 1150 280 T 1450 180"/>
              </g>

              <!-- Active GPS Route Polyline (Candi Sewu ➔ Tiron) -->
              <path d="M 420 740 Q 550 640 680 520 Q 820 400 980 320 L 1150 280" fill="none" stroke="url(#routeGrad)" stroke-width="6" filter="url(#glow)"/>

              <!-- 1. Workshop Candi Sewu (Origin) -->
              <g transform="translate(420, 740)">
                <circle r="22" fill="#1e3a8a" stroke="#3b82f6" stroke-width="3"/>
                <text x="0" y="6" font-size="16" text-anchor="middle" fill="#ffffff">🏢</text>
                <rect x="-85" y="-55" width="170" height="32" rx="8" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/>
                <text x="0" y="-35" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans'">Candi Sewu (Asal)</text>
              </g>

              <!-- 2. Workshop Tiron (Destination) -->
              <g transform="translate(1150, 280)">
                <circle r="24" fill="#065f46" stroke="#10b981" stroke-width="3"/>
                <text x="0" y="7" font-size="18" text-anchor="middle" fill="#ffffff">🏭</text>
                <rect x="-85" y="-55" width="170" height="32" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
                <text x="0" y="-35" font-size="12" font-weight="bold" fill="#34d399" text-anchor="middle" font-family="'Plus Jakarta Sans'">Tiron (Tujuan)</text>
              </g>

              <!-- 3. Workshop Sukosari -->
              <g transform="translate(860, 680)">
                <circle r="18" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
                <text x="0" y="5" font-size="14" text-anchor="middle" fill="#ffffff">⚙️</text>
                <rect x="-65" y="-45" width="130" height="26" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1"/>
                <text x="0" y="-28" font-size="11" font-weight="bold" fill="#cbd5e1" text-anchor="middle" font-family="'Plus Jakarta Sans'">Sukosari</text>
              </g>

              <!-- 4. Workshop Remul -->
              <g transform="translate(1180, 650)">
                <circle r="18" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
                <text x="0" y="5" font-size="14" text-anchor="middle" fill="#ffffff">🏬</text>
                <rect x="-60" y="-45" width="120" height="26" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1"/>
                <text x="0" y="-28" font-size="11" font-weight="bold" fill="#cbd5e1" text-anchor="middle" font-family="'Plus Jakarta Sans'">Remul</text>
              </g>

              <!-- Active Live Truck Marker (Pak Budi - TRK-01) -->
              <g transform="translate(760, 450)">
                <!-- Pulse rings -->
                <circle r="42" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.4"/>
                <circle r="26" fill="none" stroke="#60a5fa" stroke-width="3" opacity="0.8"/>
                <circle r="18" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
                <text x="0" y="6" font-size="14" text-anchor="middle" fill="#ffffff">🚚</text>

                <!-- Live Tag Floating Over Truck -->
                <rect x="-120" y="-62" width="240" height="42" rx="10" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5" filter="url(#glow)"/>
                <text x="0" y="-42" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans'">Pak Budi &bull; TRK-01 (42 km/h)</text>
                <text x="0" y="-27" font-size="10" font-family="'JetBrains Mono'" fill="#60a5fa" text-anchor="middle">AE 8241 UZ &bull; Menuju Tiron</text>
              </g>
            </svg>

            <!-- Bottom Left Telemetry HUD Widget -->
            <div class="absolute bottom-6 left-8 bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700/80 shadow-2xl max-w-sm w-full space-y-3">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <div class="font-bold text-xs text-white flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  TELEMETRI TRUK LIVE (GPS)
                </div>
                <span class="text-[10px] font-mono text-slate-400">Akurasi: 3.8m</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div class="text-[10px] text-slate-500 font-mono">KECEPATAN</div>
                  <div class="text-base font-black text-emerald-400 mono">42 km/jam</div>
                </div>
                <div class="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div class="text-[10px] text-slate-500 font-mono">SISA WAKTU (ETA)</div>
                  <div class="text-base font-black text-amber-400 mono">14 menit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await radarPage.setContent(radarHtml, { waitUntil: 'domcontentloaded' });
    await radarPage.screenshot({ path: path.join(dirs.desktop, '01_fleet_radar.png') });
    console.log('✓ Rendered: ui-desktop/01_fleet_radar.png');

    await radarPage.close();

    console.log('\n--- 3. Rendering Mobile Screens (390x844 iPhone style) ---');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    // 1. ui-mobile/01_driver_tasks.png: Driver Assigned Tasks & Gate Out Action
    const driverTasksHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #080C15; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex flex-col justify-between p-4 bg-[#080C15]">
        <!-- Status Bar -->
        <div class="flex justify-between items-center text-xs font-semibold px-2 pt-1 text-slate-400 shrink-0">
          <span>09:41</span>
          <div class="flex items-center gap-1.5 text-[11px] font-mono">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        <!-- Scrollable App Body -->
        <div class="space-y-3 flex-1 pt-2 pb-1 overflow-y-auto">
          <!-- Profile Bar -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30">
                🚚
              </div>
              <div>
                <div class="font-extrabold text-sm text-white">Pak Budi Santoso</div>
                <div class="text-[11px] font-mono text-slate-400">TRK-01 &bull; Plat: <b class="text-slate-200">AE 8241 UZ</b></div>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
              LOGIN QR ✓
            </span>
          </div>

          <!-- Standby GPS Pill -->
          <div class="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs shadow-md">
            <div class="flex items-center gap-2 text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span class="font-bold">GPS Siaga (Standby)</span>
            </div>
            <span class="text-[10px] font-mono text-slate-400">Siap Otorisasi Gerbang</span>
          </div>

          <!-- Section Label -->
          <div class="flex items-center justify-between text-xs px-1 pt-1">
            <span class="font-bold text-slate-300">Muatan Bak Truk Ini (Batch 1 Truk)</span>
            <span class="text-[10.5px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">✓ Semua Terpilih</span>
          </div>

          <!-- Batch Card -->
          <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5 shadow-xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <div class="text-[9.5px] font-mono text-slate-400 uppercase">Rute Perjalanan</div>
                <div class="font-bold text-xs text-blue-400">Candi Sewu ➔ Workshop Tiron</div>
              </div>
              <span class="px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                2 KPM Terpilih
              </span>
            </div>

            <!-- KPM 1 -->
            <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5 text-xs">
              <div class="flex justify-between items-center">
                <span class="font-bold text-white text-[11.5px]">KPM 001: Plat Baja & Baut M12</span>
                <span class="text-[9.5px] font-mono text-emerald-400">Dimuat ✓</span>
              </div>
              <div class="text-[10.5px] text-slate-400">250 Baut M12, 15 Plat Baja, 40 Bracket WF-200</div>
            </div>

            <!-- KPM 2 -->
            <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5 text-xs">
              <div class="flex justify-between items-center">
                <span class="font-bold text-white text-[11.5px]">KPM 004: Cable Ladder Line B</span>
                <span class="text-[9.5px] font-mono text-emerald-400">Dimuat ✓</span>
              </div>
              <div class="text-[10.5px] text-slate-400">30 Cable Ladder W300, 60 Joint Plate Type A</div>
            </div>
          </div>

          <!-- Photo Verification Card -->
          <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2 shadow-lg">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white flex items-center gap-1.5">
                <span>📷 Foto Fisik Muatan Bak Truk</span>
              </span>
              <span class="text-emerald-400 text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Terlampir ✓</span>
            </div>
            <div class="h-44 rounded-xl overflow-hidden relative border border-slate-800">
              <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=80" class="w-full h-full object-cover">
              <div class="absolute bottom-2 inset-x-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10.5px] font-mono text-slate-300 flex justify-between">
                <span>Waktu Foto: 08:28 WIB</span>
                <span class="text-emerald-400 font-bold">Segel Terpasang ✓</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Controls -->
        <div class="pt-2 space-y-3 shrink-0">
          <button class="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2">
            <span>Minta Izin Checker (Gate Out)</span>
            <span class="text-base">➔</span>
          </button>

          <div class="border-t border-slate-800 pt-2 grid grid-cols-3 text-center text-xs text-slate-500 font-semibold">
            <div class="text-blue-400 font-bold flex flex-col items-center gap-0.5">
              <span class="text-sm">🚚</span>
              <span class="text-[10px]">Tugas Kirim</span>
            </div>
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-sm">📖</span>
              <span class="text-[10px]">Panduan</span>
            </div>
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-sm">⚙️</span>
              <span class="text-[10px]">Profil</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await mobilePage.setContent(driverTasksHtml, { waitUntil: 'domcontentloaded' });
    await mobilePage.screenshot({ path: path.join(dirs.mobile, '01_driver_tasks.png') });
    console.log('✓ Rendered: ui-mobile/01_driver_tasks.png');

    // 2. ui-mobile/02_driver_navigation.png: Live Route Navigation & GPS Streaming
    const driverNavHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #080C15; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex flex-col justify-between p-4 bg-[#080C15]">
        <!-- Status Bar -->
        <div class="flex justify-between items-center text-xs font-semibold px-2 pt-1 text-slate-400 shrink-0">
          <span>09:48</span>
          <div class="flex items-center gap-1.5 text-[11px] font-mono">
            <span>5G</span>
            <span>92%</span>
          </div>
        </div>

        <!-- App Body -->
        <div class="space-y-3 flex-1 pt-2 pb-1 overflow-y-auto">
          <!-- In-Transit Top Banner -->
          <div class="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-xs flex items-center justify-between shadow-lg">
            <div class="flex items-center gap-2 text-emerald-400 font-extrabold">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              GPS LIVE STREAMING AKTIF
            </div>
            <span class="text-[10px] font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded">Tiap 10s</span>
          </div>

          <div class="flex items-center justify-between px-1">
            <span class="px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              STATUS: JALAN (RUTE AKTIF)
            </span>
            <span class="text-[11px] text-slate-400 font-mono">TRK-01 &bull; 2 KPM</span>
          </div>

          <!-- Inlaid Simulated Mini Road Map -->
          <div class="h-48 rounded-2xl bg-slate-900 border border-slate-700 relative overflow-hidden shadow-inner flex items-center justify-center">
            <svg class="w-full h-full" viewBox="0 0 360 190" xmlns="http://www.w3.org/2000/svg">
              <rect width="360" height="190" fill="#090D16"/>
              <!-- Roads -->
              <path d="M 20 170 Q 120 130 180 95 T 340 35" stroke="#1e293b" stroke-width="24" fill="none" stroke-linecap="round"/>
              <path d="M 20 170 Q 120 130 180 95 T 340 35" stroke="#3b82f6" stroke-width="6" fill="none" stroke-linecap="round"/>
              <path d="M 180 95 L 260 175" stroke="#1e293b" stroke-width="14" fill="none"/>
              <!-- Origin Icon -->
              <circle cx="40" cy="160" r="11" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2"/>
              <text x="40" y="164" font-size="9" text-anchor="middle" fill="#fff">🏢</text>
              <!-- Destination Icon -->
              <circle cx="320" cy="45" r="13" fill="#065f46" stroke="#10b981" stroke-width="2"/>
              <text x="320" y="49" font-size="10" text-anchor="middle" fill="#fff">🏭</text>
              <!-- Current Truck Position -->
              <circle cx="180" cy="95" r="20" fill="#3b82f6" opacity="0.3"/>
              <circle cx="180" cy="95" r="13" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
              <text x="180" y="99" font-size="9" text-anchor="middle" fill="#fff">🚚</text>
            </svg>
            <div class="absolute top-2 left-2 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-800">
              Jl. Raya Madiun - Caruban
            </div>
            <div class="absolute bottom-2 right-2 bg-blue-950/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-blue-300 border border-blue-800">
              GPS: -7.5992°, 111.5318°
            </div>
          </div>

          <!-- Direction Turn Maneuver Box -->
          <div class="p-3.5 bg-slate-900 rounded-2xl border border-slate-700 flex items-center gap-3.5 shadow-lg">
            <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-600/30 shrink-0">
              ↰
            </div>
            <div class="text-xs">
              <div class="font-extrabold text-white text-sm">Dalam 200m belok kiri</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Menuju Workshop Tiron (Pintu Gerbang Utama)</div>
            </div>
          </div>

          <!-- Speed & ETA telemetry -->
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-800">
              <div class="text-[9.5px] text-slate-500 font-mono">KECEPATAN</div>
              <div class="text-lg font-black text-emerald-400 mono">42 <span class="text-[10px] font-normal">km/h</span></div>
            </div>
            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-800">
              <div class="text-[9.5px] text-slate-500 font-mono">SISA JARAK</div>
              <div class="text-lg font-black text-white mono">8.4 <span class="text-[10px] font-normal">km</span></div>
            </div>
            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-800">
              <div class="text-[9.5px] text-slate-500 font-mono">ESTIMASI</div>
              <div class="text-lg font-black text-blue-400 mono">14 <span class="text-[10px] font-normal">Mnt</span></div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Controls -->
        <div class="pt-2 space-y-2 shrink-0">
          <button class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-extrabold text-sm shadow-xl shadow-blue-600/40 transition flex items-center justify-center gap-2">
            <span class="text-lg">🗺️</span>
            <span>Buka Navigasi di Google Maps</span>
          </button>
          <div class="text-center text-[10px] text-slate-500 font-mono pb-1">
            Koordinat GPS otomatis tersimpan ke Spreadsheet (Kolom V)
          </div>
        </div>
      </body>
      </html>
    `;

    await mobilePage.setContent(driverNavHtml, { waitUntil: 'domcontentloaded' });
    await mobilePage.screenshot({ path: path.join(dirs.mobile, '02_driver_navigation.png') });
    console.log('✓ Rendered: ui-mobile/02_driver_navigation.png');

    // 3. ui-mobile/03_recipient_confirm.png: Frictionless Recipient Sign-Off
    const recipientHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #080C15; color: #f8fafc; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        </style>
      </head>
      <body class="h-screen flex flex-col justify-between p-4 bg-[#080C15]">
        <!-- Status Bar -->
        <div class="flex justify-between items-center text-xs font-semibold px-2 pt-1 text-slate-400 shrink-0">
          <span>10:15</span>
          <div class="flex items-center gap-1.5 text-[11px] font-mono">
            <span>5G</span>
            <span>88%</span>
          </div>
        </div>

        <!-- App Body -->
        <div class="space-y-3 flex-1 pt-2 pb-1 overflow-y-auto">
          <!-- Top Banner -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                ZERO LOGIN &bull; BROWSER LANGSUNG
              </span>
              <span class="text-[10.5px] font-mono text-slate-400">QR 3 Terbuka</span>
            </div>
            <h2 class="text-base font-black text-white">Konfirmasi Serah Terima Barang</h2>
            <p class="text-[11.5px] text-slate-400">Tanda terima muatan tiba di Workshop Tiron</p>
          </div>

          <!-- Main Form Card -->
          <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl space-y-3 text-xs">
            <!-- Selected KPM badge -->
            <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
              <div class="flex items-center justify-between font-mono">
                <span class="font-bold text-blue-400 text-xs">KPM: 001/PPO/LF/IX/2026</span>
                <span class="text-emerald-400 font-bold text-[10.5px]">ARMADA TIBA ✓</span>
              </div>
              <div class="text-slate-200 font-bold text-xs">Komponen Struktur Line A</div>
              <div class="text-[10px] text-slate-400">Driver: Pak Budi &bull; Dari Candi Sewu (Truk AE 8241 UZ)</div>
            </div>

            <!-- Field 1: Recipient Name Dropdown -->
            <div class="space-y-1">
              <label class="block font-bold text-slate-300 text-[10.5px]">Pilih Nama Petugas Penerima:</label>
              <div class="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/60 flex items-center justify-between font-bold text-emerald-400 shadow-inner">
                <span class="text-xs">AANG (Workshop Tiron)</span>
                <span class="text-xs">✓</span>
              </div>
            </div>

            <!-- Field 2: Photo Proof -->
            <div class="space-y-1">
              <label class="block font-bold text-slate-300 text-[10.5px]">Foto Bukti Barang Diterima di Bengkel:</label>
              <div class="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800">
                <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80" class="w-14 h-14 rounded-xl object-cover border border-slate-700">
                <div class="text-xs">
                  <div class="font-bold text-white">foto_bongkar_tiron.jpg</div>
                  <div class="text-emerald-400 font-mono text-[10px]">Terupload otomatis (Kompresi 180 KB) ✓</div>
                </div>
              </div>
            </div>

            <!-- Field 3: Digital Signature -->
            <div class="space-y-1">
              <label class="block font-bold text-slate-300 text-[10.5px]">Tanda Tangan Digital Penerima:</label>
              <div class="h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <svg class="w-48 h-12" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 20 40 Q 50 10 70 35 T 110 20 Q 140 45 160 25 L 180 30" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                <span class="absolute bottom-1.5 right-2 text-[9px] font-mono text-slate-500">TERVERIFIKASI DIGITAL</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Controls -->
        <div class="pt-2 space-y-2 shrink-0">
          <button class="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2">
            <span>Konfirmasi Penerimaan Barang ✓</span>
          </button>
          <div class="text-center text-[10px] text-slate-500 font-mono pb-1">
            Status otomatis terkunci TIBA di Google Sheets & Cloud Drive
          </div>
        </div>
      </body>
      </html>
    `;

    await mobilePage.setContent(recipientHtml, { waitUntil: 'domcontentloaded' });
    await mobilePage.screenshot({ path: path.join(dirs.mobile, '03_recipient_confirm.png') });
    console.log('✓ Rendered: ui-mobile/03_recipient_confirm.png');

    await mobilePage.close();

    console.log('\n======================================================');
    console.log('🎉 ALL PRESENTATION ASSETS REDONE CLEANLY & SUCCESSFULLY!');
    console.log('======================================================');

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Fatal error during asset generation:', err);
  process.exit(1);
});

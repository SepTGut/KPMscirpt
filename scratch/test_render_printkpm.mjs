import fs from 'fs';
import path from 'path';

const htmlTemplatePath = path.resolve('gas/PrintKPM.html');
let template = fs.readFileSync(htmlTemplatePath, 'utf8');

// Sample test data matching real production
const testData = {
  logo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50'><rect width='120' height='50' fill='%2316233B' rx='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23FFFFFF'>REKAINDO</text></svg>",
  tanggalCetak: "08/09/2026",
  totalPage: 1,
  pageSize: 15,
  shortRecipientUrl: "https://lnfd.vercel.app/r/k001",
  securityUrl: "https://lnfd.vercel.app/s/k001",
  header: {
    noRefKpp: "001/PPO/LF/IX/2026",
    noLampiranKpm: "001/KPM/IX/2026",
    tanggal: "08/09/2026",
    serial: "SN-2026-001",
    proyek: "Proyek LRT Jabodebek"
  },
  groups: [
    {
      reservasi: "RES-99882",
      tanggal: "08/09/2026",
      serial: "SN-2026-001",
      proyek: "Proyek LRT Jabodebek",
      noLampiranKpm: "001/KPM/IX/2026",
      isSplit: false,
      batches: [
        {
          totalBatch: 1,
          batchNo: 1,
          material: [
            { kode: "MAT-001", deskripsiSpesifikasi: "Kabel NYAF 1.5mm Hitam", qty: 50, qtyDiserahkan: "", satuan: "m", wsAwal: "Sukosari", wsTujuan: "Candi Sewu", keterangan: "Prioritas 1" },
            { kode: "MAT-002", deskripsiSpesifikasi: "Terminal Block WAGO 221-413", qty: 200, qtyDiserahkan: "", satuan: "pcs", wsAwal: "Sukosari", wsTujuan: "Candi Sewu", keterangan: "" },
            { kode: "MAT-003", deskripsiSpesifikasi: "Baut Hex M10 x 30 Stainless Steel 304", qty: 80, qtyDiserahkan: "", satuan: "pcs", wsAwal: "Remul", wsTujuan: "Tiron", keterangan: "" },
            { kode: "MAT-004", deskripsiSpesifikasi: "Mur M10 Stainless Steel 304 DIN934", qty: 80, qtyDiserahkan: "", satuan: "pcs", wsAwal: "Remul", wsTujuan: "Tiron", keterangan: "" },
            { kode: "MAT-005", deskripsiSpesifikasi: "Ring Plat M10 Stainless Steel 304", qty: 160, qtyDiserahkan: "", satuan: "pcs", wsAwal: "Remul", wsTujuan: "Tiron", keterangan: "" },
            { kode: "MAT-006", deskripsiSpesifikasi: "Rel Din Rail Aluminium 1 Meter", qty: 15, qtyDiserahkan: "", satuan: "btg", wsAwal: "Sukosari", wsTujuan: "Candi Sewu", keterangan: "" },
            { kode: "MAT-007", deskripsiSpesifikasi: "Cable Duct Wire Duct 40x40mm Grey", qty: 10, qtyDiserahkan: "", satuan: "btg", wsAwal: "Sukosari", wsTujuan: "Candi Sewu", keterangan: "" }
          ]
        }
      ]
    }
  ]
};

// Simple template evaluator for GAS scriptlets
let evaluated = template;

// Replace <?!= data.logo ?>
evaluated = evaluated.replace(/<\?!=\s*data\.logo\s*\?>/g, testData.logo);

// Replace <?= data.tanggalCetak ?>
evaluated = evaluated.replace(/<\?=\s*data\.tanggalCetak\s*\?>/g, testData.tanggalCetak);
evaluated = evaluated.replace(/<\?=\s*data\.totalPage\s*\?>/g, String(testData.totalPage));
evaluated = evaluated.replace(/<\?=\s*data\.header\.noRefKpp\s*\?>/g, testData.header.noRefKpp);
evaluated = evaluated.replace(/<\?=\s*data\.header\.noLampiranKpm\s*\?>/g, testData.header.noLampiranKpm);
evaluated = evaluated.replace(/<\?=\s*data\.shortRecipientUrl[\s\S]*?\?>/g, testData.shortRecipientUrl);
evaluated = evaluated.replace(/<\?=\s*data\.securityUrl[\s\S]*?\?>/g, testData.securityUrl);

// Execute the looping logic
const group = testData.groups[0];
const batch = group.batches[0];
const material = batch.material;
const pageSize = 15;
const pageMaterial = material.slice(0, pageSize);
const minimumBlankRows = 5;
const blankRows = Math.min(minimumBlankRows, Math.max(0, pageSize - pageMaterial.length));
const barcodeData = testData.header.noRefKpp;

evaluated = evaluated.replace(/<\?=\s*pageNo\s*\?>/g, "1");
evaluated = evaluated.replace(/<\?=\s*barcodeData\s*\?>/g, barcodeData);
evaluated = evaluated.replace(/<\?=\s*group\.reservasi\s*\|\|\s*""\s*\?>/g, group.reservasi);
evaluated = evaluated.replace(/<\?=\s*group\.tanggal[^?]*\?>/g, group.tanggal);
evaluated = evaluated.replace(/<\?=\s*group\.serial[^?]*\?>/g, group.serial);
evaluated = evaluated.replace(/<\?=\s*group\.proyek[^?]*\?>/g, group.proyek);
evaluated = evaluated.replace(/<\?=\s*group\.noLampiranKpm[^?]*\?>/g, group.noLampiranKpm);

// Strip GAS loop tags
evaluated = evaluated.replace(/<\?[\s\S]*?var groups = data\.groups[\s\S]*?\?>/g, '');
evaluated = evaluated.replace(/<\?\s*if\(batch\.totalBatch > 1\)\{\s*\?>[\s\S]*?<\?\s*\}\s*\?>/g, '');

// Build material rows
let rowsHtml = '';
for (let i = 0; i < pageMaterial.length; i++) {
  const m = pageMaterial[i];
  rowsHtml += `<tr>
    <td class="center">${i + 1}</td>
    <td>${m.kode}</td>
    <td>${m.deskripsiSpesifikasi}</td>
    <td class="center">${m.qty}</td>
    <td class="center">${m.qtyDiserahkan}</td>
    <td class="center">${m.satuan}</td>
    <td>${m.keterangan}</td>
    <td>${m.wsAwal}</td>
    <td>${m.wsTujuan}</td>
  </tr>\n`;
}
for (let b = 0; b < blankRows; b++) {
  rowsHtml += `<tr class="blank-row">
    <td class="center">&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td class="center">&nbsp;</td>
    <td class="center">&nbsp;</td>
    <td class="center">&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>\n`;
}

evaluated = evaluated.replace(/<\?\s*for\(var i = 0; i < pageMaterial\.length; i\+\+\)[\s\S]*?<\?\s*\}\s*\?>\s*<\?\s*for\(var blank = 0[\s\S]*?<\?\s*\}\s*\?>/g, rowsHtml);
evaluated = evaluated.replace(/<\?\s*\}\s*\}\s*\}\s*\?>/g, '');

// Disable auto print in test file
evaluated = evaluated.replace('function triggerAutoPrint() {', 'function triggerAutoPrint() { return;');

fs.mkdirSync(path.resolve('scratch'), { recursive: true });
fs.writeFileSync(path.resolve('scratch/rendered_kpm.html'), evaluated);
console.log('Successfully rendered scratch/rendered_kpm.html!');

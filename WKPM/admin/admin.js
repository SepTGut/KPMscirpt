// Google Apps Script web-app endpoint used by the admin deployment.
const scriptURL = 'https://script.google.com/macros/s/AKfycbzRb4Xk87pfdll6hHTxm5DXT65YJmqmjhB9MCC9eYrHW45pRjMm0rRiri3gtZEshyXf/exec';
const REQUEST_TIMEOUT_MS = 15000;

let dataMonitoringGlobal = [];
let statusFilterSaatIni = 'Semua';
let monitoringRequestId = 0;

const wadahBarang = document.getElementById('wadahBarang');
const btnTambah = document.getElementById('btnTambah');
const generateForm = document.getElementById('generateForm');
const btnSubmitGen = document.getElementById('btnSubmitGen');
const wadahMonitoring = document.getElementById('wadahMonitoring');

// Abort requests that hang forever on a weak mobile connection.
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (response.type !== 'opaque' && !response.ok) throw new Error(`Server returned ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Spreadsheet values are untrusted; escape them before inserting HTML.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function trustedPhotoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : '';
  } catch { return ''; }
}

function normalizedKpm(item) {
  const isDeparted = item?.isDeparted ?? (item?.status === 'Berangkat' || item?.status === 'Tiba');
  const isArrived = item?.isArrived ?? (item?.status === 'Tiba');
  return {
    nomor: item?.nomor ?? '-',
    status: item?.status ?? 'Baru Dibuat',
    proyek: item?.proyek ?? '-',
    lokasi: item?.lokasi ?? '-',
    pic: item?.pic ?? '-',
    waktuDibuat: item?.waktuDibuat ?? '',
    waktuBerangkat: item?.waktuBerangkat ?? '',
    waktuTiba: item?.waktuTiba ?? '',
    formattedCreated: item?.formattedCreated ?? formatWaktuLengkap(item?.waktuDibuat),
    formattedDeparted: item?.formattedDeparted ?? formatWaktuLengkap(item?.waktuBerangkat),
    formattedArrived: item?.formattedArrived ?? formatWaktuLengkap(item?.waktuTiba),
    badgeClass: item?.badgeClass ?? (isArrived ? 'b-tiba' : isDeparted ? 'b-berangkat' : 'b-dibuat'),
    badgeText: item?.badgeText ?? (isArrived ? 'TIBA' : isDeparted ? 'BERANGKAT' : 'DIBUAT'),
    timelineProgress: item?.timelineProgress ?? (isArrived ? '100%' : isDeparted ? '50%' : '0%'),
    isDeparted: isDeparted,
    isArrived: isArrived,
    durasi: item?.durasi ?? '',
    buktiBerangkat: item?.buktiBerangkat ?? '',
    buktiTiba: item?.buktiTiba ?? '',
    daftarBarang: Array.isArray(item?.daftarBarang) ? item.daftarBarang : []
  };
}

function switchTab(tab) {
  document.getElementById('tabBuat').style.display = tab === 'buat' ? 'block' : 'none';
  document.getElementById('tabPantau').style.display = tab === 'pantau' ? 'block' : 'none';
  document.getElementById('btnTabBuat').classList.toggle('active', tab === 'buat');
  document.getElementById('btnTabPantau').classList.toggle('active', tab === 'pantau');
  if (tab === 'pantau') tarikDataMonitoring();
}

btnTambah.addEventListener('click', () => {
  const div = document.createElement('div');
  div.className = 'item-box';
  div.innerHTML = `<input type="text" class="input-barang" placeholder="Nama Barang..." required>
    <input type="number" class="input-qty" placeholder="Qty" min="1" required>
    <select class="input-uom" required><option value="PCS">PCS</option><option value="M">M</option><option value="UNIT">UNIT</option>
    <option value="SET">SET</option><option value="PSG">PSG</option><option value="SHT">SHT</option><option value="L">L</option><option value="ROLL">ROLL</option><option value="STK">STK</option></select>
    <button type="button" class="btn-hapus" aria-label="Hapus barang">X</button>`;
  div.querySelector('.btn-hapus').addEventListener('click', () => div.remove());
  wadahBarang.appendChild(div);
});

generateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!generateForm.reportValidity()) return;
  const rows = [...wadahBarang.querySelectorAll('.item-box')];
  if (!rows.length) { alert('Silakan tambah minimal 1 barang sebelum menyimpan!'); return; }

  const daftarBarang = rows.map(row => {
    const nama = row.querySelector('.input-barang').value.trim();
    const qty = row.querySelector('.input-qty').value.trim();
    const uom = row.querySelector('.input-uom').value.trim();
    return `${nama}~${qty}~${uom}`;
  });
  const params = new URLSearchParams(new FormData(generateForm));
  params.append('action', 'createKpm');
  params.append('lokasiWorkshop', `${document.getElementById('lokasiBerangkat').value} ➔ ${document.getElementById('lokasiTiba').value}`);
  params.append('daftarBarang', daftarBarang.join('|'));

  btnSubmitGen.disabled = true; btnTambah.disabled = true; btnSubmitGen.innerText = 'Memproses Database...';
  try {
    const response = await fetchWithTimeout(scriptURL, { method: 'POST', body: params });
    const nomorKPMBaru = (await response.text()).trim();
    if (!nomorKPMBaru || /error/i.test(nomorKPMBaru)) throw new Error(nomorKPMBaru || 'Empty server response');
    generateForm.style.display = 'none';
    document.getElementById('hasilBox').style.display = 'block';
    document.getElementById('nomorTampil').textContent = nomorKPMBaru;
  } catch (error) {
    console.error('KPM creation failed:', error);
    alert('Gagal menyimpan KPM. Periksa koneksi internet dan coba lagi.');
    btnSubmitGen.disabled = false; btnTambah.disabled = false; btnSubmitGen.innerText = 'Simpan & Generate KPM';
  }
});

function terapkanFilter(statusTujuan, button) {
  statusFilterSaatIni = statusTujuan;
  document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); renderKartu();
}

function formatWaktuLengkap(value) {
  if (!value || value === '-') return 'Menunggu update...';
  const parts = String(value).trim().split(/\s+/);
  if (parts.length > 1) { const time = parts[1].split(':'); return `${parts[0]}, ${time[0] || '00'}:${time[1] || '00'} WIB`; }
  return escapeHtml(value);
}

function renderKartu() {
  const empty = document.getElementById('wadahKosong');
  const dataTampil = statusFilterSaatIni === 'Semua' ? dataMonitoringGlobal : dataMonitoringGlobal.filter(kpm => kpm.status === statusFilterSaatIni);
  if (!dataTampil.length) { wadahMonitoring.replaceChildren(); empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  // Fixed markup is combined only with escaped spreadsheet values.
  wadahMonitoring.innerHTML = dataTampil.map(raw => {
    const kpm = normalizedKpm(raw);
    const created = kpm.formattedCreated, departed = kpm.formattedDeparted, arrived = kpm.formattedArrived;
    const photoDeparted = trustedPhotoUrl(kpm.buktiBerangkat), photoArrived = trustedPhotoUrl(kpm.buktiTiba);
    const items = kpm.daftarBarang.map(item => `<div class="list-item"><span>📦 ${escapeHtml(item?.nama ?? '-')}</span><strong>${escapeHtml(item?.qty ?? '')} ${escapeHtml(item?.uom ?? '')}</strong></div>`).join('');
    return `<div class="kpm-card">
      <div class="kpm-header"><h3>${escapeHtml(kpm.nomor)}</h3><span class="badge ${kpm.badgeClass}">${kpm.badgeText}</span></div>
      <div class="kpm-detail"><p><strong>Proyek:</strong> ${escapeHtml(kpm.proyek)}</p><p><strong>Rute:</strong> ${escapeHtml(kpm.lokasi)}</p><p><strong>PIC:</strong> ${escapeHtml(kpm.pic)}</p></div>
      <div class="timeline"><div class="timeline-bg"><div class="timeline-fill" style="height: ${kpm.timelineProgress};"></div></div>
        <div class="timeline-step active"><div class="timeline-icon">📝</div><div class="timeline-info"><span class="timeline-title">KPM Dibuat</span><span class="timeline-time">${created}</span></div></div>
        <div class="timeline-step ${kpm.isDeparted ? 'active' : ''}"><div class="timeline-icon">🚚</div><div class="timeline-info"><span class="timeline-title">Perjalanan Berangkat</span><span class="timeline-time">${kpm.isDeparted ? departed : 'Menunggu update...'}</span></div></div>
        <div class="timeline-step ${kpm.isArrived ? 'active' : ''}"><div class="timeline-icon">✅</div><div class="timeline-info"><span class="timeline-title">Tiba di Tujuan</span><span class="timeline-time">${kpm.isArrived ? arrived : 'Menunggu update...'}</span></div></div></div>
      <details><summary>Lihat Rincian Barang (${kpm.daftarBarang.length} Item)</summary>${items || '<p>Tidak ada rincian barang.</p>'}</details>
      <div class="card-actions">${photoDeparted ? `<a href="${photoDeparted}" target="_blank" rel="noopener noreferrer" class="btn-foto-berangkat">📷 Berangkat</a>` : ''}${photoArrived ? `<a href="${photoArrived}" target="_blank" rel="noopener noreferrer" class="btn-foto-tiba">📷 Tiba</a>` : ''}${kpm.isArrived ? `<button type="button" class="btn-arsip" data-action="archive" data-nomor="${escapeHtml(kpm.nomor)}">🧹 Sembunyikan (Selesai)</button>` : ''}</div>
    </div>`;
  }).join('');
}

async function tarikDataMonitoring() {
  const loading = document.getElementById('statusLoading'), empty = document.getElementById('wadahKosong');
  const requestId = ++monitoringRequestId;
  wadahMonitoring.replaceChildren(); loading.style.display = 'block'; empty.style.display = 'none'; loading.innerText = 'Mengambil data dari server...';
  try {
    const response = await fetchWithTimeout(`${scriptURL}?action=getMonitoring`, { cache: 'no-store' });
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected server response');
    if (requestId !== monitoringRequestId) return; // Ignore stale refresh results.
    dataMonitoringGlobal = data.map(normalizedKpm); loading.style.display = 'none'; renderKartu();
  } catch (error) {
    if (requestId !== monitoringRequestId) return;
    console.error('Monitoring load failed:', error); loading.innerText = 'Koneksi internet bermasalah. Gagal memuat data.';
  }
}

// Event delegation avoids inline handlers inside generated cards.
wadahMonitoring.addEventListener('click', event => {
  const button = event.target.closest('[data-action="archive"]');
  if (button) arsipkanKPM(button.dataset.nomor, button);
});

async function arsipkanKPM(nomor, button) {
  if (!confirm(`Sembunyikan KPM ${nomor} dari pantauan? (Data tetap aman di Spreadsheet)`)) return;
  button.innerText = 'Menyembunyikan...'; button.disabled = true;
  try {
    await fetchWithTimeout(scriptURL, {
      method: 'POST',
      body: new URLSearchParams({ action: 'archiveKpm', nomorKPM: nomor, statusKPM: 'Selesai' }),
      mode: 'no-cors'
    });
    await tarikDataMonitoring();
  } catch (error) {
    console.error('Archive failed:', error); button.innerText = '🧹 Sembunyikan (Selesai)'; button.disabled = false;
    alert('Gagal menyembunyikan KPM. Silakan coba lagi.');
  }
}

async function muatMasterData() {
  try {
    const response = await fetchWithTimeout(`${scriptURL}?action=getMasterData`, { cache: 'no-store' });
    const data = await response.json();
    if (data && Array.isArray(data.workshops) && Array.isArray(data.pics)) {
      populateDropdown('lokasiBerangkat', data.workshops, '-- Pilih Lokasi Awal --');
      populateDropdown('lokasiTiba', data.workshops, '-- Pilih Lokasi Tujuan --');
      populateDropdown('namaPIC', data.pics, '-- Pilih Nama PIC --');
    }
  } catch (e) {
    // Non-fatal: keep existing HTML fallback options
  }
}

function populateDropdown(selectId, items, placeholder) {
  const select = document.getElementById(selectId);
  if (!select || !items.length) return;
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  if (current) select.value = current;
}

// Initialize master options on page load
muatMasterData();

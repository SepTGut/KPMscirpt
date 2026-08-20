// Google Apps Script web-app endpoint shared with the admin deployment.
const scriptURL = globalThis.KPM_CONFIG?.scriptUrl || '';
const DRIVER_API_TOKEN = globalThis.KPM_CONFIG?.driverToken || '';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_IMAGE_WIDTH = 1000;

const selectKPM = document.getElementById('nomorKPM');
const statusTeks = document.getElementById('statusTeks');
const wadahListBarang = document.getElementById('wadahListBarang');
const btnRefreshData = document.getElementById('btnRefreshData');
const wadahFoto = document.getElementById('wadahFoto');
const inputFoto = document.getElementById('inputFoto');
const labelFoto = document.getElementById('labelFoto');
const statusKompresi = document.getElementById('statusKompresi');
const updateForm = document.getElementById('updateForm');
const submitButton = document.getElementById('btnSubmitUpd');
let dataKPMGlobal = [];
let dataRequestId = 0;

// A timeout prevents the refresh or upload button from staying disabled forever.
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (response.type !== 'opaque' && !response.ok) throw new Error(`Server returned ${response.status}`);
    return response;
  } finally { clearTimeout(timer); }
}

// KPM/material text comes from the spreadsheet, so never inject it raw into HTML.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function showDefaultDetails() {
  document.getElementById('lokasiWorkshop').value = '';
  document.getElementById('namaPIC').value = '';
  document.getElementById('namaProyek').value = '';
  wadahListBarang.innerHTML = '<p>Pilih Nomor KPM di atas untuk melihat barang...</p>';
  wadahFoto.style.display = 'none';
  inputFoto.required = false;
  inputFoto.value = '';
  document.getElementById('fotoData').value = '';
  document.querySelectorAll('.radio-status').forEach(radio => { radio.checked = false; });
}

async function muatDataKPM() {
  const requestId = ++dataRequestId;
  selectKPM.innerHTML = '<option value="">-- Sedang mengambil data... --</option>';
  statusTeks.innerText = 'Mencari KPM terbaru...';
  btnRefreshData.disabled = true;
  try {
    const response = await fetchWithTimeout(`${scriptURL}?action=getDeliveries&apiToken=${encodeURIComponent(DRIVER_API_TOKEN)}`, { cache: 'no-store' });
    const result = await response.json();
    if (requestId !== dataRequestId) return; // Ignore an older refresh response.

    if (!result || !result.success) {
      throw new Error(result?.error?.message || 'Gagal memuat data pengiriman dari server.');
    }

    const list = Array.isArray(result.data) ? result.data : [];
    dataKPMGlobal = list;
    selectKPM.innerHTML = '<option value="">-- Pilih KPM yang tersedia --</option>';

    list.forEach(item => {
      const option = document.createElement('option');
      const nomor = item.nomor ?? item.kpmId ?? '-';
      const actionLabel = item.nextAction ?? 'Update';
      option.value = nomor;
      option.textContent = `${nomor} (➔ ${actionLabel})`;
      selectKPM.appendChild(option);
    });

    if (list.length) {
      statusTeks.innerText = `Ditemukan ${list.length} KPM yang perlu diantar/diupdate.`;
    } else {
      statusTeks.innerText = 'Tidak ada KPM yang perlu diantar/diupdate.';
      selectKPM.innerHTML = '<option value="">-- Semua KPM Sudah Selesai/Tiba --</option>';
    }
  } catch (error) {
    if (requestId !== dataRequestId) return;
    console.error('KPM load failed:', error);
    selectKPM.innerHTML = '<option value="">-- Gagal memuat KPM --</option>';
    statusTeks.innerText = 'Gagal memuat: ' + error.message;
  } finally {
    if (requestId === dataRequestId) btnRefreshData.disabled = false;
  }
}

function updatePhotoRequirement(status, customLabel) {
  wadahFoto.style.display = 'block';
  inputFoto.required = true;
  labelFoto.innerText = customLabel || (status === 'Berangkat'
    ? '📷 Unggah Bukti Foto Keberangkatan (Wajib):'
    : '📷 Unggah Bukti Foto Ketibaan (Wajib):');
}

document.querySelectorAll('.radio-status').forEach(radio => {
  radio.addEventListener('change', () => updatePhotoRequirement(radio.value));
});

selectKPM.addEventListener('change', () => {
  const selected = dataKPMGlobal.find(item => String(item?.nomor || item?.kpmId) === selectKPM.value);
  if (!selected) { showDefaultDetails(); return; }

  document.getElementById('lokasiWorkshop').value = selected.lokasi ?? '';
  document.getElementById('namaPIC').value = selected.pic ?? '';
  document.getElementById('namaProyek').value = selected.proyek ?? '';

  // Use server-directed next action and photo label
  const nextAction = selected.nextAction || (selected.currentStatus === 'Berangkat' ? 'Tiba' : 'Berangkat');
  const targetRadio = document.querySelector(`input[name="statusKPM"][value="${nextAction}"]`);
  if (targetRadio) targetRadio.checked = true;

  updatePhotoRequirement(nextAction, selected.photoLabel);

  const items = Array.isArray(selected.daftarBarang) ? selected.daftarBarang : [];
  wadahListBarang.innerHTML = items.length
    ? items.map(item => `<div class="list-item"><span>📦 ${escapeHtml(item?.nama ?? '-')}</span><strong>${escapeHtml(item?.qty ?? '')} ${escapeHtml(item?.uom ?? '')}</strong></div>`).join('')
    : '<p>Tidak ada rincian barang.</p>';
});

// Convert camera image to a compressed JPEG before upload.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = event => {
      const image = new Image();
      image.onerror = () => reject(new Error('Invalid image'));
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_WIDTH / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Canvas is unavailable')); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        try { resolve(canvas.toDataURL('image/jpeg', 0.72)); }
        catch (error) { reject(error); }
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

updateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!updateForm.reportValidity()) return;
  if (!selectKPM.value) { alert('Pilih KPM terlebih dahulu!'); return; }
  const file = inputFoto.files[0];
  if (!file || !file.type.startsWith('image/')) { alert('Harap lampirkan file foto yang valid!'); return; }

  submitButton.innerText = 'Memproses Foto & Menyimpan...';
  submitButton.disabled = true;
  statusKompresi.style.display = 'block';
  statusKompresi.innerText = 'Memproses ukuran foto...';
  // Readonly fields are temporarily enabled while constructing FormData.
  ['lokasiWorkshop', 'namaPIC', 'namaProyek'].forEach(id => { document.getElementById(id).readOnly = false; });

  try {
    document.getElementById('fotoData').value = await compressImage(file);
    statusKompresi.innerText = 'Kompresi selesai. Sedang menyimpan ke database...';

    const formData = new FormData(updateForm);
    formData.append('action', 'updateStatus');
    formData.append('apiToken', DRIVER_API_TOKEN);

    const response = await fetchWithTimeout(scriptURL, {
      method: 'POST',
      body: new URLSearchParams(formData)
    });
    const result = await response.json();

    if (!result || !result.success) {
      throw new Error(result?.error?.message || 'Server menolak pembaruan status.');
    }

    statusKompresi.innerText = 'Pembaruan berhasil!';
    document.getElementById('pesanUpdate').innerText = 'TUNTAS! Data berhasil diupdate.';
    setTimeout(() => location.reload(), 2000);
  } catch (error) {
    console.error('Status update failed:', error);
    submitButton.innerText = 'Simpan ke Database';
    submitButton.disabled = false;
    statusKompresi.innerText = 'Gagal menyimpan: ' + error.message;
    alert('Gagal menyimpan data: ' + error.message);
  }
});

btnRefreshData.addEventListener('click', muatDataKPM);
showDefaultDetails();
muatDataKPM();

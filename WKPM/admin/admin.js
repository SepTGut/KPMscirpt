// =====================================
      // PASTE URL MASTER YANG BARU DI SINI
      // =====================================
      const scriptURL = 'https://script.google.com/macros/s/AKfycbzRb4Xk87pfdll6hHTxm5DXT65YJmqmjhB9MCC9eYrHW45pRjMm0rRiri3gtZEshyXf/exec';

      let dataMonitoringGlobal = [];
      let statusFilterSaatIni = 'Semua';

      function switchTab(tab) {
        document.getElementById('tabBuat').style.display = tab === 'buat' ? 'block' : 'none';
        document.getElementById('tabPantau').style.display = tab === 'pantau' ? 'block' : 'none';
        document.getElementById('btnTabBuat').classList.toggle('active', tab === 'buat');
        document.getElementById('btnTabPantau').classList.toggle('active', tab === 'pantau');
        if (tab === 'pantau') { tarikDataMonitoring(); }
      }

      const wadahBarang = document.getElementById('wadahBarang');
      const btnTambah = document.getElementById('btnTambah');
      const generateForm = document.getElementById('generateForm');
      const btnSubmitGen = document.getElementById('btnSubmitGen');

      btnTambah.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'item-box';
        div.innerHTML = `
          <input type="text" class="input-barang" placeholder="Nama Barang..." required>
          <input type="number" class="input-qty" placeholder="Qty" min="1" required>
          <select class="input-uom" required>
            <option value="PCS">PCS</option><option value="M">M</option><option value="UNIT">UNIT</option>
            <option value="SET">SET</option><option value="PSG">PSG</option><option value="SHT">SHT</option>
            <option value="L">L</option><option value="ROLL">ROLL</option><option value="STK">STK</option>
          </select>
          <button type="button" class="btn-hapus" onclick="this.parentElement.remove()">X</button>
        `;
        wadahBarang.appendChild(div);
      });

      generateForm.addEventListener('submit', e => {
        e.preventDefault(); 
        const barisItem = document.querySelectorAll('.item-box');
        
        if (barisItem.length === 0) { alert("Silakan tambah minimal 1 barang sebelum menyimpan!"); return; }

        let daftarBarang = [];
        barisItem.forEach(baris => { 
          const nama = baris.querySelector('.input-barang').value.trim();
          const qty = baris.querySelector('.input-qty').value.trim();
          const uom = baris.querySelector('.input-uom').value.trim();
          if(nama !== "") daftarBarang.push(`${nama}~${qty}~${uom}`); 
        });

        const formDataParams = new URLSearchParams(new FormData(generateForm));
        const lokBerangkat = document.getElementById('lokasiBerangkat').value;
        const lokTiba = document.getElementById('lokasiTiba').value;
        formDataParams.append('lokasiWorkshop', lokBerangkat + " ➔ " + lokTiba);
        formDataParams.append("daftarBarang", daftarBarang.join("|"));

        btnSubmitGen.innerText = "Memproses Database...";
        btnSubmitGen.disabled = true;

        fetch(scriptURL, { method: 'POST', body: formDataParams }).then(res => res.text()).then(nomorKPMBaru => {
            generateForm.style.display = "none";
            document.getElementById('hasilBox').style.display = "block";
            document.getElementById('nomorTampil').innerText = nomorKPMBaru;
          }).catch(err => {
            alert("Koneksi gagal.");
            btnSubmitGen.innerText = "Simpan & Generate KPM";
            btnSubmitGen.disabled = false;
          });
      });

      function terapkanFilter(statusTujuan, btnElement) {
        statusFilterSaatIni = statusTujuan;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
        renderKartu();
      }

      function formatWaktuLengkap(waktuStr) {
        if (!waktuStr || waktuStr === "-" || waktuStr === "") return "Menunggu update...";
        let bagian = waktuStr.split(" ");
        if (bagian.length > 1) {
          let tanggal = bagian[0]; 
          let jamMenit = bagian[1].split(":");
          return tanggal + ", " + jamMenit[0] + ":" + jamMenit[1] + " WIB";
        }
        return waktuStr;
      }

      function renderKartu() {
        const wadah = document.getElementById('wadahMonitoring');
        const wadahKosong = document.getElementById('wadahKosong');
        wadah.innerHTML = '';
        
        let dataTampil = dataMonitoringGlobal;
        if (statusFilterSaatIni !== 'Semua') { dataTampil = dataMonitoringGlobal.filter(kpm => kpm.status === statusFilterSaatIni); }

        if (dataTampil.length === 0) { wadahKosong.style.display = 'block'; return; } 
        else { wadahKosong.style.display = 'none'; }

        let htmlKartu = '';
        dataTampil.forEach(kpm => {
          let tinggiGaris = '0%';
          let s1 = 'active', s2 = '', s3 = '';
          let badgeClass = 'b-dibuat';
          let badgeTeks = 'DIBUAT';
          
          let tombolArsipHtml = '';
          let tombolFotoBerangkatHtml = ''; 
          let tombolFotoTibaHtml = '';

          let teksDibuat = formatWaktuLengkap(kpm.waktuDibuat);
          let teksBerangkat = formatWaktuLengkap(kpm.waktuBerangkat);
          let teksTiba = formatWaktuLengkap(kpm.waktuTiba);

          let displayDibuat = teksDibuat !== "Menunggu update..." ? teksDibuat : "Waktu tdk terekam (Data Lama)";

          if (kpm.status === 'Berangkat' || kpm.status === 'Tiba') {
            s2 = 'active'; 
            tinggiGaris = kpm.status === 'Berangkat' ? '50%' : '100%'; 
            badgeClass = kpm.status === 'Berangkat' ? 'b-berangkat' : 'b-tiba';
            badgeTeks = kpm.status === 'Berangkat' ? 'BERANGKAT' : 'TIBA';
            
            if (kpm.buktiBerangkat && kpm.buktiBerangkat.indexOf("http") !== -1) {
              tombolFotoBerangkatHtml = `<a href="${kpm.buktiBerangkat}" target="_blank" class="btn-foto-berangkat">📷 Berangkat</a>`;
            }
          }
          
          if (kpm.status === 'Tiba') { 
            s3 = 'active'; 
            tombolArsipHtml = `<button type="button" class="btn-arsip" onclick="arsipkanKPM('${kpm.nomor}', this)">🧹 Sembunyikan (Selesai)</button>`;
            if (kpm.buktiTiba && kpm.buktiTiba.indexOf("http") !== -1) {
              tombolFotoTibaHtml = `<a href="${kpm.buktiTiba}" target="_blank" class="btn-foto-tiba">📷 Tiba</a>`;
            }
          }

          let listBarangHtml = '';
          kpm.daftarBarang.forEach(b => { listBarangHtml += `<div class="list-item"><span>📦 ${b.nama}</span> <strong>${b.qty} ${b.uom}</strong></div>`; });

          htmlKartu += `
            <div class="kpm-card">
              <div class="kpm-header">
                <h3>${kpm.nomor}</h3>
                <span class="badge ${badgeClass}">${badgeTeks}</span>
              </div>
              <div class="kpm-detail">
                <p><strong>Proyek:</strong> ${kpm.proyek}</p>
                <p><strong>Rute:</strong> ${kpm.lokasi}</p>
                <p><strong>PIC:</strong> ${kpm.pic}</p>
              </div>
              
              <div class="timeline">
                <div class="timeline-bg"><div class="timeline-fill" style="height: ${tinggiGaris};"></div></div>
                <div class="timeline-step ${s1}">
                  <div class="timeline-icon">📝</div>
                  <div class="timeline-info"><span class="timeline-title">KPM Dibuat</span><span class="timeline-time">${displayDibuat}</span></div>
                </div>
                <div class="timeline-step ${s2}">
                  <div class="timeline-icon">🚚</div>
                  <div class="timeline-info"><span class="timeline-title">Perjalanan Berangkat</span><span class="timeline-time">${s2 ? teksBerangkat : 'Menunggu update...'}</span></div>
                </div>
                <div class="timeline-step ${s3}">
                  <div class="timeline-icon">✅</div>
                  <div class="timeline-info"><span class="timeline-title">Tiba di Tujuan</span><span class="timeline-time">${s3 ? teksTiba : 'Menunggu update...'}</span></div>
                </div>
              </div>
              
              <details><summary>Lihat Rincian Barang (${kpm.daftarBarang.length} Item)</summary>${listBarangHtml}</details>
              
              ${(tombolFotoBerangkatHtml !== '' || tombolFotoTibaHtml !== '' || tombolArsipHtml !== '') ? `
              <div class="card-actions">
                ${tombolFotoBerangkatHtml}
                ${tombolFotoTibaHtml}
                ${tombolArsipHtml}
              </div>
              ` : ''}
            </div>
          `;
        });
        wadah.innerHTML = htmlKartu;
      }

      function tarikDataMonitoring() {
        const loading = document.getElementById('statusLoading');
        const wadahKosong = document.getElementById('wadahKosong');
        document.getElementById('wadahMonitoring').innerHTML = '';
        loading.style.display = 'block';
        wadahKosong.style.display = 'none';
        loading.innerText = 'Mengambil data dari server...';

        fetch(scriptURL).then(res => res.json()).then(data => {
          loading.style.display = 'none';
          dataMonitoringGlobal = data; 
          renderKartu(); 
        }).catch(err => {
          loading.innerText = 'Koneksi internet bermasalah. Gagal memuat data.';
        });
      }

      function arsipkanKPM(nomor, btnElement) {
        if (!confirm("Sembunyikan KPM " + nomor + " dari pantauan? (Data tetap aman di Spreadsheet)")) return;
        btnElement.innerText = "Menyembunyikan...";
        btnElement.disabled = true;
        let formData = new URLSearchParams();
        formData.append('nomorKPM', nomor);
        formData.append('statusKPM', 'Selesai'); 
        fetch(scriptURL, { method: 'POST', body: formData, mode: 'no-cors' }).then(() => { tarikDataMonitoring(); });
      }

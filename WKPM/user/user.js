// =====================================
      // PASTE URL MASTER YANG BARU DI SINI
      // =====================================
      const scriptURL = 'https://script.google.com/macros/s/AKfycbzRb4Xk87pfdll6hHTxm5DXT65YJmqmjhB9MCC9eYrHW45pRjMm0rRiri3gtZEshyXf/exec';

      const selectKPM = document.getElementById('nomorKPM');
      const statusTeks = document.getElementById('statusTeks');
      const wadahListBarang = document.getElementById('wadahListBarang');
      const btnRefreshData = document.getElementById('btnRefreshData');
      const wadahFoto = document.getElementById('wadahFoto');
      const inputFoto = document.getElementById('inputFoto');
      const labelFoto = document.getElementById('labelFoto');
      const statusKompresi = document.getElementById('statusKompresi');
      let dataKPMGlobal = []; 

      function muatDataKPM() {
        selectKPM.innerHTML = '<option value="">-- Sedang mengambil data... --</option>';
        statusTeks.innerText = "Mencari KPM terbaru...";
        btnRefreshData.disabled = true;

        fetch(scriptURL).then(res => res.json()).then(data => {
            dataKPMGlobal = data; 
            selectKPM.innerHTML = '<option value="">-- Pilih KPM yang tersedia --</option>';
            
            let jumlahTersedia = 0;
            data.forEach(item => {
              if (item.status !== "Tiba" && item.status !== "Selesai") {
                const option = document.createElement('option');
                option.value = item.nomor; 
                option.text = item.nomor;
                selectKPM.appendChild(option);
                jumlahTersedia++;
              }
            });

            if (jumlahTersedia > 0) {
              statusTeks.innerText = "Data KPM berhasil diperbarui.";
            } else {
              statusTeks.innerText = "Tidak ada KPM yang perlu diantar/diupdate.";
              selectKPM.innerHTML = '<option value="">-- Semua KPM Sudah Tiba --</option>';
            }
            btnRefreshData.disabled = false;
          }).catch(err => {
            selectKPM.innerHTML = '<option value="">-- Gagal memuat KPM --</option>';
            statusTeks.innerText = "Koneksi internet bermasalah.";
            btnRefreshData.disabled = false;
          });
      }

      muatDataKPM();
      btnRefreshData.addEventListener('click', muatDataKPM);

      // Ubah teks label sesuai status yang diklik
      document.querySelectorAll('.radio-status').forEach(radio => {
        radio.addEventListener('change', function() {
          wadahFoto.style.display = 'block';
          inputFoto.required = true;
          if (this.value === 'Berangkat') {
            labelFoto.innerText = "📷 Unggah Bukti Foto Keberangkatan (Wajib):";
          } else {
            labelFoto.innerText = "📷 Unggah Bukti Foto Ketibaan (Wajib):";
          }
        });
      });

      selectKPM.addEventListener('change', function() {
        const kpmPilihan = this.value;
        const dataCocok = dataKPMGlobal.find(item => item.nomor === kpmPilihan);

        if (dataCocok) {
          document.getElementById('lokasiWorkshop').value = dataCocok.lokasi;
          document.getElementById('namaPIC').value = dataCocok.pic;
          document.getElementById('namaProyek').value = dataCocok.proyek;
          
          wadahFoto.style.display = 'block';
          inputFoto.required = true;

          if (dataCocok.status === "Baru Dibuat") {
            document.querySelector('input[value="Berangkat"]').checked = true;
            labelFoto.innerText = "📷 Unggah Bukti Foto Keberangkatan (Wajib):";
          } else if (dataCocok.status === "Berangkat") {
            document.querySelector('input[value="Tiba"]').checked = true;
            labelFoto.innerText = "📷 Unggah Bukti Foto Ketibaan (Wajib):";
          }

          if (dataCocok.daftarBarang && dataCocok.daftarBarang.length > 0) {
            let htmlBarang = '';
            dataCocok.daftarBarang.forEach(b => {
              htmlBarang += `<div class="list-item"><span>📦 ${b.nama}</span><strong>${b.qty} ${b.uom}</strong></div>`;
            });
            wadahListBarang.innerHTML = htmlBarang;
          } else {
            wadahListBarang.innerHTML = '<p>Tidak ada rincian barang.</p>';
          }
        } else {
          document.getElementById('updateForm').reset();
          wadahListBarang.innerHTML = '<p>Pilih Nomor KPM di atas untuk melihat barang...</p>';
          wadahFoto.style.display = 'none';
          inputFoto.required = false;
        }
      });

      document.getElementById('updateForm').addEventListener('submit', e => {
        e.preventDefault(); 
        if (selectKPM.value === "") { alert("Pilih KPM terlebih dahulu!"); return; }
        if (!inputFoto.files[0]) { alert("Harap lampirkan/ambil bukti foto!"); return; }

        const btn = document.getElementById('btnSubmitUpd');
        btn.innerText = "Mengunggah Data & Foto (Tunggu sebentar)..."; 
        btn.disabled = true;
        
        document.getElementById('lokasiWorkshop').disabled = false;
        document.getElementById('namaPIC').disabled = false;
        document.getElementById('namaProyek').disabled = false;

        function kirimData() {
          fetch(scriptURL, { method: 'POST', body: new URLSearchParams(new FormData(document.getElementById('updateForm'))), mode: 'no-cors' })
          .then(() => {
              document.getElementById('pesanUpdate').innerText = "TUNTAS! Data berhasil diupdate.";
              setTimeout(() => location.reload(), 2000); 
          });
        }

        statusKompresi.style.display = 'block';
        const file = inputFoto.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            const scaleSize = MAX_WIDTH / img.width;
            if (img.width > MAX_WIDTH) {
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
            } else {
              canvas.width = img.width;
              canvas.height = img.height;
            }
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            document.getElementById('fotoData').value = canvas.toDataURL('image/jpeg', 0.7);
            statusKompresi.innerText = "Kompresi selesai. Sedang menyimpan ke database...";
            kirimData();
          }
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });

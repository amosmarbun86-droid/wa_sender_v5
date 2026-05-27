const CLOUD_NAME = "dkisbfx29";
const UPLOAD_PRESET = "ml_default";
const API_KEY_FONNTE = "hMYEWfgYSGSw6KK81TN6";

// ================= KUNCI FIREBASE CONFIG RESMI ANDA =================
const firebaseConfig = {
  apiKey: "AIzaSyDejqBNDkHJQKkOBxWzlgOZzoYdz4XMvsI",
  authDomain: "wa-sender-v4-pro.firebaseapp.com",
  databaseURL: "https://wa-sender-v4-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wa-sender-v4-pro",
  storageBucket: "wa-sender-v4-pro.firebasestorage.app",
  messagingSenderId: "397741200880",
  appId: "1:397741200880:web:a2eb60b15378c614383935"
};

// Inisialisasi Aplikasi Firebase & Database Reference
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const kontakRef = db.ref("kontak");
const logRef = db.ref("logs"); // Reference baru untuk menyimpan riwayat pesan

// Variabel lokal penyimpan data kontak yang sinkron dengan Firebase
let kontak = [];

// Mendengarkan perubahan data secara langsung dari Firebase Realtime Server
kontakRef.on("value", (snapshot) => {
    const data = snapshot.val();
    kontak = [];
    
    if (data) {
        Object.keys(data).forEach((key) => {
            kontak.push({
                id: key, // Menyimpan id firebase untuk keperluan penghapusan data spesifik
                nama: data[key].nama,
                nomor: data[key].nomor
            });
        });
    }
    // Render otomatis menggunakan filter pencarian (jika kolom search terisi)
    const keyword = document.getElementById("searchKontak") ? document.getElementById("searchKontak").value.toLowerCase().trim() : "";
    if (keyword !== "") {
        filterKontak();
    } else {
        renderKontak();
    }
});

// Mendengarkan data log history pengiriman secara live dari Firebase
logRef.on("value", (snapshot) => {
    const data = snapshot.val();
    const tbody = document.getElementById("logTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!data) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">Belum ada riwayat pengiriman.</td></tr>`;
        return;
    }

    const logList = [];
    Object.keys(data).forEach(key => {
        logList.push({ id: key, ...data[key] });
    });
    logList.reverse(); // Data terbaru akan selalu berada di urutan paling atas

    logList.forEach(log => {
        let tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors";
        
        let statusBadge = log.status.includes("✅") 
            ? `<span class="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-bold">SUKSES</span>`
            : log.status.includes("⚠️")
            ? `<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-bold">TERTUNDA</span>`
            : `<span class="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold">GAGAL</span>`;

        tr.innerHTML = `
            <td class="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">${log.waktu}</td>
            <td class="p-3 font-semibold text-slate-300">${log.tujuan}</td>
            <td class="p-3 text-slate-400 max-w-xs truncate" title="${log.pesan}">${log.pesan}</td>
            <td class="p-3">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
});

// ================= AUTH SYSTEM =================
function checkAuth() {
    const isLogin = localStorage.getItem("login");
    if (isLogin === "true") {
        document.getElementById("loginPage").classList.add("hidden-section");
        document.getElementById("mainDashboard").classList.remove("hidden-section");
    } else {
        document.getElementById("loginPage").classList.remove("hidden-section");
        document.getElementById("mainDashboard").classList.add("hidden-section");
    }
}

function handleLogin() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (u === "admin" && p === "101312") {
        localStorage.setItem("login", "true");
        checkAuth();
    } else {
        alert("Akses Ditolak! Periksa kembali kredensial Anda.");
    }
}

function handleLogout() {
    localStorage.removeItem("login");
    checkAuth();
}

// ================= CONTACT SYSTEM (FIREBASE INTEGRATED) =================
function renderKontak(kontakFilter = null) {
    const select = document.getElementById("kontakSelect");
    if (!select) return;
    select.innerHTML = `<option value="">-- Pilih Kontak --</option>`;
    
    const daftarKontak = kontakFilter || kontak;

    daftarKontak.forEach((k) => {
        let opt = document.createElement("option");
        // Mencari index asli dari array utama kontak agar fungsionalitas tombol hapus/isi tetap akurat
        const indexAsli = kontak.findIndex(item => item.id === k.id);
        opt.value = indexAsli;
        opt.text = `${k.nama} (${k.nomor})`;
        select.appendChild(opt);
    });
}

// Fungsi Pencarian Kontak Secara Live
function filterKontak() {
    const keyword = document.getElementById("searchKontak").value.toLowerCase().trim();
    if (keyword === "") {
        renderKontak();
        return;
    }

    const hasilFilter = kontak.filter(k => 
        k.nama.toLowerCase().includes(keyword) || 
        k.nomor.includes(keyword)
    );
    renderKontak(hasilFilter);
}

function tambahKontak() {
    let n = document.getElementById("namaKontak").value.trim();
    let num = document.getElementById("nomorKontak").value.trim();
    if (!n || !num) return alert("Lengkapi nama dan nomor!");
    if(num.startsWith("0")) num = "62" + num.slice(1);
    if(num.startsWith("8")) num = "62" + num;

    kontakRef.push({
        nama: n,
        nomor: num
    }).then(() => {
        document.getElementById("namaKontak").value = "";
        document.getElementById("nomorKontak").value = "";
    }).catch((err) => {
        alert("Gagal menyimpan ke server: " + err.message);
    });
}

function hapusSatuKontak() {
    let i = document.getElementById("kontakSelect").value;
    if (i === "") return alert("Pilih kontak yang ingin dihapus!");
    
    let kontakTerpilih = kontak[i];
    if (confirm(`Hapus kontak ${kontakTerpilih.nama} dari server?`)) {
        db.ref("kontak/" + kontakTerpilih.id).remove()
        .then(() => {
            document.getElementById("nomor").value = "";
        })
        .catch((err) => {
            alert("Gagal menghapus data di server: " + err.message);
        });
    }
}

function hapusSemuaKontak() {
    if (confirm("Hapus seluruh database kontak di cloud server? Tindakan ini tidak bisa dibatalkan.")) {
        kontakRef.remove()
        .then(() => {
            document.getElementById("nomor").value = "";
        })
        .catch((err) => {
            alert("Gagal mengosongkan database server: " + err.message);
        });
    }
}

function isiNomor() {
    let i = document.getElementById("kontakSelect").value;
    if (i !== "" && kontak[i]) document.getElementById("nomor").value = kontak[i].nomor;
}

function importCSV() {
    const f = document.getElementById("csvFile").files[0];
    if (!f) return alert("Pilih file CSV dulu!");
    const r = new FileReader();
    r.onload = function(e) {
        const rows = e.target.result.split("\n");
        rows.forEach(row => {
            let [nama, nomor] = row.split(",");
            if (nama && nomor) {
                let val = nomor.trim();
                if(val.startsWith("0")) val = "62" + val.slice(1);
                
                kontakRef.push({
                    nama: nama.trim(),
                    nomor: val
                });
            }
        });
        alert("Import database CSV selesai dikirim ke server cloud.");
    };
    r.readAsText(f);
}

// ================= MEDIA & SEND SYSTEM =================
const fInput = document.getElementById("file");
if (fInput) {
    fInput.addEventListener("change", function() {
        const file = this.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = document.getElementById("previewImg");
        const vid = document.getElementById("previewVideo");
        if (file.type.startsWith("image")) {
            img.src = url; img.style.display = "block"; vid.style.display = "none";
        } else {
            vid.src = url; vid.style.display = "block"; img.style.display = "none";
        }
    });
}

async function kirim() {
    const st = document.getElementById("status");
    const bt = document.getElementById("btnKirim");
    const no = document.getElementById("nomor").value.trim();
    const ps = document.getElementById("pesan").value.trim();
    const fl = fInput ? fInput.files[0] : null;

    if (!no) return alert("Nomor tujuan wajib diisi!");

    bt.disabled = true;
    st.innerText = "⏳ Sedang memproses media...";

    let iK = document.getElementById("kontakSelect").value;
    let sapa = (iK !== "" && kontak[iK]) ? kontak[iK].nama : "Bapak/Ibu";
    let pFinal = ps.replace(/{{nama}}/g, sapa);

    let mUrl = "";
    let upOk = false;
    let statusLog = "❌ Gagal"; // Status default untuk dicatat ke riwayat log

    try {
        if (fl) {
            let fd = new FormData();
            fd.append("file", fl);
            fd.append("upload_preset", UPLOAD_PRESET);
            let up = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
                method: "POST",
                body: fd
            });
            let rC = await up.json();
            if (rC.secure_url) { mUrl = rC.secure_url; upOk = true; }
        }

        let msgFull = upOk ? (pFinal + "\n\n" + mUrl) : pFinal;
        
        st.innerText = "📤 Mengirim pesan ke WhatsApp...";
        let bdy = { target: no, message: msgFull };
        if (upOk) { bdy.url = mUrl; bdy.filename = fl.name; }

        let res = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": API_KEY_FONNTE, "Content-Type": "application/json" },
            body: JSON.stringify(bdy)
        });

        let d = await res.json();

        if ((!d.status || !upOk) && mUrl) {
            await fetch("https://api.fonnte.com/send", {
                method: "POST",
                headers: { "Authorization": API_KEY_FONNTE, "Content-Type": "application/json" },
                body: JSON.stringify({ target: no, message: pFinal + "\n\n" + mUrl })
            });
            st.innerText = "⚠️ Media tertunda, link terkirim.";
            statusLog = "⚠️ Media Tertunda";
        } else if (d.status) {
            st.innerText = "✅ Pesan berhasil dikirim!";
            alert("Pesan Berhasil Terkirim!");
            statusLog = "✅ Berhasil";
        } else {
            throw new Error("Gagal Kirim");
        }

    } catch (err) {
        console.error(err);
        st.innerText = "❌ Terjadi kesalahan pengiriman.";
        statusLog = "❌ Gagal";
    } finally {
        bt.disabled = false;
        
        // Simpan Log Pengiriman ke Firebase secara otomatis
        const sekarang = new Date();
        const opsiWaktu = { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        };
        const stringWaktu = sekarang.toLocaleString('id-ID', opsiWaktu).replace(/\//g, '-');

        logRef.push({
            waktu: stringWaktu,
            tujuan: no,
            pesan: pFinal,
            status: statusLog
        }).catch(e => console.error("Gagal mencatat log ke cloud:", e));
    }
}

// Fungsi membersihkan seluruh data riwayat pesan di Firebase
function hapusSemuaLog() {
    if (confirm("Hapus seluruh data riwayat pengiriman di cloud server?")) {
        logRef.remove().catch(err => alert("Gagal membersihkan log: " + err.message));
    }
}

// Jalankan pengecekan status masuk admin sistem
checkAuth();

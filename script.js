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

// Variabel lokal penyimpan data kontak yang sinkron dengan Firebase
let kontak = [];

// ================= VALIDATOR UTIL SYSTEM (ANTI-ERROR) =================
function validasiFormatNomor(nomor) {
    // 1. Hapus semua karakter selain angka (seperti +, -, spasi)
    let cleaned = nomor.replace(/\D/g, '');
    
    // 2. Jika nomor diawali dengan '0', ubah menjadi '62'
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    
    // 3. Jika nomor langsung diawali '8', tambahkan '62' di depannya
    if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

// Mendengarkan perubahan data secara langsung dari Firebase Realtime Server
kontakRef.on("value", (snapshot) => {
    const data = snapshot.val();
    kontak = [];
    
    if (data) {
        Object.keys(data).forEach((key) => {
            kontak.push({
                id: key, 
                nama: data[key].nama,
                nomor: data[key].nomor
            });
        });
    }
    renderKontak();
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

// ================= CONTACT SYSTEM (FIREBASE + VALIDATED) =================
function renderKontak() {
    const select = document.getElementById("kontakSelect");
    if (!select) return;
    select.innerHTML = `<option value="">-- Pilih Kontak --</option>`;
    kontak.forEach((k, i) => {
        let opt = document.createElement("option");
        opt.value = i;
        opt.text = `${k.nama} (${k.nomor})`;
        select.appendChild(opt);
    });
}

function tambahKontak() {
    let n = document.getElementById("namaKontak").value.trim();
    let num = document.getElementById("nomorKontak").value.trim();
    if (!n || !num) return alert("Lengkapi nama dan nomor!");

    // Bersihkan format nomor sebelum masuk ke Firebase
    let nomorValid = validasiFormatNomor(num);

    if (nomorValid.length < 10) {
        return alert("Format nomor tidak valid atau terlalu pendek!");
    }

    kontakRef.push({
        nama: n,
        nomor: nomorValid
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

// Menghapus seluruh node 'kontak' di database Firebase
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
    if (i !== "") document.getElementById("nomor").value = kontak[i].nomor;
}

function importCSV() {
    const f = document.getElementById("csvFile").files[0];
    if (!f) return alert("Pilih file CSV dulu!");
    
    // Aktifkan baris teks loading di area status dashboard utama
    const st = document.getElementById("status");
    if(st) st.innerText = "⏳ Sedang mengunggah kontak ke server cloud...";

    const r = new FileReader();
    r.onload = function(e) {
        const rows = e.target.result.split(/\r?\n/);
        
        let uploadPromises = [];
        let jumlahSukses = 0;

        rows.forEach(row => {
            if (!row.trim()) return;

            let [nama, nomor] = row.split(",");
            if (nama && nomor) {
                let namaClean = nama.trim();
                let nomorValid = validasiFormatNomor(nomor.trim());
                
                if (namaClean !== "" && nomorValid.length >= 10) {
                    // Masukkan eksekusi push ke dalam antrean promise asynchronous
                    let p = kontakRef.push({
                        nama: namaClean,
                        nomor: nomorValid
                    }).then(() => {
                        jumlahSukses++;
                    });
                    uploadPromises.push(p);
                }
            }
        });

        if (uploadPromises.length === 0) {
            if(st) st.innerText = "";
            document.getElementById("csvFile").value = "";
            return alert("❌ Gagal! Tidak ada kontak valid yang ditemukan di file CSV.");
        }

        // Jalankan pelacakan sinkronisasi terpusat setelah semua antrean selesai diproses server
        Promise.all(uploadPromises)
            .then(() => {
                if(st) st.innerText = "✅ Impor kontak CSV berhasil!";
                document.getElementById("csvFile").value = "";
                alert(`🎉 Sukses! ${jumlahSukses} kontak telah berhasil diverifikasi dan tersimpan di database server Firebase.`);
            })
            .catch((err) => {
                if(st) st.innerText = "❌ Gagal sinkronisasi server.";
                console.error(err);
                alert("Terjadi kesalahan saat menyinkronkan data ke server: " + err.message);
            });
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
    
    // Bersihkan input manual kolom nomor utama sebelum ditembak ke API Fonnte
    const nomorTujuanValid = validasiFormatNomor(no);
    if (nomorTujuanValid.length < 10) {
        return alert("Nomor tujuan tidak valid atau salah format!");
    }

    bt.disabled = true;
    st.innerText = "⏳ Sedang memproses media...";

    let iK = document.getElementById("kontakSelect").value;
    let sapa = (iK !== "" && kontak[iK]) ? kontak[iK].nama : "Bapak/Ibu";
    let pFinal = ps.replace(/{{nama}}/g, sapa);

    let mUrl = "";
    let upOk = false;

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
        
        // Memastikan parameter target menggunakan nomor yang telah lolos validasi otomatis
        let bdy = { target: nomorTujuanValid, message: msgFull };
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
                body: JSON.stringify({ target: nomorTujuanValid, message: pFinal + "\n\n" + mUrl })
            });
            st.innerText = "⚠️ Media tertunda, link terkirim.";
        } else if (d.status) {
            st.innerText = "✅ Pesan berhasil dikirim!";
            alert("Pesan Berhasil Terkirim!");
        } else {
            throw new Error("Gagal Kirim");
        }

    } catch (err) {
        console.error(err);
        st.innerText = "❌ Terjadi kesalahan pengiriman.";
    } finally {
        bt.disabled = false;
    }
}

// Jalankan pengecekan status masuk admin sistem
checkAuth();

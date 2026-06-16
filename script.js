const CLOUD_NAME = "dkisbfx29";
const UPLOAD_PRESET = "ml_default";
const API_KEY_FONNTE = "hMYEWfgYSGSw6KK81TN6";

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

// Variabel global baru untuk mengelola state tampilan room chat interaktif
let nomorChatAktif = null;
let semuaLogData = {};

// --- VARIABLE STATE UNTUK AUDIO NOTIFIKASI MASUK ---\nlet aplikasiSiapNotif = false; // Mengurangi resiko spam suara saat load awal data lama\nconst audioNotif = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");\naudioNotif.volume = 0.7;

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

// ================= MUTASI LOGIKA SEKSI RIWAYAT MENJADI ROOM CHAT INTERAKTIF =================
logRef.on("value", (snapshot) => {
    const data = snapshot.val();
    const listContainer = document.getElementById("chatListContainer");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    // Simpan data lama untuk komparasi deteksi chat masuk baru
    const dataLamaJumlah = Object.keys(semuaLogData).reduce((acc, curr) => acc + semuaLogData[curr].length, 0);
    
    semuaLogData = {}; // Reset container penampung data lokal lokal

    if (!data) {
        listContainer.innerHTML = `<div class="p-4 text-center text-slate-500 italic text-xs">Belum ada histori obrolan.</div>`;
        return;
    }

    // 1. KELOMPOKKAN PESAN BERDASARKAN DIGIT ANGKA NOMOR HP (SENDER ATAU RECEIVER)
    Object.keys(data).forEach(key => {
        const item = data[key];
        if (!item.tujuan) return;
        const nomorHP = item.tujuan.replace(/\D/g, ''); // Proteksi ambil karakter angka saja
        
        if (!semuaLogData[nomorHP]) {
            semuaLogData[nomorHP] = [];
        }
        semuaLogData[nomorHP].push(item);
    });

    // Hitung jumlah data baru setelah dikelompokkan
    const dataBaruJumlah = Object.keys(data).length;

    // --- LOGIKA PEMICU SUARA NOTIFIKASI REALTIME (HANYA UNTUK PESAN MASUK 📥) ---
    if (aplikasiSiapNotif && dataBaruJumlah > dataLamaJumlah) {
        const semuaKunci = Object.keys(data);
        const barisTerakhirGlobal = data[semuaKunci[semuaKunci.length - 1]];
        
        if (barisTerakhirGlobal && (barisTerakhirGlobal.status.includes("📥") || barisTerakhirGlobal.status === "📥 PESAN MASUK")) {
            mainkanNotifikasi(barisTerakhirGlobal.tujuan, barisTerakhirGlobal.pesan);
        }
    }
    
    // Ubah state menjadi aktif setelah trigger sinkronisasi pertama kali selesai dilakukan
    if (!aplikasiSiapNotif) {
        setTimeout(() => { aplikasiSiapNotif = true; }, 2000);
    }

    // 2. RENDER DAFTAR KOTAK MASUK DI PANEL SEBELAH KIRI
    Object.keys(semuaLogData).forEach(nomor => {
        const historiPesan = semuaLogData[nomor];
        const pesanTerakhir = historiPesan[historiPesan.length - 1]; // Mengambil baris pesan paling baru
        
        // Proses pencarian nama kontak di database internal
        const kontakDitemukan = kontak.find(k => k.nomor.replace(/\D/g, '') === nomor);
        const namaTampilan = kontakDitemukan ? kontakDitemukan.nama : `+${nomor}`;

        // Deteksi arah indikator pesan terakhir (Masuk atau Keluar)
        const isPesanMasuk = pesanTerakhir.status.includes("📥") || pesanTerakhir.status === "📥 PESAN MASUK";
        
        const divItem = document.createElement("div");
        divItem.className = `p-3 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-white/5 ${nomorChatAktif === nomor ? 'bg-white/10 hover:bg-white/10' : ''}`;
        
        // Pasang fungsi trigger klik untuk membuka isi room chat gelembung di sebelah kanan
        divItem.onclick = () => bukaRuangChat(nomor, namaTampilan);

        // Memotong tampilan jam dari string format waktu asli (misal "28-05-2026 17:06:26" diambil "17:06")
        let jamSaja = "";
        if (pesanTerakhir.waktu && pesanTerakhir.waktu.includes(" ")) {
            const partWaktu = pesanTerakhir.waktu.split(" ")[1];
            jamSaja = partWaktu.substring(0, 5);
        }

        divItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-semibold text-xs ${kontakDitemukan ? 'text-green-400' : 'text-slate-300'} truncate max-w-[140px]">${namaTampilan}</span>
                <span class="text-[9px] text-slate-500 font-mono">${jamSaja}</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span class="text-[10px]">${isPesanMasuk ? '📥' : '📤'}</span>
                <span class="truncate flex-1">${pesanTerakhir.pesan || '-'}</span>
            </div>
        `;
        listContainer.appendChild(divItem);
    });

    // Jika user sedang aktif membuka satu room obrolan, lakukan re-render otomatis agar chat mengalir live
    if (nomorChatAktif && semuaLogData[nomorChatAktif]) {
        renderBalonChat(nomorChatAktif);
    }
});

// FUNGSI UNTUK MERENDER GELEMBUNG BALON CHAT (BUBBLE CHAT)
function renderBalonChat(nomor) {
    const bubbleContainer = document.getElementById("chatBubbleContainer");
    if (!bubbleContainer) return;

    bubbleContainer.innerHTML = "";
    const listPesan = semuaLogData[nomor] || [];

    listPesan.forEach(msg => {
        const isPesanMasuk = msg.status.includes("📥") || msg.status === "📥 PESAN MASUK";
        
        const wrapper = document.createElement("div");
        // Kondisional Layout Posisi: Kiri untuk pesan masuk, Kanan untuk pesan balasan keluar
        wrapper.className = `flex w-full ${isPesanMasuk ? 'justify-start' : 'justify-end'}`;

        const bubble = document.createElement("div");
        bubble.className = `max-w-[80%] p-3 rounded-2xl text-xs shadow-md flex flex-col gap-1 ${
            isPesanMasuk 
            ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50' 
            : 'bg-green-600 text-white rounded-tr-none'
        }`;

        // Set status centang indikator balasan
        let centangStatus = "✓";
        if (msg.status.includes("✅") || msg.status === "✅ Berhasil") {
            centangStatus = "✓✓";
        } else if (msg.status.includes("❌") || msg.status.includes("Gagal")) {
            centangStatus = "⚠️";
        }

        bubble.innerHTML = `
            <div class="break-words leading-relaxed text-[11px]">${msg.pesan || ''}</div>
            <div class="text-[8px] self-end mt-1 font-mono opacity-60 flex items-center gap-1 select-none">
                <span>${msg.waktu}</span>
                <span>${isPesanMasuk ? '' : centangStatus}</span>
            </div>
        `;

        wrapper.appendChild(bubble);
        bubbleContainer.appendChild(wrapper);
    });

    // OPTIMASI SCROLL: Penyesuaian waktu tunda (100ms) untuk memastikan DOM selesai merender list panjang sebelum digulir penuh ke bawah
    setTimeout(() => {
        bubbleContainer.scrollTop = bubbleContainer.scrollHeight;
    }, 100);
}
// =============================================================================================


// ================= 🔐 UPGRADED FIREBASE AUTH SYSTEM =================
function checkAuth() {
    // Memantau sesi login secara realtime langsung dari server Firebase Auth
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Jika user berhasil terverifikasi (auth != null)
            document.getElementById("loginPage").classList.add("hidden-section");
            document.getElementById("mainDashboard").classList.remove("hidden-section");
        } else {
            // Jika user belum login atau sudah logout (auth == null)
            document.getElementById("loginPage").classList.remove("hidden-section");
            document.getElementById("mainDashboard").classList.add("hidden-section");
        }
    });
}

function handleLogin() {
    const email = document.getElementById("username").value.trim(); // Kolom username diisi email Firebase Anda
    const p = document.getElementById("password").value.trim();
    
    if (!email || !p) {
        return alert("Harap isi Email dan Password Anda!");
    }

    // Proses autentikasi langsung ke server Firebase Auth
    firebase.auth().signInWithEmailAndPassword(email, p)
      .then((userCredential) => {
          console.log("Login sukses ke Firebase Auth!");
      })
      .catch((error) => {
          console.error("Login Gagal:", error.message);
          alert("Akses Ditolak! Periksa kembali Email dan Password Firebase Anda.\nDetail: " + error.message);
      });
}

function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
        firebase.auth().signOut()
          .then(() => {
              console.log("Sesi logout berhasil dihapus.");
          })
          .catch((error) => {
              alert("Gagal melakukan logout: " + error.message);
          });
    }
}
// ======================================================================


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

// =============================================================================================
// ================= FITUR TAMBAHAN: BALAS LANGSUNG & KONTROL MOBILE ===========================
// =============================================================================================

// Mengontrol munculnya kolom input balasan ketika ruang chat dipilih
function bukaRuangChat(nomor, nama) {
    nomorChatAktif = nomor;
    
    document.getElementById("activeChatName").innerText = nama;
    document.getElementById("activeChatNumber").innerText = `+${nomor}`;
    
    // Sinkronisasi ke form input nomor utama di atas (untuk menjaga kecocokan sistem lama)
    if(document.getElementById("nomor")) {
        document.getElementById("nomor").value = nomor;
    }

    // TAMPILKAN KOLOM BALASAN LANGSUNG
    const replyArea = document.getElementById("quickReplyArea");
    if (replyArea) {
        replyArea.classList.remove("hidden");
    }

    renderBalonChat(nomor);

    // AUTOMATIC SMOOTH SCROLL KE AREA CHAT JIKA DIAKSES VIA SMARTPHONE / MOBILE LAYAR KECIL
    if (window.innerWidth < 768) {
        setTimeout(() => {
            const elHeader = document.getElementById("activeChatName");
            if (elHeader) {
                elHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    }
}

// FUNGSI BACK: MEMBANTU USER HP UNTUK KEMBALI KE DAFTAR KOTAK MASUK UTAMA DI ATAS
function kembaliKeDaftarChat() {
    nomorChatAktif = null;
    
    document.getElementById("activeChatName").innerText = "Pilih obrolan...";
    document.getElementById("activeChatNumber").innerText = "";
    
    // Sembunyikan kembali area balas cepat
    const replyArea = document.getElementById("quickReplyArea");
    if (replyArea) {
        replyArea.classList.add("hidden");
    }

    // Kembalikan isi container balon chat ke petunjuk default
    const bubbleContainer = document.getElementById("chatBubbleContainer");
    if (bubbleContainer) {
        bubbleContainer.innerHTML = `
            <div class="text-center text-slate-500 italic text-xs my-auto">
                Klik salah satu daftar chat di sebelah kiri untuk melihat detail histori pesan masuk dan balasan.
            </div>
        `;
    }

    // Scroll layar secara halus ke atas menjangkau panel List Kotak Masuk kembali
    const listTitle = document.querySelector("#chatListContainer");
    if (listTitle) {
        listTitle.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

// Fungsi eksekusi pengiriman pesan dari Quick Reply Box
async function kirimBalasanLangsung() {
    const inputBalas = document.getElementById("quickReplyMessage");
    const btnBalas = document.getElementById("btnQuickSend");
    
    if (!inputBalas || !nomorChatAktif) return;
    
    const pesanTeks = inputBalas.value.trim();
    if (!pesanTeks) return alert("Tulis isi pesan balasan terlebih dahulu!");

    // Kunci tombol balasan agar user tidak klik dua kali saat memproses
    btnBalas.disabled = true;
    btnBalas.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;

    // 1. Pindahkan pesan ke textarea utama di atas agar fungsi kirim() lama Anda memprosesnya dengan benar
    if (document.getElementById("pesan")) {
        document.getElementById("pesan").value = pesanTeks;
    }
    
    // 2. Kosongkan input file media di atas jika sebelumnya ada file tersisa (memastikan balasan ini murni teks cepat)
    if (fInput) {
        fInput.value = "";
        const img = document.getElementById("previewImg");
        const vid = document.getElementById("previewVideo");
        if(img) img.style.display = "none";
        if(vid) vid.style.display = "none";
    }

    // 3. Panggil fungsi kirim() orisinal milik Anda untuk menembak API Fonnte & Push ke Firebase
    await kirim();

    // 4. Reset & bersihkan kembali form balasan cepat setelah selesai dikirim
    inputBalas.value = "";
    btnBalas.disabled = false;
    btnBalas.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim`;
    
    // Kembalikan fokus kursor ke kolom balasan
    inputBalas.focus();
}

function handleQuickReplyKeyPress(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        kirimBalasanLangsung();
    }
}

// FUNGSI UTK REFRESH MANUAL DATA CHAT MASUK DARI FIREBASE
function manualRefreshChat() {
    const icon = document.getElementById("iconRefresh");
    if (icon) {
        icon.classList.add("animate-spin", "text-green-400"); 
    }

    logRef.once("value").then((snapshot) => {
        if (icon) {
            setTimeout(() => {
                icon.classList.remove("animate-spin", "text-green-400");
            }, 600); 
        }
    }).catch((err) => {
        console.error("Gagal refresh data:", err);
        if (icon) icon.classList.remove("animate-spin", "text-green-400");
    });
}

// FUNGSI UNTUK MEMICU SUARA NOTIFIKASI DI DALAM APK ANDROID
function mainkanNotifikasi(nomor, pesan) {
    if (audioNotif) {
        audioNotif.play().catch(err => console.log("Gagal memutar audio di APK:", err));
    }
    console.log(`Notifikasi Pesan Masuk Berhasil Dipicu untuk: +${nomor}`);
}

// Jalankan pengecekan status masuk admin sistem terintegrasi Firebase Auth
checkAuth();

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

// Variabel global baru untuk mengelola state tampilan room chat interaktif
let nomorChatAktif = null;
let semuaLogData = {};

// --- VARIABLE STATE UNTUK AUDIO NOTIFIKASI MASUK ---
let aplikasiSiapNotif = false; // Mengamankan agar pesan lama tidak berbunyi saat APK baru dibuka
const audioNotif = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav"); 
// ---------------------------------------------------

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
    semuaLogData = {}; 

    if (!data) {
        listContainer.innerHTML = `<div class="p-4 text-center text-slate-500 italic text-xs">Belum ada histori obrolan.</div>`;
        return;
    }

    let adaPesanMasukBaru = false;
    let pengirimTerakhir = "";
    let isiPesanTerakhir = "";

    // 1. KELOMPOKKAN PESAN BERDASARKAN DIGIT ANGKA NOMOR HP
    Object.keys(data).forEach(key => {
        const item = data[key];
        if (!item.tujuan) return;
        const nomorHP = item.tujuan.replace(/\D/g, ''); 
        
        if (!semuaLogData[nomorHP]) {
            semuaLogData[nomorHP] = [];
        }
        semuaLogData[nomorHP].push(item);

        // SYSTEM DETEKSI STRUKTUR PESAN MASUK BARU UNTUK TRIGGER AUDIO
        const isPesanMasuk = item.status && (item.status.includes("📥") || item.status === "📥 PESAN MASUK");
        if (aplikasiSiapNotif && isPesanMasuk && !item.sudahNotif) {
            adaPesanMasukBaru = true;
            pengirimTerakhir = nomorHP;
            isiPesanTerakhir = item.pesan || "Mengirim media gambar";
            
            // Tandai di database Firebase agar tidak terus menerus berbunyi
            logRef.child(key).update({ sudahNotif: true });
        }
    });

    // Jalankan pemicu suara jika terdeteksi data log chat masuk yang fresh
    if (adaPesanMasukBaru) {
        mainkanNotifikasi(pengirimTerakhir, isiPesanTerakhir);
    }

    // 2. RENDER DAFTAR KOTAK MASUK DI PANEL SEBELAH KIRI
    Object.keys(semuaLogData).forEach(nomor => {
        const historiPesan = semuaLogData[nomor];
        const pesanTerakhir = historiPesan[historiPesan.length - 1]; 
        
        const kontakDitemukan = kontak.find(k => k.nomor.replace(/\D/g, '') === nomor);
        const namaTampilan = kontakDitemukan ? kontakDitemukan.nama : `+${nomor}`;

        const isPesanMasuk = pesanTerakhir.status.includes("📥") || pesanTerakhir.status === "📥 PESAN MASUK";
        
        const divItem = document.createElement("div");
        divItem.className = `p-3 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-white/5 ${nomorChatAktif === nomor ? 'bg-white/10 hover:bg-white/10' : ''}`;
        
        divItem.onclick = () => bukaRuangChat(nomor, namaTampilan);

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

    // Aktifkan gerbang status siap notifikasi setelah 2 detik siklus loading awal data selesai
    if (!aplikasiSiapNotif) {
        setTimeout(() => {
            aplikasiSiapNotif = true;
        }, 2000);
    }
});

// FUNGSI UNTUK MERENDER GELEMBUNG BALON CHAT (BUBBLE CHAT) - UPDATE PREVIEW MEDIA
function renderBalonChat(nomor) {
    const bubbleContainer = document.getElementById("chatBubbleContainer");
    if (!bubbleContainer) return;

    bubbleContainer.innerHTML = "";
    const listPesan = semuaLogData[nomor] || [];

    listPesan.forEach(msg => {
        const isPesanMasuk = msg.status.includes("📥") || msg.status === "📥 PESAN MASUK";
        
        const wrapper = document.createElement("div");
        wrapper.className = `flex w-full ${isPesanMasuk ? 'justify-start' : 'justify-end'}`;

        const bubble = document.createElement("div");
        bubble.className = `max-w-[80%] p-3 rounded-2xl text-xs shadow-md flex flex-col gap-2 ${
            isPesanMasuk 
            ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50' 
            : 'bg-green-600 text-white rounded-tr-none'
        }`;

        // --- SISTEM DETEKSI OTOMATIS LINK GAMBAR / VIDEO ---
        let isiPesan = msg.pesan || '';
        let mediaHTML = '';

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urlsFound = isiPesan.match(urlRegex);

        if (urlsFound) {
            urlsFound.forEach(url => {
                const cleanUrl = url.trim();
                
                if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || (cleanUrl.includes("cloudinary.com") && !cleanUrl.match(/\.(mp4|webm|ogg|mov)/i))) {
                    mediaHTML += `
                        <div class="mt-1 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                            <img src="${cleanUrl}" class="max-w-full h-auto object-cover max-h-60 mx-auto cursor-pointer" onclick="window.open('${cleanUrl}', '_blank')" alt="Media">
                        </div>`;
                    isiPesan = isiPesan.replace(url, ''); 
                } 
                else if (cleanUrl.match(/\.(mp4|webm|ogg|mov)/i)) {
                    mediaHTML += `
                        <div class="mt-1 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                            <video src="${cleanUrl}" controls class="max-w-full max-h-60 mx-auto"></video>
                        </div>`;
                    isiPesan = isiPesan.replace(url, ''); 
                }
            });
        }
        // ----------------------------------------------------

        let centangStatus = "✓";
        if (msg.status.includes("✅") || msg.status === "✅ Berhasil") {
            centangStatus = "✓✓";
        } else if (msg.status.includes("❌") || msg.status.includes("Gagal")) {
            centangStatus = "⚠️";
        }

        bubble.innerHTML = `
            ${mediaHTML}
            <div class="break-words leading-relaxed text-[11px]">${isiPesan.trim() || (mediaHTML ? '' : '-')}</div>
            <div class="text-[8px] self-end mt-1 font-mono opacity-60 flex items-center gap-1 select-none">
                <span>${msg.waktu}</span>
                <span>${isPesanMasuk ? '' : centangStatus}</span>
            </div>
        `;

        wrapper.appendChild(bubble);
        bubbleContainer.appendChild(wrapper);
    });

    setTimeout(() => {
        bubbleContainer.scrollTop = bubbleContainer.scrollHeight;
    }, 100);
}

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
        const indexAsli = kontak.findIndex(item => item.id === k.id);
        opt.value = indexAsli;
        opt.text = `${k.nama} (${k.nomor})`;
        select.appendChild(opt);
    });
}

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

// Menghubungkan trigger otomatis isi data input nomor dari dropdown lama Anda
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
    let statusLog = "❌ Gagal"; 

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

function hapusSemuaLog() {
    if (confirm("Hapus seluruh data riwayat pengiriman di cloud server?")) {
        logRef.remove().catch(err => alert("Gagal membersihkan log: " + err.message));
    }
}

// =============================================================================================
// ================= FITUR TAMBAHAN: BALAS LANGSUNG & KONTROL MOBILE ===========================
// =============================================================================================

function bukaRuangChat(nomor, nama) {
    nomorChatAktif = nomor;
    
    document.getElementById("activeChatName").innerText = nama;
    document.getElementById("activeChatNumber").innerText = `+${nomor}`;
    
    if(document.getElementById("nomor")) {
        document.getElementById("nomor").value = nomor;
    }

    const replyArea = document.getElementById("quickReplyArea");
    if (replyArea) {
        replyArea.classList.remove("hidden");
    }

    renderBalonChat(nomor);

    if (window.innerWidth < 768) {
        setTimeout(() => {
            const elHeader = document.getElementById("activeChatName");
            if (elHeader) {
                elHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    }
}

function kembaliKeDaftarChat() {
    nomorChatAktif = null;
    
    document.getElementById("activeChatName").innerText = "Pilih obrolan...";
    document.getElementById("activeChatNumber").innerText = "";
    
    const replyArea = document.getElementById("quickReplyArea");
    if (replyArea) {
        replyArea.classList.add("hidden");
    }

    const bubbleContainer = document.getElementById("chatBubbleContainer");
    if (bubbleContainer) {
        bubbleContainer.innerHTML = `
            <div class="text-center text-slate-500 italic text-xs my-auto">
                Klik salah satu daftar chat di sebelah kiri untuk melihat detail histori pesan masuk dan balasan.
            </div>
        `;
    }

    const listTitle = document.querySelector("#chatListContainer");
    if (listTitle) {
        listTitle.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

async function kirimBalasanLangsung() {
    const inputBalas = document.getElementById("quickReplyMessage");
    const btnBalas = document.getElementById("btnQuickSend");
    
    if (!inputBalas || !nomorChatAktif) return;
    
    const pesanTeks = inputBalas.value.trim();
    if (!pesanTeks) return alert("Tulis isi pesan balasan terlebih dahulu!");

    btnBalas.disabled = true;
    btnBalas.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;

    if (document.getElementById("pesan")) {
        document.getElementById("pesan").value = pesanTeks;
    }
    
    if (fInput) {
        fInput.value = "";
        const img = document.getElementById("previewImg");
        const vid = document.getElementById("previewVideo");
        if(img) img.style.display = "none";
        if(vid) vid.style.display = "none";
    }

    await kirim();

    inputBalas.value = "";
    btnBalas.disabled = false;
    btnBalas.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim`;
    
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

// Jalankan pengecekan status masuk admin sistem
checkAuth();

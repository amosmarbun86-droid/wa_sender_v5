document.addEventListener("DOMContentLoaded", () => {

    const fInput = document.getElementById("file");

    if (fInput) {

        fInput.addEventListener("change", function () {

            const file = this.files[0];

            if (!file) return;

            const url = URL.createObjectURL(file);

            const img =
                document.getElementById("previewImg");

            const vid =
                document.getElementById("previewVideo");

            if (file.type.startsWith("image")) {

                img.src = url;

                img.style.display = "block";

                vid.style.display = "none";

            } else {

                vid.src = url;

                vid.style.display = "block";

                img.style.display = "none";
            }
        });
    }
});

async function kirim() {

    const fInput =
        document.getElementById("file");

    const st =
        document.getElementById("status");

    const bt =
        document.getElementById("btnKirim");

    const no =
        document.getElementById("nomor")
        .value.trim();

    const ps =
        document.getElementById("pesan")
        .value.trim();

    const fl = fInput.files[0];

    if (!no)
        return alert("Nomor tujuan wajib diisi!");

    bt.disabled = true;

    st.innerText =
        "⏳ Sedang memproses media...";

    let iK =
        document.getElementById("kontakSelect")
        .value;

    let sapa =
        (iK !== "" && kontak[iK])
        ? kontak[iK].nama
        : "Bapak/Ibu";

    let pFinal =
        ps.replace(/{{nama}}/g, sapa);

    let mUrl = "";

    let upOk = false;

    try {

        if (fl) {

            let fd = new FormData();

            fd.append("file", fl);

            fd.append(
                "upload_preset",
                UPLOAD_PRESET
            );

            let up = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
                {
                    method: "POST",
                    body: fd
                }
            );

            let rC = await up.json();

            if (rC.secure_url) {

                mUrl = rC.secure_url;

                upOk = true;
            }
        }

        let msgFull =
            upOk
            ? (pFinal + "\n\n" + mUrl)
            : pFinal;

        st.innerText =
            "📤 Mengirim pesan ke WhatsApp...";

        let bdy = {
            target: no,
            message: msgFull
        };

        if (upOk) {

            bdy.url = mUrl;

            bdy.filename = fl.name;
        }

        let res = await fetch(
            "https://api.fonnte.com/send",
            {
                method: "POST",

                headers: {
                    "Authorization": API_KEY_FONNTE,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(bdy)
            }
        );

        let d = await res.json();

        if (d.status) {

            st.innerText =
                "✅ Pesan berhasil dikirim!";

            alert("Pesan Berhasil Terkirim!");

        } else {

            throw new Error("Gagal Kirim");
        }

    } catch (err) {

        console.error(err);

        st.innerText =
            "❌ Terjadi kesalahan pengiriman.";
    }

    finally {

        bt.disabled = false;
    }
}

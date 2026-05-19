let kontak = JSON.parse(localStorage.getItem("kontak")) || [];

function renderKontak() {

    const select =
        document.getElementById("kontakSelect");

    if (!select) return;

    select.innerHTML =
        `<option value="">-- Pilih Kontak --</option>`;

    kontak.forEach((k, i) => {

        let opt = document.createElement("option");

        opt.value = i;

        opt.text = `${k.nama} (${k.nomor})`;

        select.appendChild(opt);
    });
}

function tambahKontak() {

    let n =
        document.getElementById("namaKontak")
        .value.trim();

    let num =
        document.getElementById("nomorKontak")
        .value.trim();

    if (!n || !num)
        return alert("Lengkapi nama dan nomor!");

    if(num.startsWith("0"))
        num = "62" + num.slice(1);

    if(num.startsWith("8"))
        num = "62" + num;

    kontak.push({
        nama: n,
        nomor: num
    });

    saveAndRefresh();

    document.getElementById("namaKontak").value = "";

    document.getElementById("nomorKontak").value = "";
}

function hapusSatuKontak() {

    let i =
        document.getElementById("kontakSelect").value;

    if (i === "")
        return alert("Pilih kontak yang ingin dihapus!");

    if (confirm(`Hapus kontak ${kontak[i].nama}?`)) {

        kontak.splice(i, 1);

        saveAndRefresh();

        document.getElementById("nomor").value = "";
    }
}

function hapusSemuaKontak() {

    if (confirm("Hapus seluruh database kontak?")) {

        kontak = [];

        saveAndRefresh();

        document.getElementById("nomor").value = "";
    }
}

function saveAndRefresh() {

    localStorage.setItem(
        "kontak",
        JSON.stringify(kontak)
    );

    renderKontak();
}

function isiNomor() {

    let i =
        document.getElementById("kontakSelect").value;

    if (i !== "") {

        document.getElementById("nomor").value =
            kontak[i].nomor;
    }
}

function importCSV() {

    const f =
        document.getElementById("csvFile").files[0];

    if (!f)
        return alert("Pilih file CSV dulu!");

    const r = new FileReader();

    r.onload = function(e) {

        const rows = e.target.result.split("\n");

        rows.forEach(row => {

            let [nama, nomor] = row.split(",");

            if (nama && nomor) {

                let val = nomor.trim();

                if(val.startsWith("0")) {
                    val = "62" + val.slice(1);
                }

                kontak.push({
                    nama: nama.trim(),
                    nomor: val
                });
            }
        });

        saveAndRefresh();
    };

    r.readAsText(f);
}

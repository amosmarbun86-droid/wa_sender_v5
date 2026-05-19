function checkAuth() {

    const isLogin = localStorage.getItem("login");

    if (isLogin === "true") {

        document.getElementById("loginPage")
            .classList.add("hidden-section");

        document.getElementById("mainDashboard")
            .classList.remove("hidden-section");

        renderKontak();

    } else {

        document.getElementById("loginPage")
            .classList.remove("hidden-section");

        document.getElementById("mainDashboard")
            .classList.add("hidden-section");
    }
}

function handleLogin() {

    const u = document.getElementById("username")
        .value.trim();

    const p = document.getElementById("password")
        .value.trim();

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

document.getElementById("loginForm").addEventListener("submit", function (e) {

    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "admin" && password === "tyltadmin") {

        // Save login
        sessionStorage.setItem("loggedIn", "true");

        // Go to dashboard
        window.location.href = "index.html";

    } else {

        alert("Invalid Username or Password");

    }

});
// login.js

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const errorMsg = document.getElementById("errorMsg");

      const user = {
        email: "admin@petride.com",
        password: "123456",
      };

      if (email === user.email && password === user.password) {
        // Salvar informações de login no navegador
        localStorage.setItem("loggedIn", "true");
        // Redireciona para a página principal ou área logada
        window.location.href = "index.html";
      } else {
        errorMsg.textContent = "Email ou senha incorretos!";
      }
    });
  }
});

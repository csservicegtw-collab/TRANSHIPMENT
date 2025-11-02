function login() {
  const id = document.getElementById("userId").value.trim();
  const pass = document.getElementById("userPass").value.trim();

  const validID = "gateway";
  const validPass = "bismillah";

  if (id === validID && pass === validPass) {
    localStorage.setItem("ext_logged_in", "true");
    window.location.href = "dashboard.html";
  } else {
    alert("ID atau Password salah!");
  }
}

function checkAuth() {
  if (!localStorage.getItem("ext_logged_in")) {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("ext_logged_in");
  window.location.href = "login.html";
}

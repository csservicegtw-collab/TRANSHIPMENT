// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "ISI_DENGAN_KEY_ANDA",
  authDomain: "ISI.firebaseapp.com",
  projectId: "ISI",
  storageBucket: "ISI.appspot.com",
  messagingSenderId: "ISI",
  appId: "ISI",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// --- Fungsi login internal ---
function login(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      localStorage.setItem("loggedIn", "true");
      window.location.href = "dashboard.html";
    })
    .catch((err) => alert("Login gagal: " + err.message));
}

// --- Proteksi halaman internal ---
if (window.location.pathname.includes("dashboard.html") && !localStorage.getItem("loggedIn")) {
  window.location.href = "login.html";
}

// --- Logout ---
function logout() {
  auth.signOut().then(() => {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
  });
}

// external/assets/js/auth.js
(function () {
  "use strict";

  // key session login
  const KEY = "ext_logged_in";

  // ✅ helper login check
  window.isLoggedIn = function () {
    return sessionStorage.getItem(KEY) === "true";
  };

  // ✅ redirect kalau belum login
  window.checkAuth = function () {
    if (!window.isLoggedIn()) {
      window.location.href = "login.html";
    }
  };

  // ✅ logout universal
  window.logout = function () {
    sessionStorage.removeItem(KEY);
    // optional: hapus data lain yg berkaitan external
    // sessionStorage.clear();
    window.location.href = "login.html";
  };
})();

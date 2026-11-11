/**
 * PORTAL ADMINISTRASI GURU SD
 * File: js/config.js
 * Deskripsi: Konfigurasi Endpoint Google Apps Script (Backend) dan Firebase Authentication.
 */

var CONFIG = {
  // =========================================================================
  // 1. TAUTAN WEB APP GOOGLE APPS SCRIPT (API BACKEND & GOOGLE SHEETS)
  // Ganti dengan URL Deployment Web App Anda setelah menjalankan 'Deploy as Web App' di GAS:
  // Contoh: "https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXX/exec"
  // =========================================================================
  GAS_API_URL: "",

  // =========================================================================
  // 2. SAKLAR MODE PREVIEW (OFFLINE TEST DATA)
  // Set true untuk pengujian cepat di browser dengan data simulasi.
  // Set false jika GAS_API_URL sudah terisi untuk terhubung langsung ke Google Sheets.
  // =========================================================================
  IS_PREVIEW_MODE: true,

  // =========================================================================
  // 3. KONFIGURASI FIREBASE AUTHENTICATION (GOOGLE SIGN-IN)
  // Dapatkan dari Firebase Console > Project Settings > General > Your Apps > Web app
  // =========================================================================
  FIREBASE_CONFIG: {
    apiKey: "AIzaSy_YOUR_FIREBASE_API_KEY",
    authDomain: "portal-guru-sd-ambulu.firebaseapp.com",
    projectId: "portal-guru-sd-ambulu",
    storageBucket: "portal-guru-sd-ambulu.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  },

  APP_TITLE: "Portal Administrasi Guru SD",
  DEFAULT_ACADEMIC_YEAR: "2026/2027",
  DEFAULT_SEMESTER: "1"
};

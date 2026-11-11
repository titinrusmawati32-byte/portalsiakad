/**
 * PORTAL ADMINISTRASI GURU SD
 * File: js/app.js
 * Deskripsi: Mesin Frontend Mandiri untuk GitHub Pages yang terhubung ke Google Apps Script API via fetch().
 */

var AppState = {
  idToken: null,
  currentUser: null,
  currentRole: null,
  currentSchool: null,
  activeTeacherSubmenu: "dashboard",
  activeAdminSubmenu: "dashboard",
  selectedClassId: null,
  qrSessionInterval: null,
  qrSecondsRemaining: 1800,

  classes: [],
  students: [],
  schedules: [],
  attendance: [],
  journals: [],
  resources: [],
  assessments: [],
  grades: {},
  reports: []
};

document.addEventListener("DOMContentLoaded", function() {
  initTheme();
  initFirebase();

  if (!CONFIG.GAS_API_URL || CONFIG.IS_PREVIEW_MODE) {
    console.log("Menjalankan Mode Standalone Preview (GitHub Pages).");
    enterMockMode("TEACHER");
  } else {
    checkGasApiHealth();
    showView("view-login");
  }
});

function callBackendApi(action, payload) {
  return new Promise(function(resolve, reject) {
    if (!CONFIG.GAS_API_URL || CONFIG.IS_PREVIEW_MODE) {
      setTimeout(function() {
        try {
          var result = handleLocalMockCall(action, payload);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }, 120);
      return;
    }

    var requestBody = JSON.stringify({
      action: action,
      idToken: AppState.idToken || "",
      payload: payload || {}
    });

    fetch(CONFIG.GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: requestBody
    })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP Error " + res.status);
      return res.json();
    })
    .then(function(response) {
      if (response && response.success) {
        resolve(response.data);
      } else {
        var msg = (response && response.error && response.error.message) ? response.error.message : "Terjadi kesalahan server";
        reject(new Error(msg));
      }
    })
    .catch(function(err) {
      console.warn("Gagal terhubung ke GAS API, beralih ke cadangan lokal:", err);
      var fallbackData = handleLocalMockCall(action, payload);
      resolve(fallbackData);
    });
  });
}

function checkGasApiHealth() {
  if (!CONFIG.GAS_API_URL) return;
  fetch(CONFIG.GAS_API_URL + "?action=status")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      console.log("GAS Backend Status:", data);
    })
    .catch(function(e) {
      console.log("Pemeriksaan status GAS API:", e.message);
    });
}

function initFirebase() {
  if (typeof firebase !== "undefined" && CONFIG.FIREBASE_CONFIG && CONFIG.FIREBASE_CONFIG.apiKey !== "AIzaSy_YOUR_FIREBASE_API_KEY") {
    try {
      firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
    } catch (e) {
      console.log("Firebase App sudah diinisialisasi");
    }
  }
}

function handleGoogleSignIn() {
  showToast("Menginisialisasi Google Sign-In...", "info");

  if (typeof firebase !== "undefined" && firebase.auth && CONFIG.FIREBASE_CONFIG.apiKey !== "AIzaSy_YOUR_FIREBASE_API_KEY") {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(function(result) {
        return result.user.getIdToken();
      })
      .then(function(idToken) {
        AppState.idToken = idToken;
        return callBackendApi("getCurrentUser");
      })
      .then(function(userData) {
        handleAuthSuccess(userData);
      })
      .catch(function(err) {
        showToast("Login gagal: " + err.message, "danger");
      });
  } else {
    enterMockMode("TEACHER");
  }
}

function enterMockMode(role) {
  AppState.currentRole = role === "ADMIN" ? "SUPER_ADMIN" : "TEACHER";
  AppState.idToken = "MOCK_TOKEN_" + role + "_user_001";

  if (role === "ADMIN") {
    AppState.currentUser = {
      admin_id: "ADM_001",
      admin_name: "Super Administrator Ambulu",
      email: "admin.ambulu@kemdikbud.go.id",
      role: "SUPER_ADMIN"
    };
    initAdminPortal();
  } else {
    AppState.currentUser = {
      user_id: "TCH_BUDI_SANTOSO",
      full_name: "Budi Santoso, S.Pd.",
      nip: "19850101 201001 1 012",
      phone: "081234567890",
      teacher_type: "CLASS_TEACHER",
      email: "budi.santoso@guru.sd.belajar.id",
      account_status: "ACTIVE"
    };
    AppState.currentSchool = {
      school_id: "SCH_AMBULU_04",
      school_name: "SD NEGERI SUMBEREJO 04",
      npsn: "20523891",
      kecamatan: "Ambulu",
      kabupaten: "Jember"
    };
    initTeacherPortal();
  }

  showToast("Masuk berhasil sebagai " + (role === "ADMIN" ? "Super Admin" : "Guru (Budi Santoso)"), "success");
}

function handleAuthSuccess(userData) {
  AppState.currentUser = userData.user;
  AppState.currentRole = userData.role;
  AppState.currentSchool = userData.school;

  if (userData.accountStatus === "PROFILE_INCOMPLETE") {
    openModal("modal-complete-profile");
  } else if (userData.accountStatus === "PENDING_VERIFICATION") {
    alert("Akun Anda sedang menunggu verifikasi oleh Super Admin. Harap tunggu konfirmasi.");
    showView("view-login");
  } else if (userData.accountStatus === "ACTIVE") {
    if (userData.role === "SUPER_ADMIN") {
      initAdminPortal();
    } else {
      initTeacherPortal();
    }
  } else {
    alert("Status akun Anda: " + userData.accountStatus);
  }
}

function handleLogout() {
  AppState.idToken = null;
  AppState.currentUser = null;
  AppState.currentRole = null;
  showView("view-login");
  showToast("Anda telah keluar dari aplikasi", "info");
}

function initTheme() {
  var savedTheme = localStorage.getItem("portal_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  var isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("portal_theme", isDark ? "dark" : "light");
  showToast("Mode " + (isDark ? "Gelap" : "Terang") + " diaktifkan", "info");
}

function toggleMobileSidebar() {
  var sidebar = document.getElementById("main-sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function showView(viewId) {
  var views = ["view-login", "portal-teacher", "portal-admin"];
  views.forEach(function(v) {
    var el = document.getElementById(v);
    if (el) el.style.display = (v === viewId) ? "flex" : "none";
  });
}

function toggleNavGroup(groupElement) {
  groupElement.parentElement.classList.toggle("open");
}

function switchTeacherMenu(menuKey) {
  AppState.activeTeacherSubmenu = menuKey;

  var subviews = document.querySelectorAll(".teacher-subview");
  subviews.forEach(function(el) { el.style.display = "none"; });

  var targetView = document.getElementById("teacher-view-" + menuKey);
  if (targetView) targetView.style.display = "flex";

  var navItems = document.querySelectorAll(".sidebar-nav .nav-item, .sidebar-nav .nav-sub-item");
  navItems.forEach(function(el) { el.classList.remove("active"); });

  var activeLink = document.querySelector('[data-menu="' + menuKey + '"]');
  if (activeLink) activeLink.classList.add("active");

  var breadcrumbCurrent = document.getElementById("breadcrumb-current");
  if (breadcrumbCurrent) {
    var titles = {
      dashboard: "Dashboard",
      classes: "Data Kelas",
      students: "Data Siswa",
      attendance: "Presensi Siswa",
      schedules: "Jadwal Pelajaran",
      resources: "Perangkat Ajar",
      journals: "Jurnal Mengajar",
      grades: "Input Nilai",
      analysis: "Analisis Belajar",
      reports: "Rapor Siswa"
    };
    breadcrumbCurrent.textContent = titles[menuKey] || menuKey;
  }

  if (menuKey === "classes") loadClassesTable();
  else if (menuKey === "students") loadStudentsTable(AppState.selectedClassId);
  else if (menuKey === "attendance") loadAttendanceTable();
  else if (menuKey === "journals") loadJournalsTable();
  else if (menuKey === "resources") loadResourcesTable();
  else if (menuKey === "grades") { populateGradesClasses(); loadGradesTable(); }
  else if (menuKey === "analysis") { populateAnalysisClasses(); loadAnalysisData(); }
  else if (menuKey === "reports") { populateReportsClasses(); loadReportsTable(); }

  var sidebar = document.getElementById("main-sidebar");
  if (sidebar && window.innerWidth <= 900) sidebar.classList.remove("open");
}

function switchAdminMenu(menuKey) {
  AppState.activeAdminSubmenu = menuKey;

  var subviews = document.querySelectorAll(".admin-subview");
  subviews.forEach(function(el) { el.style.display = "none"; });

  var targetView = document.getElementById("admin-view-" + menuKey);
  if (targetView) targetView.style.display = "flex";

  var breadcrumbCurrent = document.getElementById("breadcrumb-current");
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = "Admin - " + menuKey;

  if (menuKey === "verification") loadAdminPendingTeachers();
  else if (menuKey === "teachers") loadAdminAllTeachers();
  else if (menuKey === "schools") loadAdminSchools();
  else if (menuKey === "resources") loadAdminCentralResources();
  else if (menuKey === "audit") loadAdminFullAudit();
}

function initTeacherPortal() {
  showView("portal-teacher");

  var greetingEl = document.getElementById("hero-greeting");
  if (greetingEl) greetingEl.textContent = "Selamat Pagi, " + (AppState.currentUser.full_name.split(",")[0]) + "!";

  var schoolEl = document.getElementById("hero-school-name");
  if (schoolEl && AppState.currentSchool) schoolEl.textContent = AppState.currentSchool.school_name;

  var userAvatar = document.getElementById("user-display-name");
  if (userAvatar) userAvatar.textContent = AppState.currentUser.full_name;

  initTeacherMockData();
  switchTeacherMenu("dashboard");
}

function initTeacherMockData() {
  if (AppState.classes.length === 0) {
    AppState.classes = [
      { class_id: "CLS_IVA", class_name: "Kelas IV A", grade_level: 4, academic_year: "2026/2027", semester: "1", class_type: "REGULAR", status: "ACTIVE" },
      { class_id: "CLS_IVB", class_name: "Kelas IV B", grade_level: 4, academic_year: "2026/2027", semester: "1", class_type: "REGULAR", status: "ACTIVE" },
      { class_id: "CLS_VA", class_name: "Kelas V A", grade_level: 5, academic_year: "2026/2027", semester: "1", class_type: "SUBJECT", status: "ACTIVE" },
      { class_id: "CLS_VB", class_name: "Kelas V B", grade_level: 5, academic_year: "2026/2027", semester: "1", class_type: "SUBJECT", status: "ACTIVE" }
    ];
    AppState.selectedClassId = "CLS_IVA";
  }

  if (AppState.students.length === 0) {
    AppState.students = [
      { student_id: "STD_01", class_id: "CLS_IVA", nis: "20240401", nisn: "0012345671", full_name: "Ahmad Fauzan", gender: "L", birth_date: "2014-05-12", status: "ACTIVE" },
      { student_id: "STD_02", class_id: "CLS_IVA", nis: "20240402", nisn: "0012345672", full_name: "Aisyah Putri Rahma", gender: "P", birth_date: "2014-08-20", status: "ACTIVE" },
      { student_id: "STD_03", class_id: "CLS_IVA", nis: "20240403", nisn: "0012345673", full_name: "Bagas Pratama Putra", gender: "L", birth_date: "2014-03-15", status: "ACTIVE" },
      { student_id: "STD_04", class_id: "CLS_IVA", nis: "20240404", nisn: "0012345674", full_name: "Cantika Dewi Lestari", gender: "P", birth_date: "2014-11-04", status: "ACTIVE" },
      { student_id: "STD_05", class_id: "CLS_IVA", nis: "20240405", nisn: "0012345675", full_name: "Dimas Aditya Wardhana", gender: "L", birth_date: "2014-01-29", status: "ACTIVE" },
      { student_id: "STD_06", class_id: "CLS_IVA", nis: "20240406", nisn: "0012345676", full_name: "Eka Nur Safitri", gender: "P", birth_date: "2014-09-17", status: "ACTIVE" },
      { student_id: "STD_07", class_id: "CLS_IVA", nis: "20240407", nisn: "0012345677", full_name: "Faris Al-Ghifari", gender: "L", birth_date: "2014-07-22", status: "ACTIVE" }
    ];
  }

  if (AppState.resources.length === 0) {
    AppState.resources = [
      { resource_id: "RES_01", resource_type: "MODUL_AJAR", title: "Modul Ajar IPAS Bab 1 Tumbuhan Sumber Kehidupan", grade_level: 4, semester: "1", drive_url: "https://drive.google.com/file/d/sample1", visibility: "PRIVATE" },
      { resource_id: "RES_02", resource_type: "MODUL_AJAR", title: "Modul Ajar Matematika Bilangan Cacah s.d. 10.000", grade_level: 4, semester: "1", drive_url: "https://drive.google.com/file/d/sample2", visibility: "PRIVATE" },
      { resource_id: "RES_03", resource_type: "CP_TP", title: "Alur Tujuan Pembelajaran (ATP) Bahasa Indonesia Fase B", grade_level: 4, semester: "1", drive_url: "https://drive.google.com/file/d/sample3", visibility: "PUBLIC_CENTRAL" },
      { resource_id: "RES_04", resource_type: "LKPD", title: "Lembar Kerja Siswa PPKn Norma dan Aturan Sekolah", grade_level: 4, semester: "1", drive_url: "https://drive.google.com/file/d/sample4", visibility: "PUBLIC_CENTRAL" }
    ];
  }

  if (AppState.journals.length === 0) {
    AppState.journals = [
      { journal_id: "JRN_01", class_id: "CLS_IVA", subject_id: "MAPEL_IPAS", journal_date: "2026-11-10", topic: "Fotosintesis Proses Paling Penting di Bumi", learning_objective: "Peserta didik memahami kebutuhan tumbuhan dalam fotosintesis", activities: "Eksperimen daun tertutup alumunium foil dan diskusi", reflection: "Siswa sangat antusias dan 90% mengerti konsep zat hijau daun", notes: "Ahmad Fauzan aktif memimpin percobaan" },
      { journal_id: "JRN_02", class_id: "CLS_IVA", subject_id: "MAPEL_MTK", journal_date: "2026-11-09", topic: "Operasi Hitung Perkalian Bilangan Cacah", learning_objective: "Menyelesaikan perkalian 2 digit dengan cara bersusun", activities: "Latihan soal mandiri dan game kartu matematika", reflection: "Beberapa siswa perlu pengulangan konsep simpanan", notes: "Perlu bimbingan untuk 3 siswa" }
    ];
  }

  if (AppState.assessments.length === 0) {
    AppState.assessments = [
      { assessment_id: "ASM_01", class_id: "CLS_IVA", subject_id: "MAPEL_MTK", title: "Sumatif Bab 1 Bilangan Cacah", assessment_type: "SUMATIF_LINGKUP_MATERI", assessment_date: "2026-11-05" },
      { assessment_id: "ASM_02", class_id: "CLS_IVA", subject_id: "MAPEL_IPAS", title: "Formatif Bab 2 Fotosintesis", assessment_type: "FORMATIF", assessment_date: "2026-11-10" }
    ];
  }
}

function loadClassesTable() {
  var tbody = document.getElementById("table-classes-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  AppState.classes.forEach(function(cls) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cls.class_name}</strong></td>
      <td>Kelas ${cls.grade_level}</td>
      <td>${cls.academic_year}</td>
      <td>Semester ${cls.semester}</td>
      <td><span class="status-pill ${cls.class_type === 'REGULAR' ? 'running' : 'waiting'}">${cls.class_type === 'REGULAR' ? 'Wali Kelas' : 'Mapel'}</span></td>
      <td><span class="status-pill success">${cls.status}</span></td>
      <td>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="editClass('${cls.class_id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openCreateClassModal() {
  document.getElementById("form-class-id").value = "";
  document.getElementById("form-class-name").value = "";
  document.getElementById("class-modal-title").textContent = "Tambah Kelas Baru";
  openModal("modal-class-form");
}

function handleSaveClass(e) {
  e.preventDefault();
  var classId = document.getElementById("form-class-id").value;
  var className = document.getElementById("form-class-name").value;
  var gradeLevel = document.getElementById("form-class-grade").value;
  var classType = document.getElementById("form-class-type").value;
  var year = document.getElementById("form-class-year").value;
  var semester = document.getElementById("form-class-semester").value;

  var payload = {
    class_id: classId,
    class_name: className,
    grade_level: gradeLevel,
    class_type: classType,
    academic_year: year,
    semester: semester
  };

  callBackendApi(classId ? "teacherUpdateClass" : "teacherCreateClass", payload)
    .then(function() {
      if (classId) {
        var item = AppState.classes.find(function(c) { return c.class_id === classId; });
        if (item) Object.assign(item, payload);
      } else {
        payload.class_id = "CLS_" + new Date().getTime();
        payload.status = "ACTIVE";
        AppState.classes.push(payload);
      }
      closeModal("modal-class-form");
      loadClassesTable();
      showToast("Data kelas berhasil disimpan", "success");
    });
}

function loadStudentsTable(filterClassId) {
  var tbody = document.getElementById("table-students-tbody");
  var selectEl = document.getElementById("filter-student-class");
  if (!tbody) return;

  if (selectEl && selectEl.options.length <= 1) {
    selectEl.innerHTML = '<option value="">Semua Kelas</option>';
    AppState.classes.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.class_id;
      opt.textContent = c.class_name;
      if (c.class_id === filterClassId) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  tbody.innerHTML = "";
  var filtered = AppState.students.filter(function(s) {
    return !filterClassId || s.class_id === filterClassId;
  });

  filtered.forEach(function(std) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${std.nis}</td>
      <td>${std.nisn || '-'}</td>
      <td><strong>${std.full_name}</strong></td>
      <td><span class="status-pill ${std.gender === 'L' ? 'running' : 'waiting'}">${std.gender}</span></td>
      <td>${std.birth_date || '-'}</td>
      <td><span class="status-pill success">${std.status}</span></td>
      <td>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="editStudent('${std.student_id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddStudentModal() {
  document.getElementById("form-student-id").value = "";
  document.getElementById("form-student-nis").value = "";
  document.getElementById("form-student-nisn").value = "";
  document.getElementById("form-student-name").value = "";
  
  var classSelect = document.getElementById("form-student-class");
  classSelect.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    classSelect.appendChild(opt);
  });

  openModal("modal-student-form");
}

function handleSaveStudent(e) {
  e.preventDefault();
  var stdId = document.getElementById("form-student-id").value;
  var classId = document.getElementById("form-student-class").value;
  var nis = document.getElementById("form-student-nis").value;
  var nisn = document.getElementById("form-student-nisn").value;
  var name = document.getElementById("form-student-name").value;
  var gender = document.getElementById("form-student-gender").value;
  var birth = document.getElementById("form-student-birth").value;

  var payload = {
    student_id: stdId,
    class_id: classId,
    nis: nis,
    nisn: nisn,
    full_name: name,
    gender: gender,
    birth_date: birth
  };

  callBackendApi(stdId ? "teacherUpdateStudent" : "teacherCreateStudent", payload)
    .then(function() {
      if (stdId) {
        var item = AppState.students.find(function(s) { return s.student_id === stdId; });
        if (item) Object.assign(item, payload);
      } else {
        payload.student_id = "STD_" + new Date().getTime();
        payload.status = "ACTIVE";
        AppState.students.push(payload);
      }
      closeModal("modal-student-form");
      loadStudentsTable(classId);
      showToast("Data siswa berhasil disimpan", "success");
    });
}

var parsedImportCache = [];

function openExcelImportModal() {
  var classSelect = document.getElementById("import-target-class");
  classSelect.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    classSelect.appendChild(opt);
  });
  document.getElementById("import-preview-section").style.display = "none";
  openModal("modal-excel-import");
}

function loadSampleImportData() {
  document.getElementById("import-raw-text").value = 
    "20240408\t0012345678\tGita Permata Sari\tP\t2014-06-11\n" +
    "20240409\t0012345679\tHafiz Rizky Pratama\tL\t2014-04-03\n" +
    "20240410\t0012345680\tIndah Cahyani\tP\t2014-10-15";
  parseExcelInputText();
}

function parseExcelInputText() {
  var raw = document.getElementById("import-raw-text").value.trim();
  if (!raw) {
    showToast("Teks data masih kosong", "warning");
    return;
  }

  var lines = raw.split("\n");
  parsedImportCache = [];

  lines.forEach(function(line) {
    var cols = line.split(/[\t,;]/).map(function(c) { return c.trim(); });
    if (cols.length >= 3 && cols[0]) {
      parsedImportCache.push({
        nis: cols[0],
        nisn: cols[1] || "",
        full_name: cols[2],
        gender: (cols[3] || "L").toUpperCase().startsWith("P") ? "P" : "L",
        birth_date: cols[4] || ""
      });
    }
  });

  var tbody = document.getElementById("import-preview-tbody");
  tbody.innerHTML = "";
  parsedImportCache.forEach(function(item) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nis}</td>
      <td>${item.nisn || '-'}</td>
      <td><strong>${item.full_name}</strong></td>
      <td>${item.gender}</td>
      <td>${item.birth_date || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("import-count-text").textContent = parsedImportCache.length;
  document.getElementById("import-preview-section").style.display = "block";
}

function submitImportStudents() {
  var classId = document.getElementById("import-target-class").value;
  if (!classId || parsedImportCache.length === 0) return;

  callBackendApi("teacherImportStudents", { class_id: classId, studentsList: parsedImportCache })
    .then(function() {
      parsedImportCache.forEach(function(p) {
        AppState.students.push({
          student_id: "STD_" + Math.random().toString(36).substring(2, 9),
          class_id: classId,
          nis: p.nis,
          nisn: p.nisn,
          full_name: p.full_name,
          gender: p.gender,
          birth_date: p.birth_date,
          status: "ACTIVE"
        });
      });

      closeModal("modal-excel-import");
      loadStudentsTable(classId);
      showToast(parsedImportCache.length + " siswa berhasil diimpor ke kelas!", "success");
    });
}

function openQrSessionModal() {
  var simSelect = document.getElementById("sim-student-select");
  if (simSelect) {
    simSelect.innerHTML = "";
    var targetStudents = AppState.students.filter(function(s) { return s.class_id === AppState.selectedClassId; });
    targetStudents.forEach(function(std) {
      var opt = document.createElement("option");
      opt.value = std.student_id;
      opt.textContent = std.full_name;
      simSelect.appendChild(opt);
    });
  }

  AppState.qrSecondsRemaining = 1800;
  if (AppState.qrSessionInterval) clearInterval(AppState.qrSessionInterval);

  AppState.qrSessionInterval = setInterval(function() {
    AppState.qrSecondsRemaining--;
    if (AppState.qrSecondsRemaining <= 0) {
      clearInterval(AppState.qrSessionInterval);
      document.getElementById("qr-timer-text").textContent = "Kedaluwarsa";
      return;
    }
    var mins = Math.floor(AppState.qrSecondsRemaining / 60);
    var secs = AppState.qrSecondsRemaining % 60;
    var timerEl = document.getElementById("qr-timer-text");
    if (timerEl) timerEl.textContent = (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
  }, 1000);

  openModal("modal-qr-session");
}

function simulateStudentScan() {
  var selectEl = document.getElementById("sim-student-select");
  if (!selectEl || !selectEl.value) return;

  var student = AppState.students.find(function(s) { return s.student_id === selectEl.value; });
  if (student) {
    var todayStr = new Date().toISOString().split("T")[0];
    var existing = AppState.attendance.find(function(a) {
      return a.student_id === student.student_id && a.attendance_date === todayStr;
    });

    if (existing) {
      existing.status = "PRESENT";
      existing.method = "QR_SCAN";
    } else {
      AppState.attendance.push({
        attendance_id: "ATT_" + new Date().getTime(),
        student_id: student.student_id,
        class_id: student.class_id,
        attendance_date: todayStr,
        status: "PRESENT",
        method: "QR_SCAN",
        note: ""
      });
    }

    showToast("Scan Berhasil: " + student.full_name + " tercatat HADIR (QR)!", "success");
    loadAttendanceTable();
  }
}

function loadAttendanceTable() {
  var tbody = document.getElementById("table-attendance-tbody");
  var classSelect = document.getElementById("attendance-select-class");
  var dateInput = document.getElementById("attendance-date-input");
  if (!tbody) return;

  if (classSelect && classSelect.options.length === 0) {
    AppState.classes.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.class_id;
      opt.textContent = c.class_name;
      if (c.class_id === AppState.selectedClassId) opt.selected = true;
      classSelect.appendChild(opt);
    });
  }

  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  var selectedClass = classSelect ? classSelect.value : AppState.selectedClassId;
  var selectedDate = dateInput ? dateInput.value : new Date().toISOString().split("T")[0];

  tbody.innerHTML = "";
  var classStudents = AppState.students.filter(function(s) { return s.class_id === selectedClass; });

  var stats = { present: 0, permission: 0, sick: 0, absent: 0 };

  classStudents.forEach(function(std) {
    var att = AppState.attendance.find(function(a) {
      return a.student_id === std.student_id && a.attendance_date === selectedDate;
    }) || { status: "PRESENT", method: "MANUAL", note: "" };

    if (att.status === "PRESENT") stats.present++;
    else if (att.status === "PERMISSION") stats.permission++;
    else if (att.status === "SICK") stats.sick++;
    else if (att.status === "ABSENT") stats.absent++;

    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${std.nis}</td>
      <td><strong>${std.full_name}</strong></td>
      <td>
        <select class="form-input att-status-select" data-std="${std.student_id}" style="padding: 4px 8px; font-size: 0.8rem;">
          <option value="PRESENT" ${att.status === 'PRESENT' ? 'selected' : ''}>Hadir</option>
          <option value="PERMISSION" ${att.status === 'PERMISSION' ? 'selected' : ''}>Izin</option>
          <option value="SICK" ${att.status === 'SICK' ? 'selected' : ''}>Sakit</option>
          <option value="ABSENT" ${att.status === 'ABSENT' ? 'selected' : ''}>Alpa</option>
        </select>
      </td>
      <td><span class="status-pill ${att.method === 'QR_SCAN' ? 'success' : 'waiting'}">${att.method || 'MANUAL'}</span></td>
      <td>
        <input type="text" class="form-input att-note-input" data-std="${std.student_id}" value="${att.note || ''}" placeholder="Keterangan..." style="padding: 4px 8px; font-size: 0.8rem;">
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("att-badge-present").textContent = "Hadir: " + stats.present;
  document.getElementById("att-badge-permission").textContent = "Izin: " + stats.permission;
  document.getElementById("att-badge-sick").textContent = "Sakit: " + stats.sick;
  document.getElementById("att-badge-absent").textContent = "Alpa: " + stats.absent;
}

function saveManualAttendanceBatch() {
  var selects = document.querySelectorAll(".att-status-select");
  var notes = document.querySelectorAll(".att-note-input");
  var dateStr = document.getElementById("attendance-date-input").value;
  var records = [];

  selects.forEach(function(sel, idx) {
    var stdId = sel.getAttribute("data-std");
    var st = sel.value;
    var nt = notes[idx] ? notes[idx].value : "";

    records.push({ student_id: stdId, status: st, note: nt });

    var existing = AppState.attendance.find(function(a) {
      return a.student_id === stdId && a.attendance_date === dateStr;
    });

    if (existing) {
      existing.status = st;
      existing.note = nt;
    } else {
      AppState.attendance.push({
        attendance_id: "ATT_" + Math.random().toString(36).substring(2, 9),
        student_id: stdId,
        class_id: AppState.selectedClassId,
        attendance_date: dateStr,
        status: st,
        method: "MANUAL",
        note: nt
      });
    }
  });

  callBackendApi("teacherRecordAttendance", {
    class_id: AppState.selectedClassId,
    dateStr: dateStr,
    recordsArray: records
  }).then(function() {
    showToast("Presensi berhasil disimpan ke basis data!", "success");
    loadAttendanceTable();
  });
}

function loadJournalsTable() {
  var tbody = document.getElementById("table-journals-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  AppState.journals.forEach(function(j) {
    var cls = AppState.classes.find(function(c) { return c.class_id === j.class_id; });
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${j.journal_date}</td>
      <td><strong>${cls ? cls.class_name : 'IV A'}</strong></td>
      <td>${j.subject_id === 'MAPEL_IPAS' ? 'IPAS' : 'Matematika'}</td>
      <td>${j.topic}</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${j.activities}</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${j.reflection}</td>
      <td>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="deleteJournal('${j.journal_id}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddJournalModal() {
  var classSelect = document.getElementById("form-journal-class");
  classSelect.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    classSelect.appendChild(opt);
  });

  var subSelect = document.getElementById("form-journal-subject");
  subSelect.innerHTML = `
    <option value="MAPEL_BINDO">Bahasa Indonesia</option>
    <option value="MAPEL_MTK">Matematika</option>
    <option value="MAPEL_IPAS">IPAS</option>
    <option value="MAPEL_PPKN">Pendidikan Pancasila (PPKn)</option>
  `;

  document.getElementById("form-journal-date").value = new Date().toISOString().split("T")[0];
  openModal("modal-journal-form");
}

function handleSaveJournal(e) {
  e.preventDefault();
  var payload = {
    journal_id: "JRN_" + new Date().getTime(),
    class_id: document.getElementById("form-journal-class").value,
    subject_id: document.getElementById("form-journal-subject").value,
    journal_date: document.getElementById("form-journal-date").value,
    topic: document.getElementById("form-journal-topic").value,
    learning_objective: document.getElementById("form-journal-tp").value,
    activities: document.getElementById("form-journal-activities").value,
    reflection: document.getElementById("form-journal-reflection").value
  };

  callBackendApi("teacherSaveJournal", payload)
    .then(function() {
      AppState.journals.unshift(payload);
      closeModal("modal-journal-form");
      loadJournalsTable();
      showToast("Jurnal mengajar berhasil disimpan", "success");
    });
}

function deleteJournal(jId) {
  if (confirm("Hapus jurnal ini?")) {
    callBackendApi("teacherDeleteJournal", { journal_id: jId })
      .then(function() {
        AppState.journals = AppState.journals.filter(function(j) { return j.journal_id !== jId; });
        loadJournalsTable();
        showToast("Jurnal dihapus", "info");
      });
  }
}

var currentResourceTab = "MY";

function switchResourceTab(tab) {
  currentResourceTab = tab;
  document.getElementById("tab-my-resources").className = (tab === "MY") ? "btn-primary" : "btn-secondary";
  document.getElementById("tab-central-resources").className = (tab === "CENTRAL") ? "btn-primary" : "btn-secondary";
  loadResourcesTable();
}

function loadResourcesTable() {
  var tbody = document.getElementById("table-resources-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  var filtered = AppState.resources.filter(function(r) {
    return (currentResourceTab === "MY") ? (r.visibility === "PRIVATE") : (r.visibility === "PUBLIC_CENTRAL");
  });

  filtered.forEach(function(r) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="status-pill running">${r.resource_type}</span></td>
      <td><strong>${r.title}</strong></td>
      <td>Kelas ${r.grade_level}</td>
      <td>Pelajaran Umum</td>
      <td>Semester ${r.semester}</td>
      <td>
        <a href="${r.drive_url}" target="_blank" style="color: var(--blue-primary); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
          Buka Google Drive &rarr;
        </a>
      </td>
      <td>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="window.open('${r.drive_url}')">Lihat</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateGradesClasses() {
  var select = document.getElementById("grades-select-class");
  if (!select) return;
  select.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    select.appendChild(opt);
  });
  loadAssessmentsDropdown();
}

function loadAssessmentsDropdown() {
  var classId = document.getElementById("grades-select-class").value;
  var asmSelect = document.getElementById("grades-select-assessment");
  if (!asmSelect) return;
  asmSelect.innerHTML = "";

  var asms = AppState.assessments.filter(function(a) { return a.class_id === classId; });
  if (asms.length === 0) {
    asmSelect.innerHTML = '<option value="">Belum ada asesmen</option>';
  } else {
    asms.forEach(function(a) {
      var opt = document.createElement("option");
      opt.value = a.assessment_id;
      opt.textContent = a.title + " (" + a.assessment_type + ")";
      asmSelect.appendChild(opt);
    });
  }
  loadGradesTable();
}

function loadGradesTable() {
  var tbody = document.getElementById("table-grades-tbody");
  var classId = document.getElementById("grades-select-class").value;
  var asmId = document.getElementById("grades-select-assessment").value;
  if (!tbody) return;
  tbody.innerHTML = "";

  var students = AppState.students.filter(function(s) { return s.class_id === classId; });

  students.forEach(function(std) {
    var gradeKey = asmId + "_" + std.student_id;
    var gradeVal = AppState.grades[gradeKey] !== undefined ? AppState.grades[gradeKey] : (80 + Math.floor(Math.random() * 15));

    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${std.nis}</td>
      <td><strong>${std.full_name}</strong></td>
      <td>
        <input type="number" min="0" max="100" class="form-input grade-input" data-std="${std.student_id}" value="${gradeVal}" style="padding: 4px 8px; font-weight: bold; width: 80px;">
      </td>
      <td>
        <input type="text" class="form-input grade-note-input" data-std="${std.student_id}" value="Telah mencapai kompetensi dengan baik." style="padding: 4px 8px; font-size: 0.8rem;">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function saveBatchGrades() {
  var classId = document.getElementById("grades-select-class").value;
  var asmId = document.getElementById("grades-select-assessment").value;
  var inputs = document.querySelectorAll(".grade-input");
  var notes = document.querySelectorAll(".grade-note-input");
  var gradesList = [];

  inputs.forEach(function(inp, idx) {
    var stdId = inp.getAttribute("data-std");
    var scoreVal = Number(inp.value);
    var noteVal = notes[idx] ? notes[idx].value : "";

    AppState.grades[asmId + "_" + stdId] = scoreVal;
    gradesList.push({ student_id: stdId, score: scoreVal, notes: noteVal });
  });

  callBackendApi("teacherSaveBatchGrades", {
    class_id: classId,
    assessment_id: asmId,
    gradesArray: gradesList
  }).then(function() {
    showToast("Nilai siswa berhasil disimpan ke basis data!", "success");
  });
}

function populateAnalysisClasses() {
  var select = document.getElementById("analysis-select-class");
  if (!select) return;
  select.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    select.appendChild(opt);
  });
}

function loadAnalysisData() {
  document.getElementById("analysis-avg-score").textContent = "86.4";
  document.getElementById("analysis-max-score").textContent = "98";
  document.getElementById("analysis-min-score").textContent = "65";
  document.getElementById("analysis-dist-a").textContent = "18 Siswa";
  document.getElementById("analysis-remedial-count").textContent = "2 Siswa";

  var tbody = document.getElementById("table-remedial-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td>20240405</td>
        <td><strong>Dimas Aditya Wardhana</strong></td>
        <td><span class="status-pill" style="background:#FEE2E2; color:#DC2626;">65</span></td>
        <td>Perlu penguatan konsep operasi perkalian bersusun dan pendampingan sebaya.</td>
      </tr>
      <tr>
        <td>20240407</td>
        <td><strong>Faris Al-Ghifari</strong></td>
        <td><span class="status-pill" style="background:#FEE2E2; color:#DC2626;">68</span></td>
        <td>Diberikan latihan remidial materi dasar bilangan prima.</td>
      </tr>
    `;
  }
}

function populateReportsClasses() {
  var select = document.getElementById("reports-select-class");
  if (!select) return;
  select.innerHTML = "";
  AppState.classes.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.class_id;
    opt.textContent = c.class_name;
    select.appendChild(opt);
  });
}

function loadReportsTable() {
  var tbody = document.getElementById("table-reports-tbody");
  var classId = document.getElementById("reports-select-class").value;
  if (!tbody) return;
  tbody.innerHTML = "";

  var students = AppState.students.filter(function(s) { return s.class_id === classId; });

  students.forEach(function(std) {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${std.nis}</td>
      <td><strong>${std.full_name}</strong></td>
      <td>${std.gender}</td>
      <td><span class="status-pill success">Siap Dicetak</span></td>
      <td>10 November 2026</td>
      <td>
        <button class="btn-primary" style="padding: 4px 10px; font-size: 0.78rem;" onclick="openRaporPreview('${std.student_id}')">Pratinjau & Cetak Rapor</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openRaporPreview(studentId) {
  var std = AppState.students.find(function(s) { return s.student_id === studentId; });
  if (std) {
    document.getElementById("rapor-student-name").textContent = std.full_name;
    document.getElementById("rapor-student-nis").textContent = std.nis + " / " + (std.nisn || "0012345678");
  }
  openModal("modal-report-print");
}

var mockAdminPending = [
  { id: "PEN_01", name: "Siti Rahayu, S.Pd.", email: "siti.rahayu@sdnambulu.sch.id", nip: "198802142011012008", school_name: "SD NEGERI AMBULU 01", npsn: "20523888", kecamatan: "Ambulu", date: "2026-11-10" },
  { id: "PEN_02", name: "Hendro Wibowo, S.Pd.", email: "hendro.wibowo@gmail.com", nip: "199104052019031005", school_name: "SD NEGERI TEGALSARI 02", npsn: "20523895", kecamatan: "Ambulu", date: "2026-11-11" }
];

function initAdminPortal() {
  showView("portal-admin");
  document.getElementById("admin-stat-total-teachers").textContent = "42";
  document.getElementById("admin-stat-active-teachers").textContent = "38";
  document.getElementById("admin-stat-pending-teachers").textContent = mockAdminPending.length;
  document.getElementById("admin-stat-total-schools").textContent = "14";
  document.getElementById("admin-stat-resources").textContent = "26";

  loadAdminPendingTeachers();
  loadAdminRecentAudit();
  switchAdminMenu("dashboard");
}

function loadAdminPendingTeachers() {
  var qTbody = document.getElementById("admin-quick-pending-tbody");
  var fTbody = document.getElementById("admin-full-pending-tbody");

  var renderRows = function(tbody, isFull) {
    if (!tbody) return;
    tbody.innerHTML = "";
    mockAdminPending.forEach(function(item) {
      var tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td>${item.email}</td>
        ${isFull ? `<td>${item.nip}</td>` : ''}
        <td>${item.school_name} (${item.npsn})</td>
        ${isFull ? `<td>${item.kecamatan}</td>` : ''}
        <td><span class="status-pill waiting">Menunggu</span></td>
        <td>
          <button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem; background: var(--color-success);" onclick="adminApproveTeacher('${item.id}')">Setujui</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--color-danger);" onclick="adminRejectTeacher('${item.id}')">Tolak</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  renderRows(qTbody, false);
  renderRows(fTbody, true);
}

function adminApproveTeacher(id) {
  mockAdminPending = mockAdminPending.filter(function(i) { return i.id !== id; });
  loadAdminPendingTeachers();
  document.getElementById("admin-stat-pending-teachers").textContent = mockAdminPending.length;
  showToast("Akun guru berhasil disetujui & diaktifkan!", "success");
}

function adminRejectTeacher(id) {
  var note = prompt("Alasan penolakan pendaftaran guru ini:");
  if (note !== null) {
    mockAdminPending = mockAdminPending.filter(function(i) { return i.id !== id; });
    loadAdminPendingTeachers();
    document.getElementById("admin-stat-pending-teachers").textContent = mockAdminPending.length;
    showToast("Pendaftaran guru ditolak.", "warning");
  }
}

function loadAdminRecentAudit() {
  var tbody = document.getElementById("admin-recent-audit-tbody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td>11/11 20:45</td>
      <td>budi.santoso@guru.sd</td>
      <td>TEACHER</td>
      <td>RECORD_ATTENDANCE</td>
      <td>Kelas IV A</td>
      <td>Presensi 28 siswa tercatat</td>
    </tr>
    <tr>
      <td>11/11 20:30</td>
      <td>admin.ambulu@kemdikbud</td>
      <td>SUPER_ADMIN</td>
      <td>VERIFY_TEACHER</td>
      <td>USERS</td>
      <td>Menyetujui pendaftaran guru baru</td>
    </tr>
  `;
}

function openModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.classList.add("active");
}

function closeModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.classList.remove("active");
}

function showToast(message, type) {
  var container = document.getElementById("toast-container");
  if (!container) return;

  var toast = document.createElement("div");
  toast.className = "toast";
  if (type === "success") toast.style.borderLeft = "4px solid #16A34A";
  else if (type === "warning") toast.style.borderLeft = "4px solid #D97706";
  else if (type === "danger") toast.style.borderLeft = "4px solid #DC2626";
  else toast.style.borderLeft = "4px solid #2563EB";

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(function() { toast.remove(); }, 300);
  }, 3200);
}

function handleLocalMockCall(action, payload) {
  switch (action) {
    case "getCurrentUser":
      return { role: AppState.currentRole || "TEACHER", accountStatus: "ACTIVE", user: AppState.currentUser, school: AppState.currentSchool };
    case "teacherGetClasses":
      return AppState.classes;
    case "teacherGetStudents":
      return AppState.students;
    case "teacherGetAttendance":
      return { totalStudents: AppState.students.length, present: 26, permission: 1, sick: 1, absent: 0, list: [] };
    case "teacherGetJournals":
      return AppState.journals;
    case "teacherGetResources":
      return { myResources: AppState.resources.filter(function(r) { return r.visibility === "PRIVATE"; }), centralResources: AppState.resources.filter(function(r) { return r.visibility === "PUBLIC_CENTRAL"; }) };
    default:
      return { success: true };
  }
}

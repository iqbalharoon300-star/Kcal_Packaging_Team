/* =========================================================
   KPS — KCAL PACKAGING SYSTEM
   Browser-only HR Portal
   Author: Haroon
   ========================================================= */

/* ------------------ Local Storage Helpers ------------------ */
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ------------------ Default Admin Account ------------------ */
const KPS_USERS = [
  {
    uid: "10001",
    name: "System Admin",
    role: "Admin",
    password: "Admin@123",
    section: "Central Admin",
    shift: "Day",
    joinDate: "2023-01-01",
  },
];

/* ------------------ Session ------------------ */
function setSession(user) {
  localStorage.setItem("kps_session", JSON.stringify(user));
}
function getSession() {
  return JSON.parse(localStorage.getItem("kps_session") || "null");
}
function requireSessionOrRedirect() {
  const s = getSession();
  if (!s) {
    window.location.href = "index.html";
    return null;
  }
  return s;
}
function signOut() {
  localStorage.removeItem("kps_session");
  window.location.href = "index.html";
}

/* ------------------ Notifications store ------------------ */
function getNotifications() {
  return lsGet("kps_notifications", []);
}
function addNotification(category, message) {
  const list = getNotifications();
  list.unshift({
    category,
    message,
    ts: Date.now(),
  });
  lsSet("kps_notifications", list);
  showToast(message, "ok");
  // refresh sidebar if present
  renderSidebarNotifications();
}

/* ------------------ Employees store ------------------ */
function getEmployees() {
  return lsGet("kps_employees", []);
}
function setEmployees(list) {
  lsSet("kps_employees", list);
}

/* ------------------ Attendance store ------------------ */
function getAttendance() {
  return lsGet("kps_attendance", []);
}
function setAttendance(list) {
  lsSet("kps_attendance", list);
}

/* ------------------ Time helpers ------------------ */
function getNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
function diffHours(a, b) {
  if (!a || !b || a === "—" || b === "—") return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh + bm / 60) - (ah + am / 60);
}
function computeDuty(inT, outT) {
  let net = diffHours(inT, outT) - 1; // -1h break (your rule)
  if (net < 0) net = 0;
  let ot = net - 10; // OT after 10h duty incl break
  if (ot < 0) ot = 0;
  return {
    netHours: +net.toFixed(2),
    overtime: +ot.toFixed(2),
  };
}

/* ------------------ Attendance helpers ------------------ */
function ensureTodayRowForUser(user) {
  const now = getNow();
  const list = getAttendance();
  let row = list.find((r) => r.uid === user.uid && r.date === now.dateStr);
  if (!row) {
    row = {
      uid: user.uid,
      name: user.name,
      role: user.role,
      date: now.dateStr,
      in: "—",
      out: "—",
      netHours: 0,
      overtime: 0,
      status: "AB",
    };
    list.unshift(row);
    setAttendance(list);
  }
  return row;
}

function handleCheckIn() {
  const s = requireSessionOrRedirect();
  if (!s) return;
  const now = getNow();
  const list = getAttendance();

  let row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  if (row && row.in !== "—") {
    showToast("Already checked IN today", "error");
    return;
  }

  if (!row) {
    row = {
      uid: s.uid,
      name: s.name,
      role: s.role,
      date: now.dateStr,
      in: now.timeStr,
      out: "—",
      netHours: 0,
      overtime: 0,
      status: "Present",
    };
    list.unshift(row);
  } else {
    row.in = now.timeStr;
    row.status = "Present";
  }

  setAttendance(list);
  addNotification("Attendance", `${s.name} checked IN at ${now.timeStr}`);
  refreshAttendanceUI();
}

function handleCheckOut() {
  const s = requireSessionOrRedirect();
  if (!s) return;
  const now = getNow();
  const list = getAttendance();
  let row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  if (!row || row.in === "—") {
    showToast("Please Check IN first", "error");
    return;
  }
  if (row.out !== "—") {
    showToast("Already checked OUT", "error");
    return;
  }

  row.out = now.timeStr;
  const duty = computeDuty(row.in, row.out);
  row.netHours = duty.netHours;
  row.overtime = duty.overtime;
  row.status = "Present";

  setAttendance(list);
  addNotification("Attendance", `${s.name} checked OUT at ${now.timeStr}`);
  refreshAttendanceUI();
}

/* ------------------ Toast popup ------------------ */
function showToast(message, type) {
  const area = document.getElementById("toast-area");
  if (!area) return;
  const div = document.createElement("div");
  div.className = "toast" + (type === "error" ? " error" : "");
  div.innerHTML = `
    <div class="toast-msg">${message}</div>
    <div class="toast-time">${new Date().toLocaleTimeString()}</div>
  `;
  area.appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(10px) scale(0.96)";
    setTimeout(() => div.remove(), 200);
  }, 4000);
}

/* ------------------ Dashboard render ------------------ */
function renderSidebarProfile() {
  const s = getSession();
  if (!s) return;
  // left sidebar profile boxes
  const n1 = document.getElementById("dash-user-name");
  const r1 = document.getElementById("dash-user-role");
  const sec = document.getElementById("dash-user-section");
  if (n1) n1.textContent = s.name;
  if (r1) r1.textContent = s.role;
  if (sec) sec.textContent = s.section || "—";

  // welcome area + chip in topbar
  const welcomeName = document.getElementById("welcome-name");
  const welcomeRole = document.getElementById("welcome-role");
  if (welcomeName) welcomeName.textContent = s.name;
  if (welcomeRole) welcomeRole.textContent = s.role;

  const chipName = document.getElementById("chip-name");
  const chipRole = document.getElementById("chip-role");
  const chipAvatar = document.getElementById("chip-avatar");
  if (chipName) chipName.textContent = s.name;
  if (chipRole) chipRole.textContent = s.role;
  if (chipAvatar) {
    chipAvatar.textContent = s.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
}

function renderSidebarNotifications() {
  const ul = document.getElementById("sidebar-notif-list");
  if (!ul) return;
  const list = getNotifications();
  const latest5 = list.slice(0, 5);
  if (latest5.length === 0) {
    ul.innerHTML = `<li>No recent activity</li>`;
    return;
  }
  ul.innerHTML = latest5
    .map((n) => {
      const timeStr = new Date(n.ts).toLocaleString();
      return `<li>
        <div>${n.message}</div>
        <span class="notif-time">${timeStr}</span>
      </li>`;
    })
    .join("");
}

function renderKpis() {
  const attVal = document.getElementById("kpi-attendance");
  const otVal = document.getElementById("kpi-overtime");
  const dedVal = document.getElementById("kpi-deduction");
  const notifVal = document.getElementById("kpi-notif-count");

  const attList = getAttendance();
  const notifList = getNotifications();
  const todayStr = getNow().dateStr;

  const todaysRows = attList.filter((r) => r.date === todayStr);
  const totalOT = attList.reduce((sum, r) => sum + (r.overtime || 0), 0);

  if (attVal) attVal.textContent = todaysRows.length + " records";
  if (otVal) otVal.textContent = totalOT.toFixed(2) + " hr";
  if (dedVal) dedVal.textContent = "—";
  if (notifVal) notifVal.textContent = notifList.length.toString();
}

function renderLatestAttendanceTable() {
  const tbody = document.getElementById("latest-attendance-tbody");
  if (!tbody) return;
  const list = getAttendance().slice(0, 10); // last 10
  tbody.innerHTML = list
    .map(
      (r) => `
    <tr>
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.date}</td>
      <td>${r.in}</td>
      <td>${r.out}</td>
      <td>${r.netHours}</td>
      <td>${r.overtime}</td>
      <td>${r.status}</td>
    </tr>`
    )
    .join("");
}

/* today's line for Attendance page */
function renderTodaySummary() {
  const s = getSession();
  const now = getNow();
  const list = getAttendance();
  const row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  const dateEl = document.getElementById("att-today-date");
  const inEl = document.getElementById("att-today-in");
  const outEl = document.getElementById("att-today-out");
  const dutyEl = document.getElementById("att-today-duty");
  const otEl = document.getElementById("att-today-ot");
  const stEl = document.getElementById("att-today-status");

  if (!dateEl) return; // not on attendance page

  if (!row) {
    dateEl.textContent = now.dateStr;
    inEl.textContent = "--";
    outEl.textContent = "--";
    dutyEl.textContent = "0.00 hr";
    otEl.textContent = "0.00 hr";
    stEl.textContent = "--";
    return;
  }

  dateEl.textContent = row.date;
  inEl.textContent = row.in;
  outEl.textContent = row.out;
  dutyEl.textContent = (row.netHours || 0).toFixed(2) + " hr";
  otEl.textContent = (row.overtime || 0).toFixed(2) + " hr";
  stEl.textContent = row.status;
}

function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;
  const list = getAttendance();
  tbody.innerHTML = list
    .map(
      (r) => `
    <tr>
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.date}</td>
      <td>${r.in}</td>
      <td>${r.out}</td>
      <td>${r.netHours}</td>
      <td>${r.overtime}</td>
      <td>${r.status}</td>
    </tr>`
    )
    .join("");
}

/* helper: refresh attendance-related UIs */
function refreshAttendanceUI() {
  // dashboard
  if (document.body.dataset.page === "dashboard") {
    renderKpis();
    renderLatestAttendanceTable();
    renderSidebarNotifications();
  }
  // attendance page
  if (document.body.dataset.page === "attendance") {
    renderAttendanceTable();
    renderTodaySummary();
    renderSidebarNotifications();
  }
}

/* ------------------ Employee Directory logic ------------------ */

function openEmpModalForNew() {
  const modal = document.getElementById("emp-modal");
  const title = document.getElementById("emp-modal-title");

  // clear form
  document.getElementById("emp-id").value = "";
  document.getElementById("emp-name").value = "";
  document.getElementById("emp-password").value = "";
  document.getElementById("emp-role").value = "";
  document.getElementById("emp-section").value = "";
  document.getElementById("emp-shift").value = "";
  document.getElementById("emp-join").value = "";

  title.textContent = "Add Employee";
  modal.style.display = "flex";
}

function openEmpModalForEdit(uid) {
  const modal = document.getElementById("emp-modal");
  const title = document.getElementById("emp-modal-title");

  const emps = getEmployees();
  const emp = emps.find((e) => e.uid === uid);
  if (!emp) return;

  document.getElementById("emp-id").value = emp.uid;
  document.getElementById("emp-name").value = emp.name;
  document.getElementById("emp-password").value = ""; // blank => keep same
  document.getElementById("emp-role").value = emp.role;
  document.getElementById("emp-section").value = emp.section || "";
  document.getElementById("emp-shift").value = emp.shift || "";
  document.getElementById("emp-join").value = emp.joinDate || "";

  title.textContent = "Edit Employee";
  modal.style.display = "flex";
}

function closeEmpModal() {
  document.getElementById("emp-modal").style.display = "none";
}

function handleGeneratePassword() {
  const pwField = document.getElementById("emp-password");
  const newPw = "KPS@" + Math.floor(1000 + Math.random() * 9000);
  pwField.value = newPw;
  showToast("Generated: " + newPw, "ok");
}

function handleSaveEmployee(e) {
  e.preventDefault();
  const uid = document.getElementById("emp-id").value.trim();
  const name = document.getElementById("emp-name").value.trim();
  const pw = document.getElementById("emp-password").value.trim();
  const role = document.getElementById("emp-role").value.trim();
  const section = document.getElementById("emp-section").value.trim();
  const shift = document.getElementById("emp-shift").value.trim();
  const joinDate = document.getElementById("emp-join").value.trim();

  if (!uid || !name || !role) {
    showToast("Please fill UID, Name, Role", "error");
    return;
  }

  let list = getEmployees();
  const idx = list.findIndex((x) => x.uid === uid);

  if (idx >= 0) {
    // edit
    list[idx] = {
      ...list[idx],
      name,
      role,
      section,
      shift,
      joinDate,
      ...(pw ? { password: pw } : {}),
    };
    showToast("Employee updated", "ok");
    addNotification("Employee", `Updated ${name} (${uid})`);
  } else {
    // new
    list.unshift({
      uid,
      name,
      password: pw || "KPS@1234",
      role,
      section,
      shift,
      joinDate,
      createdAt: Date.now(),
    });
    showToast("Employee added", "ok");
    addNotification("Employee", `Added ${name} (${uid})`);
  }

  setEmployees(list);
  renderEmployeesTable();
  closeEmpModal();
}

function handleDeleteEmployee(uid) {
  if (!confirm("Delete employee " + uid + "?")) return;
  let list = getEmployees();
  const match = list.find((e) => e.uid === uid);
  list = list.filter((e) => e.uid !== uid);
  setEmployees(list);
  renderEmployeesTable();
  if (match) {
    addNotification("Employee", `Removed ${match.name} (${uid})`);
  }
}

function renderEmployeesTable() {
  const tbody = document.getElementById("emp-tbody");
  if (!tbody) return;

  const filterText = (document.getElementById("emp-search")?.value || "")
    .toLowerCase()
    .trim();

  const list = getEmployees();
  const filtered = list.filter(
    (emp) =>
      emp.uid.toLowerCase().includes(filterText) ||
      emp.name.toLowerCase().includes(filterText)
  );

  tbody.innerHTML = filtered
    .map(
      (emp) => `
    <tr>
      <td>${emp.uid}</td>
      <td>${emp.name}</td>
      <td>${emp.role}</td>
      <td>${emp.section || "-"}</td>
      <td>${emp.shift || "-"}</td>
      <td>${emp.joinDate || "-"}</td>
      <td>${emp.password || "—"}</td>
      <td>
        <button class="btn-edit" data-edit="${emp.uid}">Edit</button>
        <button class="btn-reset" data-del="${emp.uid}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  // attach edit/delete
  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEmpModalForEdit(btn.dataset.edit));
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => handleDeleteEmployee(btn.dataset.del));
  });
}

/* ------------------ Dropdown menu ------------------ */
function initUserDropdown() {
  const chip = document.getElementById("user-chip");
  const menu = document.getElementById("user-dropdown");
  if (!chip || !menu) return;

  chip.addEventListener("click", () => {
    menu.classList.toggle("show");
  });

  // Profile
  const profBtn = menu.querySelector("[data-goto-profile]");
  if (profBtn) {
    profBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  // Change Password (future)
  const pwBtn = menu.querySelector("[data-goto-changepw]");
  if (pwBtn) {
    pwBtn.addEventListener("click", () => {
      showToast("Password change coming soon", "ok");
      menu.classList.remove("show");
    });
  }

  // Sign Out
  const outBtn = menu.querySelector("[data-logout]");
  if (outBtn) {
    outBtn.addEventListener("click", () => {
      signOut();
    });
  }
}

/* ------------------ LOGIN HANDLER ------------------ */
function handleLoginSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById("login-uid").value.trim();
  const pwVal = document.getElementById("login-pw").value.trim();

  if (!idVal || !pwVal) {
    alert("Please enter UID and Password");
    return;
  }

  // 1. Check Admin first
  let found = KPS_USERS.find(
    (u) => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  // 2. Check Employee list
  if (!found) {
    const employees = getEmployees();
    found = employees.find(
      (emp) =>
        emp.uid.toString() === idVal.toString() && emp.password === pwVal
    );
  }

  if (!found) {
    alert("❌ Invalid UID or Password");
    return;
  }

  setSession(found);
  window.location.href = "dashboard.html";
}

/* ------------------ PAGE INIT ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
    return;
  }

  // all other pages require login
  const s = requireSessionOrRedirect();
  if (!s) return;

  // fill side profile + chip + role/section
  renderSidebarProfile();
  initUserDropdown();

  // permission: hide Employees tab on nav if not Admin/Manager/Supervisor
  if (s.role !== "Admin" && s.role !== "Manager" && s.role !== "Supervisor") {
    const empNav = document.getElementById("nav-employees-link");
    if (empNav) empNav.style.display = "none";
  }

  // DASHBOARD
  if (page === "dashboard") {
    renderSidebarNotifications();
    renderKpis();
    renderLatestAttendanceTable();
  }

  // ATTENDANCE
  if (page === "attendance") {
    const inBtn = document.getElementById("checkin-btn");
    const outBtn = document.getElementById("checkout-btn");
    if (inBtn) inBtn.addEventListener("click", handleCheckIn);
    if (outBtn) outBtn.addEventListener("click", handleCheckOut);

    renderSidebarNotifications();
    renderTodaySummary();
    renderAttendanceTable();
  }

  // EMPLOYEES
  if (page === "employees") {
    // Only admins/managers/supervisors can add
    if (
      s.role === "Admin" ||
      s.role === "Manager" ||
      s.role === "Supervisor"
    ) {
      const addBtn = document.getElementById("open-emp-modal");
      if (addBtn) {
        addBtn.style.display = "inline-block";
        addBtn.addEventListener("click", openEmpModalForNew);
      }
    } else {
      // hide if regular staff
      const addBtn = document.getElementById("open-emp-modal");
      if (addBtn) addBtn.style.display = "none";
    }

    // Close modal
    const closeBtn = document.getElementById("close-emp-modal");
    if (closeBtn) closeBtn.addEventListener("click", closeEmpModal);

    // Save employee
    const form = document.getElementById("emp-form");
    if (form) form.addEventListener("submit", handleSaveEmployee);

    // Generate password
    const genBtn = document.getElementById("generate-pw");
    if (genBtn) genBtn.addEventListener("click", handleGeneratePassword);

    // Filter search
    const searchBox = document.getElementById("emp-search");
    if (searchBox) {
      searchBox.addEventListener("input", renderEmployeesTable);
    }

    renderSidebarNotifications();
    renderEmployeesTable();
  }
});

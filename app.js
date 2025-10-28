/* =========================================================
   KPS — KCAL PACKAGING SYSTEM (Frontend Only)
   Author: Haroon
   ========================================================= */

/* ---------- LocalStorage helpers ---------- */
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

/* ---------- Single built-in Admin ---------- */
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

/* ---------- Session ---------- */
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

/* ---------- Attendance storage ---------- */
function getAttendance() {
  return lsGet("kps_attendance", []);
}
function setAttendance(list) {
  lsSet("kps_attendance", list);
}

/* ---------- Notifications storage ---------- */
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
  // show toast popup
  showToast(message, "ok");
  // re-render sidebar if on dashboard
  renderSidebarNotifications();
}

/* ---------- Utility time helpers ---------- */
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
  let net = diffHours(inT, outT) - 1; // minus 1hr break
  if (net < 0) net = 0;
  let ot = net - 10; // OT after 10h shift incl break
  if (ot < 0) ot = 0;
  return {
    netHours: +net.toFixed(2),
    overtime: +ot.toFixed(2),
  };
}

/* ---------- Ensure today's row ---------- */
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

/* ---------- Check In / Check Out ---------- */
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

  if (document.body.dataset.page === "dashboard") {
    renderLatestAttendanceTable();
    renderSidebarNotifications();
    renderKpis();
  }
  if (document.body.dataset.page === "attendance") {
    renderAttendanceTable();
  }
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

  if (document.body.dataset.page === "dashboard") {
    renderLatestAttendanceTable();
    renderSidebarNotifications();
    renderKpis();
  }
  if (document.body.dataset.page === "attendance") {
    renderAttendanceTable();
  }
}

/* ---------- Dashboard rendering ---------- */
function renderSidebarProfile() {
  const s = getSession();
  if (!s) return;
  const nameEl = document.getElementById("dash-user-name");
  const roleEl = document.getElementById("dash-user-role");
  const secEl = document.getElementById("dash-user-section");
  const welcomeNameEl = document.getElementById("welcome-name");
  const welcomeRoleEl = document.getElementById("welcome-role");
  const chipName = document.getElementById("chip-name");
  const chipRole = document.getElementById("chip-role");
  const avatarChip = document.getElementById("chip-avatar");

  if (nameEl) nameEl.textContent = s.name;
  if (roleEl) roleEl.textContent = s.role;
  if (secEl) secEl.textContent = s.section || "—";
  if (welcomeNameEl) welcomeNameEl.textContent = s.name;
  if (welcomeRoleEl) welcomeRoleEl.textContent = s.role;
  if (chipName) chipName.textContent = s.name;
  if (chipRole) chipRole.textContent = s.role;
  if (avatarChip) {
    avatarChip.textContent = s.name
      .split(" ")
      .map((n) => n[0])
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
  // Just basic placeholders right now
  const attVal = document.getElementById("kpi-attendance");
  const otVal = document.getElementById("kpi-overtime");
  const dedVal = document.getElementById("kpi-deduction");
  const notifVal = document.getElementById("kpi-notif-count");

  const attList = getAttendance();
  const notifList = getNotifications();

  // attendance KPI = number of rows today
  const todayStr = getNow().dateStr;
  const todaysRows = attList.filter((r) => r.date === todayStr);
  const totalOT = attList.reduce((sum, r) => sum + (r.overtime || 0), 0);

  if (attVal) attVal.textContent = `${todaysRows.length} records`;
  if (otVal) otVal.textContent = totalOT.toFixed(2) + " hr";
  if (dedVal) dedVal.textContent = "—"; // will come later
  if (notifVal) notifVal.textContent = notifList.length.toString();
}

function renderLatestAttendanceTable() {
  const tbody = document.getElementById("latest-attendance-tbody");
  if (!tbody) return;
  const list = getAttendance().slice(0, 10); // latest 10 entries
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

/* ---------- Full Attendance Page ---------- */
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

/* ---------- Toast popup bottom-right ---------- */
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
    setTimeout(() => {
      div.remove();
    }, 200);
  }, 4000);
}

/* ---------- User dropdown actions ---------- */
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

  // Change Password (not implemented yet, toast for now)
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

/* ---------- LOGIN ---------- */
function handleLoginSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById("login-uid").value.trim();
  const pwVal = document.getElementById("login-pw").value.trim();

  if (!idVal || !pwVal) {
    alert("Please enter UID and Password");
    return;
  }

  // check Admin first
  let found = KPS_USERS.find(
    (u) => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  // then check locally added employees (future extension)
  if (!found) {
    const employees = lsGet("kps_employees", []);
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

/* ---------- PAGE INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
    return;
  }

  // all other pages require session
  const s = requireSessionOrRedirect();
  if (!s) return;

  // fill header chip / etc.
  renderSidebarProfile();
  initUserDropdown();

  // hide Employees tab if not Admin/Manager/Supervisor
  if (s.role !== "Admin" && s.role !== "Manager" && s.role !== "Supervisor") {
    const empLink = document.getElementById("nav-employees-link");
    if (empLink) empLink.style.display = "none";
  }

  // page-specific logic
  if (page === "dashboard") {
    renderSidebarNotifications();
    renderKpis();
    renderLatestAttendanceTable();
  }

  if (page === "attendance") {
    const inBtn = document.getElementById("checkin-btn");
    const outBtn = document.getElementById("checkout-btn");
    if (inBtn) inBtn.addEventListener("click", handleCheckIn);
    if (outBtn) outBtn.addEventListener("click", handleCheckOut);
    renderAttendanceTable();
  }
});

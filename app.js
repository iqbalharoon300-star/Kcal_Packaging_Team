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

/* ---------- Default Admin ---------- */
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

/* ---------- Page Initialization ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") {
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
  } else {
    const s = requireSessionOrRedirect();
    if (!s) return;
    fillNavUserInfo();
    document.querySelectorAll("[data-logout]").forEach((b) =>
      b.addEventListener("click", signOut)
    );
  }

  if (page === "attendance") {
    document
      .getElementById("checkin-btn")
      ?.addEventListener("click", handleCheckIn);
    document
      .getElementById("checkout-btn")
      ?.addEventListener("click", handleCheckOut);
    renderAttendanceTable();
  }
});

/* ---------- LOGIN ---------- */
function handleLoginSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById("login-uid").value.trim();
  const pwVal = document.getElementById("login-pw").value.trim();

  if (!idVal || !pwVal) {
    alert("Please enter UID and Password");
    return;
  }

  let found = KPS_USERS.find(
    (u) => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  if (!found) {
    const employees = lsGet("kps_employees", []);
    found = employees.find(
      (emp) => emp.uid.toString() === idVal.toString() && emp.password === pwVal
    );
  }

  if (!found) {
    alert("❌ Invalid UID or Password");
    return;
  }

  setSession(found);
  window.location.href = "dashboard.html";
}

/* ---------- NAV INFO ---------- */
function fillNavUserInfo() {
  const s = getSession();
  if (!s) return;
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const avatar = document.getElementById("user-avatar-initials");
  if (nameEl) nameEl.textContent = s.name;
  if (roleEl) roleEl.textContent = s.role;
  if (avatar)
    avatar.textContent = s.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
}

/* ---------- ATTENDANCE ---------- */
function getNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function getAttendance() {
  return lsGet("kps_attendance", []);
}
function setAttendance(list) {
  lsSet("kps_attendance", list);
}

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

function diffHours(a, b) {
  if (!a || !b || a === "—" || b === "—") return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh + bm / 60) - (ah + am / 60);
}

function computeDuty(inT, outT) {
  let net = diffHours(inT, outT) - 1;
  if (net < 0) net = 0;
  let ot = net - 10;
  if (ot < 0) ot = 0;
  return { netHours: +net.toFixed(2), overtime: +ot.toFixed(2) };
}

function handleCheckIn() {
  const s = requireSessionOrRedirect();
  if (!s) return;
  const now = getNow();
  const list = getAttendance();
  let row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  if (row && row.in !== "—") {
    alert("Already checked IN today");
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
  renderAttendanceTable();
}

function handleCheckOut() {
  const s = requireSessionOrRedirect();
  if (!s) return;

  const now = getNow();
  const list = getAttendance();
  let row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  if (!row || row.in === "—") {
    alert("Please Check IN first");
    return;
  }
  if (row.out !== "—") {
    alert("Already checked OUT");
    return;
  }

  row.out = now.timeStr;
  const duty = computeDuty(row.in, row.out);
  row.netHours = duty.netHours;
  row.overtime = duty.overtime;
  row.status = "Present";

  setAttendance(list);
  renderAttendanceTable();
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

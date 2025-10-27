/* Kcal Packaging System (KPS) — Developed by Haroon
   Frontend logic:
   - Login/session
   - Local Storage data (Attendance / Overtime / Deduction / Requests / Notifications)
   - Auto-refresh tables
   - Timestamped notifications
*/

/* ==============
   SESSION / LOGIN
   ============== */

const KPS_USERS = [
  {
    uid: "10032",
    username: "10032",
    password: "Manager@123",
    name: "Muhammad Waqar",
    role: "Manager",
  },
  {
    uid: "10489",
    username: "10489",
    password: "Supervisor@123",
    name: "Haroon Iqbal",
    role: "Supervisor",
  },
  {
    uid: "10366",
    username: "10366",
    password: "User@123",
    name: "Sanjay Nayek",
    role: "Senior Packer",
  },
];

// save session
function setSession(user) {
  localStorage.setItem(
    "kps_session",
    JSON.stringify({
      uid: user.uid,
      name: user.name,
      role: user.role,
    })
  );
}

function getSession() {
  const raw = localStorage.getItem("kps_session");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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

function handleLoginSubmit(e) {
  e.preventDefault();
  const uidField = document.getElementById("login-uid");
  const pwField = document.getElementById("login-password");
  const errorBox = document.getElementById("login-error");

  const idVal = uidField.value.trim();
  const pwVal = pwField.value.trim();

  const found = KPS_USERS.find(
    (u) =>
      (u.uid === idVal || u.username === idVal) &&
      u.password === pwVal
  );

  if (!found) {
    if (errorBox) {
      errorBox.style.display = "block";
      errorBox.textContent = "Invalid ID or Password.";
    }
    return;
  }

  setSession(found);
  window.location.href = "dashboard.html";
}

/* ==============
   UTILITIES
   ============== */

// format timestamp "Today 10:15 AM", "Yesterday 8:42 PM", or full date
function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();

  function pad(n){ return n < 10 ? "0"+n : ""+n; }

  const sameDay = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let hours = d.getHours();
  const mins = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timePart = `${hours}:${mins} ${ampm}`;

  if (sameDay) {
    return `Today ${timePart}`;
  } else if (isYesterday) {
    return `Yesterday ${timePart}`;
  } else {
    const y = d.getFullYear();
    const m = pad(d.getMonth()+1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day} ${timePart}`;
  }
}

/* localStorage helpers */
function lsGet(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ==============
   DATA SEEDS
   ============== */

/* Attendance data */
const DEFAULT_ATTENDANCE = [
  {
    uid: "10366",
    name: "Sanjay Nayek",
    title: "Senior Packer (Kcal Life)",
    date: "2025-10-26",
    in: "08:00",
    out: "18:00",
    status: "P",
    remarks: ""
  },
  {
    uid: "10391",
    name: "Asanka Sampath",
    title: "Senior Packer (Night)",
    date: "2025-10-26",
    in: "20:00",
    out: "06:00",
    status: "P",
    remarks: ""
  },
  {
    uid: "11032",
    name: "Yogesh Sundas",
    title: "Junior Packer (Spring)",
    date: "2025-10-26",
    in: "—",
    out: "—",
    status: "DO",
    remarks: "Day Off"
  },
  {
    uid: "10907",
    name: "Rubel Ali",
    title: "Junior Packer (Night)",
    date: "2025-10-26",
    in: "—",
    out: "—",
    status: "AB",
    remarks: "No Show"
  }
];

/* Overtime data */
const DEFAULT_OVERTIME = [
  {
    date: "2025-10-26",
    uid: "10366",
    name: "Sanjay Nayek",
    inTime: "08:00",
    outTime: "19:00",
    dutyHours: "11:00",
    totalOver: "1.0",
    reason: "Order volume high",
    status: "Pending Supervisor"
  },
  {
    date: "2025-10-25",
    uid: "10391",
    name: "Asanka Sampath",
    inTime: "20:00",
    outTime: "07:00",
    dutyHours: "11:00",
    totalOver: "1.0",
    reason: "Night shortage",
    status: "Approved"
  }
];

/* Deduction data (DECIMAL AED) */
const DEFAULT_DEDUCTIONS = [
  {
    uid: "10366",
    name: "Sanjay Nayek",
    reason: "Late Coming",
    amount: 25.50,
    status: "Pending"
  },
  {
    uid: "10489",
    name: "Haroon Iqbal",
    reason: "Uniform Damage",
    amount: 50.00,
    status: "Approved"
  },
  {
    uid: "11032",
    name: "Yogesh Sundas",
    reason: "Absence",
    amount: 150.75,
    status: "Pending"
  }
];

/* Requests data */
const DEFAULT_REQUESTS = [
  {
    uid: "10366",
    name: "Sanjay Nayek",
    type: "Leave",
    description: "1 Day Sick Leave",
    status: "Approved",
    ts: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
  },
  {
    uid: "10489",
    name: "Haroon Iqbal",
    type: "Uniform",
    description: "Need new set",
    status: "Pending Supervisor",
    ts: Date.now() - 1000 * 60 * 30 // 30 min ago
  }
];

/* Notifications data */
const DEFAULT_NOTIFICATIONS = [
  {
    category: "System",
    message: "Monthly summary report is ready.",
    ts: Date.now() - 1000 * 60 * 60 * 5 // 5 hours ago
  },
  {
    category: "Request",
    message: "New uniform request from Haroon Iqbal.",
    ts: Date.now() - 1000 * 60 * 30 // 30 min ago
  },
  {
    category: "Overtime",
    message: "Overtime request from Sanjay Nayek is Pending Supervisor.",
    ts: Date.now() - 1000 * 60 * 5 // 5 min ago
  }
];

/* init data in localStorage if missing */
function initDataStore() {
  if (!localStorage.getItem("kps_attendance")) {
    lsSet("kps_attendance", DEFAULT_ATTENDANCE);
  }
  if (!localStorage.getItem("kps_overtime")) {
    lsSet("kps_overtime", DEFAULT_OVERTIME);
  }
  if (!localStorage.getItem("kps_deductions")) {
    lsSet("kps_deductions", DEFAULT_DEDUCTIONS);
  }
  if (!localStorage.getItem("kps_requests")) {
    lsSet("kps_requests", DEFAULT_REQUESTS);
  }
  if (!localStorage.getItem("kps_notifications")) {
    lsSet("kps_notifications", DEFAULT_NOTIFICATIONS);
  }
}

/* ==============
   NAV / USER CHIP
   ============== */

function fillNavUserInfo() {
  const s = getSession();
  if (!s) return;

  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const avatarEl = document.getElementById("user-avatar-initials");
  const notifEl = document.getElementById("notif-count");

  if (nameEl) nameEl.textContent = s.name;
  if (roleEl) roleEl.textContent = s.role;
  if (avatarEl) {
    const initials = s.name
      .split(" ")
      .map(p => (p[0] || "").toUpperCase())
      .slice(0,2)
      .join("");
    avatarEl.textContent = initials || "U";
  }
  if (notifEl) {
    const notes = lsGet("kps_notifications", []);
    notifEl.textContent = notes.length.toString();
  }
}

function wireGlobalLogout() {
  const els = document.querySelectorAll("[data-logout]");
  els.forEach(btn => {
    btn.addEventListener("click", signOut);
  });
}

/* ==============
   DASHBOARD
   ============== */

function loadDashboardStats() {
  const attEl = document.getElementById("stat-attendance");
  const otEl = document.getElementById("stat-overtime");
  const dedEl = document.getElementById("stat-deductions");
  const noteEl = document.getElementById("stat-notifications");

  const attendance = lsGet("kps_attendance", []);
  const overtime = lsGet("kps_overtime", []);
  const deductions = lsGet("kps_deductions", []);
  const notes = lsGet("kps_notifications", []);

  // quick mock stats
  const attendanceStat = "92% Present";
  const overtimeHrs = overtime.reduce((sum,row)=> {
    const v = parseFloat(row.totalOver || "0");
    return sum + (isNaN(v)?0:v);
  },0);
  const totalDed = deductions.reduce((sum,row)=>{
    const v = parseFloat(row.amount || "0");
    return sum + (isNaN(v)?0:v);
  },0);

  if (attEl) attEl.textContent = attendanceStat;
  if (otEl) otEl.textContent = overtimeHrs.toFixed(2) + " hrs";
  if (dedEl) dedEl.textContent = totalDed.toFixed(2) + " AED";
  if (noteEl) noteEl.textContent = notes.length + " New";
}

/* ==============
   ATTENDANCE PAGE
   ============== */

function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;
  const attendance = lsGet("kps_attendance", []);
  tbody.innerHTML = "";
  attendance.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}<br><small style="opacity:.7">${row.title}</small></td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td><span class="status-pill">${row.status}</span></td>
      <td>${row.remarks || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==============
   OVERTIME PAGE
   ============== */

function renderOvertimeTable() {
  const tbody = document.getElementById("overtime-tbody");
  if (!tbody) return;
  const rows = lsGet("kps_overtime", []);
  tbody.innerHTML = "";
  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.uid}<br><small style="opacity:.7">${r.name}</small></td>
      <td>${r.inTime} - ${r.outTime}</td>
      <td>${r.dutyHours}</td>
      <td>${r.totalOver} hr</td>
      <td>${r.reason}</td>
      <td><span class="status-pill">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function handleOvertimeSubmit(e) {
  e.preventDefault();
  const date = document.getElementById("ot-date").value;
  const uid = document.getElementById("ot-uid").value.trim();
  const name = document.getElementById("ot-name").value.trim();
  const inTime = document.getElementById("ot-in").value;
  const outTime = document.getElementById("ot-out").value;
  const dutyHours = document.getElementById("ot-duty").value;
  const totalOver = document.getElementById("ot-total").value;
  const reason = document.getElementById("ot-reason").value.trim();

  if (!date || !uid || !name) {
    alert("Please fill Date, UID, and Name.");
    return;
  }

  const current = lsGet("kps_overtime", []);
  current.unshift({
    date,
    uid,
    name,
    inTime,
    outTime,
    dutyHours,
    totalOver,
    reason,
    status: "Pending Supervisor"
  });
  lsSet("kps_overtime", current);

  // optional: create a notification
  addNotification({
    category: "Overtime",
    message: `Overtime request from ${name} is Pending Supervisor.`,
    ts: Date.now()
  });

  renderOvertimeTable();
  e.target.reset();
}

/* ==============
   DEDUCTION PAGE
   ============== */

function renderDeductionTable() {
  const tbody = document.getElementById("deduction-tbody");
  const totalEl = document.getElementById("deduction-total");
  if (!tbody) return;
  const rows = lsGet("kps_deductions", []);
  tbody.innerHTML = "";

  let total = 0;
  rows.forEach(r => {
    const amt = parseFloat(r.amount || "0") || 0;
    total += amt;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.reason}</td>
      <td>${amt.toFixed(2)} AED</td>
      <td><span class="status-pill">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });

  if (totalEl) {
    totalEl.textContent = total.toFixed(2) + " AED";
  }
}

function handleDeductionSubmit(e) {
  e.preventDefault();
  const uid = document.getElementById("ded-uid").value.trim();
  const name = document.getElementById("ded-name").value.trim();
  const reason = document.getElementById("ded-reason").value.trim();
  const amount = document.getElementById("ded-amount").value.trim();
  const status = document.getElementById("ded-status").value;

  if (!uid || !name || !amount) {
    alert("Please fill UID, Name and Amount.");
    return;
  }

  const current = lsGet("kps_deductions", []);
  current.unshift({
    uid,
    name,
    reason,
    amount: parseFloat(amount),
    status
  });
  lsSet("kps_deductions", current);

  // also notify
  addNotification({
    category: "System",
    message: `Deduction recorded for ${name}: ${amount} AED (${reason}).`,
    ts: Date.now()
  });

  renderDeductionTable();
  e.target.reset();
}

/* ==============
   REQUEST PAGE
   ============== */

function renderRequestTable() {
  const tbody = document.getElementById("request-tbody");
  if (!tbody) return;
  const rows = lsGet("kps_requests", []);
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.type}</td>
      <td>${r.description}</td>
      <td><span class="status-pill">${r.status}</span></td>
      <td><small>${formatTimestamp(r.ts)}</small></td>
    `;
    tbody.appendChild(tr);
  });
}

function handleRequestSubmit(e) {
  e.preventDefault();
  const uid = document.getElementById("req-uid").value.trim();
  const name = document.getElementById("req-name").value.trim();
  const type = document.getElementById("req-type").value;
  const desc = document.getElementById("req-desc").value.trim();

  if (!uid || !name || !type) {
    alert("Please fill UID, Name and Type.");
    return;
  }

  const nowTs = Date.now();

  // add request
  const requests = lsGet("kps_requests", []);
  requests.unshift({
    uid,
    name,
    type,
    description: desc,
    status: "Pending Supervisor",
    ts: nowTs
  });
  lsSet("kps_requests", requests);

  // add notification
  addNotification({
    category: "Request",
    message: `New ${type} request from ${name}.`,
    ts: nowTs
  });

  renderRequestTable();
  e.target.reset();
}

/* ==============
   NOTIFICATIONS PAGE
   ============== */

function addNotification(note) {
  const notes = lsGet("kps_notifications", []);
  notes.unshift(note);
  lsSet("kps_notifications", notes);
}

function renderNotifications() {
  const wrap = document.getElementById("notifications-list");
  if (!wrap) return;

  const filterSel = document.getElementById("notif-filter");
  const wanted = filterSel ? filterSel.value : "All";

  const notes = lsGet("kps_notifications", []);
  wrap.innerHTML = "";

  notes
    .filter(n => wanted === "All" ? true : n.category === wanted)
    .forEach(n => {
      const row = document.createElement("div");
      row.className = "note-row";
      row.innerHTML = `
        <div class="note-head">
          <span class="note-badge">${n.category}</span>
          <span class="note-time">${formatTimestamp(n.ts)}</span>
        </div>
        <div class="note-body">${n.message}</div>
      `;
      wrap.appendChild(row);
    });
}

function wireNotificationFilter() {
  const filterSel = document.getElementById("notif-filter");
  if (!filterSel) return;
  filterSel.addEventListener("change", renderNotifications);
}

/* ==============
   INIT PER PAGE
   ============== */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  // special case: login
  if (page === "login") {
    initDataStore(); // make sure demo data is seeded
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
    return;
  }

  // all other pages require session
  initDataStore();
  const session = requireSessionOrRedirect();
  if (!session) return;

  fillNavUserInfo();
  wireGlobalLogout();

  if (page === "dashboard") {
    loadDashboardStats();
  }

  if (page === "attendance") {
    renderAttendanceTable();
  }

  if (page === "overtime") {
    renderOvertimeTable();
    const otForm = document.getElementById("overtime-form");
    if (otForm) otForm.addEventListener("submit", handleOvertimeSubmit);
  }

  if (page === "deduction") {
    renderDeductionTable();
    const dedForm = document.getElementById("deduction-form");
    if (dedForm) dedForm.addEventListener("submit", handleDeductionSubmit);
  }

  if (page === "request") {
    renderRequestTable();
    const reqForm = document.getElementById("request-form");
    if (reqForm) reqForm.addEventListener("submit", handleRequestSubmit);
  }

  if (page === "notifications") {
    wireNotificationFilter();
    renderNotifications();
  }
});

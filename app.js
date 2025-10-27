/*
Kcal Packaging System (KPS)
Full Frontend Logic
Author: Haroon

Features:
- Login & Session
- Role-based nav
- Monthly attendance rollover (archives by YYYY_MM)
- Check IN / OUT with Auto Break and Overtime
- Dashboard metrics
- Notifications
- Employee Directory CRUD
- Profile view/edit & photo
*/

/* =========================================================
   UTIL: LOCAL STORAGE SAFE GET / SET
   ========================================================= */

function lsGet(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* =========================================================
   SYSTEM USERS (LOGIN ACCOUNTS)
   ========================================================= */

const KPS_USERS = [
  {
    uid: "10001",
    username: "10001",
    password: "Admin@123",
    name: "System Admin",
    role: "Admin",
    section: "Central Admin",
    shift: "Day",
    joinDate: "2023-01-01"
  },
  {
    uid: "10032",
    username: "10032",
    password: "Manager@123",
    name: "Muhammad Waqar",
    role: "Manager",
    section: "Packaging - Meal Plan / Day",
    shift: "Day",
    joinDate: "2022-06-15"
  },
  {
    uid: "10489",
    username: "10489",
    password: "Supervisor@123",
    name: "Haroon Iqbal",
    role: "Supervisor",
    section: "Packaging - Kcal Life / Night",
    shift: "Night",
    joinDate: "2022-11-03"
  },
  {
    uid: "10366",
    username: "10366",
    password: "User@123",
    name: "Sanjay Nayek",
    role: "Senior Packer",
    section: "Packaging - Kcal Life",
    shift: "Day",
    joinDate: "2021-09-20"
  },
  {
    uid: "11032",
    username: "11032",
    password: "User@123",
    name: "Yogesh Sundas",
    role: "Junior Packer",
    section: "Packaging - Spring",
    shift: "Night",
    joinDate: "2024-03-12"
  }
];

/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

function setSession(user) {
  lsSet("kps_session", {
    uid: user.uid,
    name: user.name,
    role: user.role,
    section: user.section || "",
    shift: user.shift || "",
    joinDate: user.joinDate || ""
  });
}

function getSession() {
  return lsGet("kps_session", null);
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

/* login submit handler */
function handleLoginSubmit(e) {
  e.preventDefault();
  const uidField = document.getElementById("login-uid");
  const pwField = document.getElementById("login-password");
  const errorBox = document.getElementById("login-error");

  const idVal = uidField.value.trim();
  const pwVal = pwField.value.trim();

  const found = KPS_USERS.find(
    u =>
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

  // set logged-in session
  setSession(found);

  // run rollover check once on login
  monthlyAttendanceRollover();

  // go dashboard
  window.location.href = "dashboard.html";
}

/* =========================================================
   MONTHLY ATTENDANCE ROLLOVER
   ========================================================= */
/*
Rules:
- We store current month's attendance in "kps_attendance".
- On a new month, we archive the previous data into:
  "kps_attendance_archive_YYYY_MM"
  Then wipe kps_attendance = [].
- We detect new month by comparing a stored marker "kps_attendance_month"
  to the actual current YYYY-MM.
*/

function currentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

function monthlyAttendanceRollover() {
  const thisYM = currentYearMonth();
  const storedYM = localStorage.getItem("kps_attendance_month");

  // First run ever or same month -> just set marker
  if (!storedYM || storedYM === thisYM) {
    localStorage.setItem("kps_attendance_month", thisYM);
    return;
  }

  // Month changed → archive old attendance list
  const prevAttendance = lsGet("kps_attendance", []);
  if (prevAttendance.length > 0) {
    const archiveKey = "kps_attendance_archive_" + storedYM.replace("-", "_");
    lsSet(archiveKey, prevAttendance);
  }

  // reset new month
  lsSet("kps_attendance", []);
  localStorage.setItem("kps_attendance_month", thisYM);
}

/* =========================================================
   DEFAULT DATA SEED (first run)
   ========================================================= */

const DEFAULT_ATTENDANCE = [
  {
    uid: "10366",
    name: "Sanjay Nayek",
    title: "Senior Packer (Kcal Life)",
    date: "2025-10-26",
    in: "08:00",
    out: "18:00",
    netHours: 9.0,      // (OUT-IN) - 1 hour break
    overtime: 0.0,      // netHours -10 (min 0)
    status: "Present"
  },
  {
    uid: "11032",
    name: "Yogesh Sundas",
    title: "Junior Packer (Spring)",
    date: "2025-10-26",
    in: "—",
    out: "—",
    netHours: 0,
    overtime: 0,
    status: "DO" // Day Off
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    category: "System",
    message: "Monthly summary report is ready.",
    ts: Date.now() - 1000 * 60 * 60 * 5
  }
];

const DEFAULT_EMPLOYEES = [
  {
    uid: "10001",
    name: "System Admin",
    role: "Admin",
    section: "Central Admin",
    shift: "Day",
    joinDate: "2023-01-01",
    updatedAt: "2025-10-27 08:30"
  },
  {
    uid: "10032",
    name: "Muhammad Waqar",
    role: "Manager",
    section: "Packaging - Meal Plan / Day",
    shift: "Day",
    joinDate: "2022-06-15",
    updatedAt: "2025-10-27 08:30"
  },
  {
    uid: "10489",
    name: "Haroon Iqbal",
    role: "Supervisor",
    section: "Packaging - Kcal Life / Night",
    shift: "Night",
    joinDate: "2022-11-03",
    updatedAt: "2025-10-27 08:30"
  },
  {
    uid: "10366",
    name: "Sanjay Nayek",
    role: "Senior Packer",
    section: "Packaging - Kcal Life",
    shift: "Day",
    joinDate: "2021-09-20",
    updatedAt: "2025-10-27 08:30"
  },
  {
    uid: "11032",
    name: "Yogesh Sundas",
    role: "Junior Packer",
    section: "Packaging - Spring",
    shift: "Night",
    joinDate: "2024-03-12",
    updatedAt: "2025-10-27 08:30"
  }
];

/* profile extended fields per uid:
   { [uid]: { email:"", phone:"", photoDataUrl:"" } }
*/
function getProfileStore() {
  return lsGet("kps_profiles", {});
}
function setProfileStore(store) {
  lsSet("kps_profiles", store);
}

function initDataStore() {
  if (!localStorage.getItem("kps_attendance")) {
    lsSet("kps_attendance", DEFAULT_ATTENDANCE);
  }
  if (!localStorage.getItem("kps_attendance_month")) {
    localStorage.setItem("kps_attendance_month", currentYearMonth());
  }
  if (!localStorage.getItem("kps_notifications")) {
    lsSet("kps_notifications", DEFAULT_NOTIFICATIONS);
  }
  if (!localStorage.getItem("kps_employees")) {
    lsSet("kps_employees", DEFAULT_EMPLOYEES);
  }
  if (!localStorage.getItem("kps_profiles")) {
    const blankProfiles = {};
    DEFAULT_EMPLOYEES.forEach(emp => {
      blankProfiles[emp.uid] = {
        email: "",
        phone: "",
        photoDataUrl: ""
      };
    });
    setProfileStore(blankProfiles);
  }
}

/* =========================================================
   TIME HELPERS / ATTENDANCE CALC
   ========================================================= */

function getNow() {
  const now = new Date();
  const Y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const D = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return {
    dateStr: `${Y}-${M}-${D}`,
    timeStr: `${h}:${m}`,
    raw: now
  };
}

function diffHours(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM || startHHMM === "—" || endHHMM === "—") return 0;
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diffMin = endMin - startMin;
  if (diffMin <= 0) return 0;
  return diffMin / 60;
}

/* Rule:
   netHours = (OUT - IN) - 1h break
   overtime = max(0, netHours - 10)
*/
function computeDuty(inTime, outTime) {
  const totalH = diffHours(inTime, outTime);
  let net = totalH - 1;
  if (net < 0) net = 0;
  let overtime = net - 10;
  if (overtime < 0) overtime = 0;
  // round
  net = Math.round(net * 100) / 100;
  overtime = Math.round(overtime * 100) / 100;
  return { netHours: net, overtime };
}

function rowStatus(inTime, outTime) {
  if (inTime !== "—" && outTime !== "—") return "Present";
  if (inTime !== "—" && outTime === "—") return "Half Day";
  if (inTime === "—" && outTime === "—") return "AB";
  return "Present";
}

/* =========================================================
   ATTENDANCE STORAGE HELPERS
   ========================================================= */

function getAttendance() {
  return lsGet("kps_attendance", []);
}
function setAttendance(list) {
  lsSet("kps_attendance", list);
}

function findTodayAttendanceForUser(uid, dateStr, list) {
  return list.find(r => r.uid === uid && r.date === dateStr);
}

function ensureTodayRowForUser(user) {
  const nowObj = getNow();
  const list = getAttendance();
  let row = findTodayAttendanceForUser(user.uid, nowObj.dateStr, list);
  if (!row) {
    row = {
      uid: user.uid,
      name: user.name,
      title: user.role,
      date: nowObj.dateStr,
      in: "—",
      out: "—",
      netHours: 0,
      overtime: 0,
      status: "AB"
    };
    list.unshift(row);
    setAttendance(list);
  }
  return row;
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function getNotifications() {
  return lsGet("kps_notifications", []);
}
function setNotifications(list) {
  lsSet("kps_notifications", list);
}

function addNotification(note) {
  const notes = getNotifications();
  notes.unshift(note);
  setNotifications(notes);
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const pad = n => (n < 10 ? "0" + n : "" + n);

  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();

  let hours = d.getHours();
  const mins = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timePart = `${hours}:${mins} ${ampm}`;

  if (sameDay) return `Today ${timePart}`;
  if (isYesterday) return `Yesterday ${timePart}`;

  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day} ${timePart}`;
}

/* =========================================================
   NAV / HEADER FILLERS (user chip, notif count, nav visibility)
   ========================================================= */

function canManageEmployees(role) {
  return role === "Admin" || role === "Manager" || role === "Supervisor";
}

function getAvatarData(uid, name) {
  // try profile image
  const profiles = getProfileStore();
  const p = profiles[uid];
  if (p && p.photoDataUrl) {
    return { type: "img", src: p.photoDataUrl };
  }
  // fallback initials
  const initials = (name || "U")
    .split(" ")
    .map(part => (part[0] || "").toUpperCase())
    .slice(0,2)
    .join("");
  return { type: "text", txt: initials };
}

function fillNavUserInfo() {
  const s = getSession();
  if (!s) return;

  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const avatarEl = document.getElementById("user-avatar-initials");
  const notifEl = document.getElementById("notif-count");
  const navEmployeesLink = document.getElementById("nav-employees-link");

  if (nameEl) nameEl.textContent = s.name;
  if (roleEl) roleEl.textContent = s.role;

  // avatar
  if (avatarEl) {
    const av = getAvatarData(s.uid, s.name);
    if (av.type === "img") {
      avatarEl.innerHTML = `<img src="${av.src}" alt="avatar" />`;
    } else {
      avatarEl.textContent = av.txt;
    }
  }

  // notif count
  if (notifEl) {
    const n = getNotifications();
    notifEl.textContent = n.length.toString();
  }

  // hide Employees in nav if you don't have rights
  if (navEmployeesLink && !canManageEmployees(s.role)) {
    navEmployeesLink.style.display = "none";
  }
}

function wireGlobalLogout() {
  const logoutBtns = document.querySelectorAll("[data-logout]");
  logoutBtns.forEach(btn => {
    btn.addEventListener("click", signOut);
  });
}

/* =========================================================
   ATTENDANCE PAGE LOGIC (check in/out, table render)
   ========================================================= */

function handleCheckIn() {
  const session = getSession();
  if (!session) return;
  const nowObj = getNow();
  const list = getAttendance();

  let row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  if (!row) {
    row = {
      uid: session.uid,
      name: session.name,
      title: session.role,
      date: nowObj.dateStr,
      in: nowObj.timeStr,
      out: "—",
      netHours: 0,
      overtime: 0,
      status: "Present"
    };
    list.unshift(row);
  } else {
    if (row.in !== "—") {
      alert("You are already checked IN.");
      renderAttendanceTable();
      fillTodaySummaryBox();
      updateCheckButtonsState();
      return;
    }
    row.in = nowObj.timeStr;
    row.status = "Present";
  }

  setAttendance(list);

  addNotification({
    category: "Attendance",
    message: `${session.name} checked IN at ${nowObj.timeStr}`,
    ts: Date.now()
  });

  renderAttendanceTable();
  fillTodaySummaryBox();
  updateCheckButtonsState();
  fillProfileDataFromAttendance(); // sync profile page if open
}

function handleCheckOut() {
  const session = getSession();
  if (!session) return;
  const nowObj = getNow();
  const list = getAttendance();

  let row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  if (!row || row.in === "—") {
    alert("You did not Check IN yet.");
    return;
  }
  if (row.out !== "—") {
    alert("You already checked OUT.");
    return;
  }

  row.out = nowObj.timeStr;

  // calculate net duty and overtime
  const duty = computeDuty(row.in, row.out);
  row.netHours = duty.netHours;
  row.overtime = duty.overtime;
  row.status = rowStatus(row.in, row.out);

  setAttendance(list);

  addNotification({
    category: "Attendance",
    message: `${session.name} checked OUT at ${nowObj.timeStr} (OT ${row.overtime.toFixed(
      2
    )} hr)`,
    ts: Date.now()
  });

  renderAttendanceTable();
  fillTodaySummaryBox();
  updateCheckButtonsState();
  fillProfileDataFromAttendance(); // sync profile if open
}

/* fill Today's summary block on Attendance page */
function fillTodaySummaryBox() {
  const dateLabel = document.getElementById("today-date-label");
  const inEl = document.getElementById("today-in");
  const outEl = document.getElementById("today-out");
  const dutyEl = document.getElementById("today-duty");
  const otEl = document.getElementById("today-ot");
  const stEl = document.getElementById("today-status");

  if (!dateLabel) return;

  const session = getSession();
  const nowObj = getNow();
  const list = getAttendance();
  const row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  dateLabel.textContent = nowObj.dateStr;
  if (!row) {
    inEl.textContent = "--:--";
    outEl.textContent = "--:--";
    dutyEl.textContent = "0.00 hr";
    otEl.textContent = "0.00 hr";
    stEl.textContent = "AB";
    return;
  }

  inEl.textContent = row.in || "--:--";
  outEl.textContent = row.out || "--:--";
  dutyEl.textContent = row.netHours
    ? row.netHours.toFixed(2) + " hr"
    : "0.00 hr";
  otEl.textContent = row.overtime
    ? row.overtime.toFixed(2) + " hr"
    : "0.00 hr";
  stEl.textContent = row.status || "AB";
}

/* enable/disable attendance buttons */
function updateCheckButtonsState() {
  const checkInBtn = document.getElementById("checkin-btn");
  const checkOutBtn = document.getElementById("checkout-btn");
  if (!checkInBtn || !checkOutBtn) return;

  const session = getSession();
  const nowObj = getNow();
  const list = getAttendance();
  const row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  checkInBtn.disabled = false;
  checkOutBtn.disabled = true;

  if (!row) {
    // not checked in yet today
    return;
  }

  if (row.in !== "—") {
    checkInBtn.disabled = true;
    if (row.out === "—") {
      checkOutBtn.disabled = false;
    }
  }

  if (row.out !== "—") {
    checkOutBtn.disabled = true;
  }
}

/* render main attendance table */
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;
  const list = getAttendance().slice(); // copy

  // newest date first
  list.sort((a,b)=>{
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  tbody.innerHTML = "";
  list.forEach(row => {
    const otDisplay = row.overtime && row.overtime > 0
      ? `<span class="ot-pill">${row.overtime.toFixed(2)} hr OT</span>`
      : `<span class="ot-pill-zero">0.00 hr</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}<br><small>${row.title}</small></td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td>${row.netHours ? row.netHours.toFixed(2) : "0.00"}</td>
      <td>${otDisplay}</td>
      <td><span class="status-pill">${row.status || ""}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* export attendance list to CSV (Attendance page "Export") */
function wireAttendanceExport() {
  const btn = document.getElementById("export-attendance");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const all = getAttendance();

    const header = [
      "UID",
      "Name",
      "Role",
      "Date",
      "Check IN",
      "Check OUT",
      "Net Duty (hr)",
      "Overtime (hr)",
      "Status"
    ];

    const rows = all.map(r => [
      r.uid,
      r.name,
      r.title,
      r.date,
      r.in,
      r.out,
      r.netHours ? r.netHours.toFixed(2) : "0.00",
      r.overtime ? r.overtime.toFixed(2) : "0.00",
      r.status || ""
    ]);

    const csv = [header, ...rows]
      .map(arr => arr.map(x => `"${(x||"").replace(/"/g,'""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_export.csv";
    a.click();

    URL.revokeObjectURL(url);
  });
}

/* =========================================================
   DASHBOARD PAGE LOGIC
   ========================================================= */

function loadDashboardStats() {
  const attEl = document.getElementById("stat-attendance");
  const otEl  = document.getElementById("stat-overtime");
  const dedEl = document.getElementById("stat-deductions");
  const noteEl= document.getElementById("stat-notifications");

  const attendance = getAttendance();
  const notes = getNotifications();

  // Simplified "92% Present" — we could improve later
  const attendanceStat = "92% Present";

  const totalOT = attendance.reduce((sum, row)=>{
    const v = parseFloat(row.overtime || "0");
    return sum + (isNaN(v)?0:v);
  },0);

  // placeholder for Deductions
  let totalDed = 0.00;
  const dedData = lsGet("kps_deductions", []);
  if (Array.isArray(dedData)) {
    totalDed = dedData.reduce((sum,r)=>{
      const v = parseFloat(r.amount || "0");
      return sum + (isNaN(v)?0:v);
    },0);
  }

  if (attEl)  attEl.textContent  = attendanceStat;
  if (otEl)   otEl.textContent   = totalOT.toFixed(2) + " hrs";
  if (dedEl)  dedEl.textContent  = totalDed.toFixed(2) + " AED";
  if (noteEl) noteEl.textContent = notes.length + " New";

  // also fill dashboard table of recent attendance
  renderDashboardAttendanceLatest();
}

function renderDashboardAttendanceLatest() {
  const wrap = document.getElementById("dashboard-attendance-latest");
  if (!wrap) return;
  const list = getAttendance().slice();
  // newest first
  list.sort((a,b)=>{
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });
  const recent = list.slice(0,5);

  wrap.innerHTML = "";
  recent.forEach(r => {
    const otDisp = r.overtime && r.overtime > 0
      ? `<span class="ot-pill">${r.overtime.toFixed(2)} hr OT</span>`
      : `<span class="ot-pill-zero">0.00 hr</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}<br><small>${r.title}</small></td>
      <td>${r.date}</td>
      <td>${r.in}</td>
      <td>${r.out}</td>
      <td>${r.netHours ? r.netHours.toFixed(2) : "0.00"}</td>
      <td>${otDisp}</td>
      <td><span class="status-pill">${r.status || ""}</span></td>
    `;
    wrap.appendChild(tr);
  });
}
/* =========================================================
   EMPLOYEES PAGE LOGIC
   ========================================================= */

function getEmployees() {
  return lsGet("kps_employees", []);
}
function setEmployees(list) {
  lsSet("kps_employees", list);
}

/* visible employees depend on role */
function getVisibleEmployeesForSession() {
  const session = getSession();
  const all = getEmployees();
  if (!session) return [];

  if (session.role === "Admin") {
    return all;
  }

  if (session.role === "Manager") {
    // Manager sees only "Packaging" employees
    return all.filter(emp =>
      (emp.section || "").toLowerCase().includes("packag")
    );
  }

  if (session.role === "Supervisor") {
    // Supervisor sees only their section
    const sec = (session.section || "").toLowerCase();
    return all.filter(emp =>
      (emp.section || "").toLowerCase().includes(sec)
    );
  }

  // Regular staff only sees themself
  return all.filter(emp => emp.uid === session.uid);
}

/* RENDER TABLE */
function renderEmployeesTable() {
  const tbody = document.getElementById("emp-tbody");
  if (!tbody) return;

  const searchBox = document.getElementById("emp-search");
  const q = searchBox ? searchBox.value.trim().toLowerCase() : "";

  const list = getVisibleEmployeesForSession();
  const canManage = canManageEmployees(getSession().role);

  tbody.innerHTML = "";

  list
    .filter(emp =>
      !q
        ? true
        : (emp.name || "").toLowerCase().includes(q) ||
          (emp.uid || "").toLowerCase().includes(q)
    )
    .forEach(emp => {
      const row = document.createElement("tr");

      // Action buttons
      let actionsHTML = `
        <div class="row-actions">
          <button class="action-btn action-profile" data-open-profile="${emp.uid}">
            Profile
          </button>
      `;
      if (canManage) {
        actionsHTML += `
          <button class="action-btn action-edit" data-edit-id="${emp.uid}">
            Edit
          </button>
          <button class="action-btn action-delete" data-del-id="${emp.uid}">
            Delete
          </button>
        `;
      }
      actionsHTML += `</div>`;

      row.innerHTML = `
        <td>${emp.uid}</td>
        <td>${emp.name}</td>
        <td>${emp.role}</td>
        <td>${emp.section || ""}</td>
        <td>${emp.shift || ""}</td>
        <td>${emp.joinDate || ""}</td>
        <td>${actionsHTML}</td>
      `;

      tbody.appendChild(row);
    });

  // Wire row buttons:
  // Edit
  tbody.querySelectorAll("[data-edit-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-id");
      openEmployeeModal("edit", id);
    });
  });

  // Delete
  tbody.querySelectorAll("[data-del-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-id");
      deleteEmployee(id);
    });
  });

  // Profile
  tbody.querySelectorAll("[data-open-profile]").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-open-profile");
      // Save so profile.html knows which profile to open
      localStorage.setItem("kps_profile_view_uid", uid);
      window.location.href = "profile.html";
    });
  });
}

/* OPEN/CLOSE MODAL */

function openEmployeeModal(mode, existingUid) {
  const modal = document.getElementById("emp-modal");
  const titleEl = document.getElementById("emp-modal-title");

  const idInput = document.getElementById("emp-id");
  const nameInput = document.getElementById("emp-name");
  const roleInput = document.getElementById("emp-role");
  const sectionInput = document.getElementById("emp-section");
  const shiftInput = document.getElementById("emp-shift");
  const joinInput = document.getElementById("emp-join");

  if (!modal) return;
  const employees = getEmployees();

  if (mode === "edit") {
    const emp = employees.find(e => e.uid === existingUid);
    if (!emp) return;
    titleEl.textContent = "Edit Employee";
    idInput.value = emp.uid;
    idInput.disabled = true;
    nameInput.value = emp.name || "";
    roleInput.value = emp.role || "";
    sectionInput.value = emp.section || "";
    shiftInput.value = emp.shift || "";
    joinInput.value = emp.joinDate || "";
    modal.dataset.mode = "edit";
    modal.dataset.targetUid = emp.uid;
  } else {
    titleEl.textContent = "Add Employee";
    idInput.disabled = false;
    idInput.value = "";
    nameInput.value = "";
    roleInput.value = "";
    sectionInput.value = "";
    shiftInput.value = "";
    joinInput.value = "";
    modal.dataset.mode = "add";
    modal.dataset.targetUid = "";
  }

  modal.style.display = "flex";
}

function closeEmployeeModal() {
  const modal = document.getElementById("emp-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

/* SAVE EMPLOYEE FROM MODAL */

function saveEmployeeFromModal(e) {
  e.preventDefault();
  const modal = document.getElementById("emp-modal");
  if (!modal) return;

  const idInput = document.getElementById("emp-id");
  const nameInput = document.getElementById("emp-name");
  const roleInput = document.getElementById("emp-role");
  const sectionInput = document.getElementById("emp-section");
  const shiftInput = document.getElementById("emp-shift");
  const joinInput = document.getElementById("emp-join");

  const uid = idInput.value.trim();
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  const section = sectionInput.value.trim();
  const shift = shiftInput.value.trim();
  const joinDate = joinInput.value.trim();

  if (!uid || !name || !role) {
    alert("Please fill UID, Name, Role.");
    return;
  }

  const list = getEmployees();
  const now = new Date();
  const updatedAt = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(
    2,
    "0"
  )} ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  if (modal.dataset.mode === "edit") {
    const targetUid = modal.dataset.targetUid;
    const idx = list.findIndex(e => e.uid === targetUid);
    if (idx === -1) return;

    list[idx] = {
      uid,
      name,
      role,
      section,
      shift,
      joinDate,
      updatedAt
    };
  } else {
    // check duplicate uid
    if (list.find(e => e.uid === uid)) {
      alert("UID already exists.");
      return;
    }
    list.unshift({
      uid,
      name,
      role,
      section,
      shift,
      joinDate,
      updatedAt
    });

    // also create blank profile if new
    const profStore = getProfileStore();
    if (!profStore[uid]) {
      profStore[uid] = { email: "", phone: "", photoDataUrl: "" };
      setProfileStore(profStore);
    }
  }

  setEmployees(list);
  closeEmployeeModal();
  renderEmployeesTable();
}

/* DELETE EMPLOYEE */

function deleteEmployee(uid) {
  const session = getSession();
  if (!session || !canManageEmployees(session.role)) {
    alert("You do not have permission.");
    return;
  }
  if (!confirm("Delete this employee?")) return;

  let list = getEmployees();
  list = list.filter(e => e.uid !== uid);
  setEmployees(list);
  renderEmployeesTable();
}

/* INIT EMPLOYEES PAGE */

function initEmployeesPage() {
  const session = getSession();
  if (!session) return;

  const canManage = canManageEmployees(session.role);

  // Hide add button if cannot manage
  const addBtn = document.getElementById("add-emp-btn");
  if (addBtn) {
    if (!canManage) {
      addBtn.style.display = "none";
    } else {
      addBtn.addEventListener("click", () => openEmployeeModal("add", ""));
    }
  }

  const searchInput = document.getElementById("emp-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderEmployeesTable);
  }

  // modal controls
  const modal = document.getElementById("emp-modal");
  const form = document.getElementById("emp-form");
  const closeBtn = document.getElementById("close-modal");

  if (modal && form) {
    form.addEventListener("submit", saveEmployeeFromModal);
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", closeEmployeeModal);
  }
  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeEmployeeModal();
    });
  }

  renderEmployeesTable();
}

/* =========================================================
   PROFILE PAGE LOGIC
   ========================================================= */

/*
Which user's profile do we show?
- If Admin/Manager/Supervisor clicked "Profile" on employees page,
  we stored localStorage.kps_profile_view_uid.
- Otherwise, show current logged-in user.
*/
function getProfileTargetUid() {
  const session = getSession();
  if (!session) return null;

  const forced = localStorage.getItem("kps_profile_view_uid");
  if (forced && canManageEmployees(session.role)) {
    return forced;
  }

  return session.uid;
}

function getEmployeeByUid(uid) {
  // try employees storage first
  const list = getEmployees();
  const emp = list.find(e => e.uid === uid);
  if (emp) return emp;

  // fallback to built-in user list
  const u = KPS_USERS.find(u => u.uid === uid);
  if (!u) {
    return {
      uid,
      name: "Unknown",
      role: "",
      section: "",
      shift: "",
      joinDate: ""
    };
  }
  return {
    uid: u.uid,
    name: u.name,
    role: u.role,
    section: u.section || "",
    shift: u.shift || "",
    joinDate: u.joinDate || ""
  };
}

/* fill Profile header card info */
function renderProfileHeader() {
  const uidTarget = getProfileTargetUid();
  if (!uidTarget) return;

  const emp = getEmployeeByUid(uidTarget);
  const profiles = getProfileStore();
  const mine = profiles[uidTarget] || { email: "", phone: "", photoDataUrl: "" };

  // Elements
  const nameEl = document.getElementById("profile-name");
  const roleEl = document.getElementById("profile-role");
  const uidEl = document.getElementById("profile-uid");
  const emailEl = document.getElementById("profile-email");
  const phoneEl = document.getElementById("profile-phone");
  const photoEl = document.getElementById("profile-photo");
  const uploadInput = document.getElementById("profile-upload");
  const saveBtn = document.getElementById("save-profile");

  if (nameEl) nameEl.textContent = emp.name || "(no name)";
  if (roleEl) {
    roleEl.textContent = emp.role + (emp.section ? " • " + emp.section : "");
  }
  if (uidEl) uidEl.textContent = emp.uid;
  if (emailEl) emailEl.value = mine.email || "";
  if (phoneEl) phoneEl.value = mine.phone || "";

  // photo / avatar logic
  if (photoEl) {
    if (mine.photoDataUrl) {
      photoEl.src = mine.photoDataUrl;
    } else {
      // fallback to default avatar
      photoEl.src = "./assets/default-avatar.png";
    }
  }

  // upload new photo preview
  if (uploadInput) {
    uploadInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        if (photoEl) photoEl.src = dataUrl;

        // store temporarily in DOM dataset so we can save later
        photoEl.dataset.newphoto = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // save profile click
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const profiles = getProfileStore();
      if (!profiles[uidTarget]) {
        profiles[uidTarget] = { email: "", phone: "", photoDataUrl: "" };
      }
      profiles[uidTarget].email = emailEl ? emailEl.value.trim() : "";
      profiles[uidTarget].phone = phoneEl ? phoneEl.value.trim() : "";
      if (photoEl && photoEl.dataset.newphoto) {
        profiles[uidTarget].photoDataUrl = photoEl.dataset.newphoto;
        delete photoEl.dataset.newphoto;
      }
      setProfileStore(profiles);
      alert("Profile saved.");
      // refresh nav avatar if this is my own profile
      fillNavUserInfo();
    });
  }
}

/* Fill recent attendance for profile (last 7 rows) */
function renderProfileAttendanceHistory() {
  const tbody = document.getElementById("profile-attendance-tbody");
  if (!tbody) return;

  const uidTarget = getProfileTargetUid();
  if (!uidTarget) return;

  const all = getAttendance()
    .filter(r => r.uid === uidTarget)
    .slice();

  // sort newest first
  all.sort((a,b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  const recent = all.slice(0,7);

  tbody.innerHTML = "";
  recent.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td>${row.netHours ? row.netHours.toFixed(2) : "0.00"}</td>
      <td>${row.overtime ? row.overtime.toFixed(2) : "0.00"}</td>
      <td><span class="status-pill">${row.status || ""}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* Keep profile page synced with today's attendance after Check IN/OUT */
function fillProfileDataFromAttendance() {
  // just rerender profile pieces if we're already on that page
  if (document.body.dataset.page === "profile") {
    renderProfileAttendanceHistory();
  }
}

/* =========================================================
   NOTIFICATIONS PAGE LOGIC
   ========================================================= */

function renderNotificationsPage() {
  const listEl = document.getElementById("notif-list");
  if (!listEl) return;
  const notes = getNotifications();

  listEl.innerHTML = "";

  notes.forEach(n => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="notif-row-top">
        <span class="notif-category-pill">${n.category}</span>
        <span>${formatTimestamp(n.ts)}</span>
      </div>
      <div>${n.message}</div>
    `;
    listEl.appendChild(li);
  });
}

/* =========================================================
   PAGE INITIALIZATION ROUTER
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  // LOGIN PAGE
  if (page === "login") {
    // first-time data setup
    initDataStore();
    // Rollover monthly attendance if needed (edge: returning after long time)
    monthlyAttendanceRollover();

    const form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", handleLoginSubmit);
    }
    return;
  }
// Always reset profile view when using nav link
document.addEventListener("click", (e) => {
  if (e.target.tagName === "A" && e.target.getAttribute("href") === "profile.html") {
    localStorage.removeItem("kps_profile_view_uid");
  }
});
  // ALL OTHER PAGES REQUIRE LOGIN
  initDataStore();
  monthlyAttendanceRollover();
  const session = requireSessionOrRedirect();
  if (!session) return;

  // fill nav user info + logout clicks
  fillNavUserInfo();
  wireGlobalLogout();

  // route
  if (page === "dashboard") {
    loadDashboardStats();
  }

  if (page === "attendance") {
    renderAttendanceTable();
    fillTodaySummaryBox();
    updateCheckButtonsState();
    wireAttendanceExport();

    const cin = document.getElementById("checkin-btn");
    if (cin) cin.addEventListener("click", handleCheckIn);

    const cout = document.getElementById("checkout-btn");
    if (cout) cout.addEventListener("click", handleCheckOut);
  }

  if (page === "employees") {
    initEmployeesPage();
  }

  if (page === "profile") {
    renderProfileHeader();
    renderProfileAttendanceHistory();
  }

  if (page === "notifications") {
    renderNotificationsPage();
  }
});
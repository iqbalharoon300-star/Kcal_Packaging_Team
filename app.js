/* Kcal Packaging System (KPS) — Developed by Haroon
   app.js
   Version: Attendance Check IN/OUT + Overtime Calculation
*/

/* ==========================
   USERS / SESSION MANAGEMENT
   ========================== */

const KPS_USERS = [
  {
    uid: "10001",
    username: "10001",
    password: "Admin@123",
    name: "System Admin",
    role: "Admin",
  },
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

/* ==========================
   LOCAL STORAGE HELPERS
   ========================== */

function lsGet(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ==========================
   DEFAULT/SEED DATA
   ========================== */

const DEFAULT_ATTENDANCE = [
  // sample row format with overtime
  // We'll always push today's checkin/checkout data dynamically.
  {
    uid: "10366",
    name: "Sanjay Nayek",
    title: "Senior Packer (Kcal Life)",
    date: "2025-10-26",
    in: "08:00",
    out: "18:00",
    netHours: 9.00,     // after 1h break deducted from OUT-IN
    overtime: 0.00,
    status: "Present",
    remarks: ""
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
    status: "DO",
    remarks: "Day Off"
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    category: "System",
    message: "Monthly summary report is ready.",
    ts: Date.now() - 1000 * 60 * 60 * 5
  },
];

/* Seed once */
function initDataStore() {
  if (!localStorage.getItem("kps_attendance")) {
    lsSet("kps_attendance", DEFAULT_ATTENDANCE);
  }
  if (!localStorage.getItem("kps_notifications")) {
    lsSet("kps_notifications", DEFAULT_NOTIFICATIONS);
  }
  // You already had other data seeds in previous versions (deductions, overtime, requests).
  // If you still want those, you can merge that logic back here.
}

/* ==========================
   NAV + USER INFO
   ========================== */

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

/* ==========================
   NOTIFICATIONS
   ========================== */

function addNotification(note) {
  const notes = lsGet("kps_notifications", []);
  notes.unshift(note);
  lsSet("kps_notifications", notes);
}

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

/* ==========================
   TIME HELPERS
   ========================== */

/* returns {dateStr: "2025-10-27", timeStr: "07:05"} */
function getNow() {
  const now = new Date();

  const pad = (n) => (n < 10 ? "0"+n : ""+n);

  const y = now.getFullYear();
  const m = pad(now.getMonth()+1);
  const d = pad(now.getDate());

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());

  return {
    dateStr: `${y}-${m}-${d}`,
    timeStr: `${hh}:${mm}`,
    raw: now
  };
}

/* difference in hours between "HH:MM" -> number of hours (float) */
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

/* calculate net duty + overtime
   rules:
   - Total duty = OUT - IN
   - 1 hour break auto deducted
   - Standard duty = 10 hours (includes that break concept)
   - netHours = (OUT - IN) - 1 hour
   - overtime = max(0, netHours - 10)
*/
function computeDuty(inTime, outTime) {
  const totalHours = diffHours(inTime, outTime); // raw diff
  let net = totalHours - 1; // minus 1h break
  if (net < 0) net = 0;

  let overtime = net - 10;
  if (overtime < 0) overtime = 0;

  // round to 2 decimals
  net = Math.round(net * 100) / 100;
  overtime = Math.round(overtime * 100) / 100;

  return { netHours: net, overtime };
}

/* figure status */
function getStatusForRow(inTime, outTime) {
  if (inTime !== "—" && outTime !== "—") return "Present";
  if (inTime !== "—" && outTime === "—") return "Half Day";
  if (inTime === "—" && outTime === "—") return "AB"; // Absent default
  return "Present";
}

/* ==========================
   ATTENDANCE DATA FUNCTIONS
   ========================== */

/* get today's row for this user if exists */
function findTodayAttendanceForUser(uid, dateStr, list) {
  return list.find(
    r => r.uid === uid && r.date === dateStr
  );
}

/* create blank attendance row for user for today if missing */
function ensureTodayRowForUser(user) {
  const nowObj = getNow();
  const list = lsGet("kps_attendance", []);
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
      status: "AB",
      remarks: ""
    };
    list.unshift(row);
    lsSet("kps_attendance", list);
  }
  return row;
}

/* handle Check IN button */
function handleCheckIn() {
  const session = getSession();
  if (!session) return;
  const nowObj = getNow();
  const list = lsGet("kps_attendance", []);
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
      status: "Present",
      remarks: ""
    };
    list.unshift(row);
  } else {
    // if already has in, do nothing
    if (row.in !== "—") {
      alert("You are already Checked IN.");
      return;
    }
    row.in = nowObj.timeStr;
    row.status = "Present";
  }

  lsSet("kps_attendance", list);

  // notification
  addNotification({
    category: "Attendance",
    message: `${session.name} checked IN at ${nowObj.timeStr}`,
    ts: Date.now()
  });

  renderAttendanceTable();
  fillTodaySummaryBox();
  updateCheckButtonsState();
}

/* handle Check OUT button */
function handleCheckOut() {
  const session = getSession();
  if (!session) return;
  const nowObj = getNow();
  const list = lsGet("kps_attendance", []);
  let row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  if (!row || row.in === "—") {
    alert("You did not Check IN yet.");
    return;
  }
  if (row.out !== "—") {
    alert("You already Checked OUT.");
    return;
  }

  // set out time
  row.out = nowObj.timeStr;

  // compute net duty / overtime
  const dutyInfo = computeDuty(row.in, row.out);
  row.netHours = dutyInfo.netHours;
  row.overtime = dutyInfo.overtime;
  row.status = getStatusForRow(row.in, row.out);

  lsSet("kps_attendance", list);

  // notification with overtime info
  addNotification({
    category: "Attendance",
    message: `${session.name} checked OUT at ${nowObj.timeStr} (Overtime: ${row.overtime.toFixed(2)} hr)`,
    ts: Date.now()
  });

  renderAttendanceTable();
  fillTodaySummaryBox();
  updateCheckButtonsState();
}

/* ==========================
   ATTENDANCE RENDER
   ========================== */

function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;

  const list = lsGet("kps_attendance", []);

  // newest first (already mostly unshift, but sort by date/time difference just to be safe)
  list.sort((a,b)=>{
    // sort by date desc then uid
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  tbody.innerHTML = "";
  list.forEach(row => {
    // overtime pill style
    let otCell = "";
    if (row.overtime && row.overtime > 0) {
      otCell = `<span class="ot-pill">${row.overtime.toFixed(2)} hr OT</span>`;
    } else {
      otCell = `<span class="ot-pill-zero">0.00 hr</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}<br><small style="opacity:.7">${row.title}</small></td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td>${row.netHours ? row.netHours.toFixed(2) : "0.00"}</td>
      <td>${otCell}</td>
      <td><span class="status-pill">${row.status || ""}</span></td>
      <td>${row.remarks || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================
   TODAY SUMMARY BOX
   ========================== */

function fillTodaySummaryBox() {
  const dateLabel = document.getElementById("today-date-label");
  const inEl = document.getElementById("today-in");
  const outEl = document.getElementById("today-out");
  const dutyEl = document.getElementById("today-duty");
  const otEl = document.getElementById("today-ot");
  const stEl = document.getElementById("today-status");

  if (!dateLabel) return; // not on attendance page

  const session = getSession();
  const nowObj = getNow();
  const list = lsGet("kps_attendance", []);
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
  dutyEl.textContent = row.netHours ? row.netHours.toFixed(2) + " hr" : "0.00 hr";
  otEl.textContent = row.overtime ? row.overtime.toFixed(2) + " hr" : "0.00 hr";
  stEl.textContent = row.status || "AB";
}

/* ==========================
   ENABLE / DISABLE BUTTONS
   ========================== */

function updateCheckButtonsState() {
  const checkInBtn = document.getElementById("checkin-btn");
  const checkOutBtn = document.getElementById("checkout-btn");
  if (!checkInBtn || !checkOutBtn) return;

  const session = getSession();
  const nowObj = getNow();
  const list = lsGet("kps_attendance", []);
  const row = findTodayAttendanceForUser(session.uid, nowObj.dateStr, list);

  // default states
  checkInBtn.disabled = false;
  checkOutBtn.disabled = true;

  if (!row) {
    // no attendance yet, can Check IN
    return;
  }

  // already checked in?
  if (row.in !== "—") {
    checkInBtn.disabled = true;
    // can check out if not already out
    if (row.out === "—") {
      checkOutBtn.disabled = false;
    }
  }

  // already checked out?
  if (row.out !== "—") {
    checkOutBtn.disabled = true;
  }
}

/* ==========================
   DASHBOARD STATS
   ========================== */

function loadDashboardStats() {
  const attEl = document.getElementById("stat-attendance");
  const otEl = document.getElementById("stat-overtime");
  const dedEl = document.getElementById("stat-deductions");
  const noteEl = document.getElementById("stat-notifications");

  const attendance = lsGet("kps_attendance", []);
  const notes = lsGet("kps_notifications", []);

  // quick mock for now
  const attendanceStat = "92% Present";

  // sum overtime hours total
  const totalOT = attendance.reduce((sum, row)=>{
    const v = parseFloat(row.overtime || "0");
    return sum + (isNaN(v)?0:v);
  },0);

  // sum deductions? if you already manage "kps_deductions" in older code,
  // you can still compute it. For now we just show 0.00.
  let totalDed = 0.00;
  const dedData = lsGet("kps_deductions", null);
  if (dedData && Array.isArray(dedData)) {
    totalDed = dedData.reduce((sum,row)=>{
      const v = parseFloat(row.amount || "0");
      return sum + (isNaN(v)?0:v);
    },0);
  }

  if (attEl) attEl.textContent = attendanceStat;
  if (otEl) otEl.textContent = totalOT.toFixed(2) + " hrs";
  if (dedEl) dedEl.textContent = totalDed.toFixed(2) + " AED";
  if (noteEl) noteEl.textContent = notes.length + " New";
}

/* ==========================
   PAGE INIT
   ========================== */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  // LOGIN PAGE
  if (page === "login") {
    initDataStore(); // seed once
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
    return;
  }

  // ALL OTHER PAGES REQUIRE LOGIN
  initDataStore();
  const session = requireSessionOrRedirect();
  if (!session) return;

  fillNavUserInfo();
  wireGlobalLogout();

  if (page === "dashboard") {
    loadDashboardStats();
  }

  if (page === "attendance") {
    // render table
    renderAttendanceTable();
    // fill summary card
    fillTodaySummaryBox();
    // button states
    updateCheckButtonsState();

    // wire Check IN / OUT
    const cin = document.getElementById("checkin-btn");
    if (cin) cin.addEventListener("click", handleCheckIn);

    const cout = document.getElementById("checkout-btn");
    if (cout) cout.addEventListener("click", handleCheckOut);
  }

  // Other pages (overtime, deduction, etc.) would continue here like in your previous code.
});


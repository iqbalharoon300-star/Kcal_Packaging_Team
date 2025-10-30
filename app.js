/* =========================================================
   KCAL PACKAGING SYSTEM (KPS)
   app.js — Part 1 : Login, Roles, Splash Animation
   Developed by Haroon Iqbal
========================================================= */

// ---------- GLOBAL STATE ----------
const STORAGE_KEYS = {
  USERS: "kps_users",
  SESSION: "kps_session",
  NOTIFS: "kps_notifications",
  ATT: "kps_attendance",
  OT: "kps_overtime",
  DED: "kps_deductions",
  REQ: "kps_requests"
};

let currentUser = null;
let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];

// ---------- INITIAL DEMO ADMIN ----------
if (users.length === 0) {
  users = [
    {
      uid: "10001",
      name: "System Admin",
      role: "Admin",
      section: "KMP Day",
      shift: "Day",
      email: "admin@kcallife.com",
      phone: "+971500000000",
      password: "12345",
      photo: ""
    }
  ];
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// ---------- UTILITIES ----------
function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function findUser(uid, password) {
  return users.find(u => u.uid === uid && u.password === password);
}

function showToast(message, type = "ok") {
  const box = document.getElementById("toastContainer");
  if (!box) return;
  const toast = document.createElement("div");
  toast.className = `toast message-${type}`;
  toast.innerHTML = `<span class="toast-icon">${type === "ok" ? "✅" : "⚠️"}</span><span>${message}</span>`;
  box.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---------- LOGIN ----------
function handleLogin() {
  const uid = document.getElementById("loginUID").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  const err = document.getElementById("loginError");

  const user = findUser(uid, pass);
  if (!user) {
    err.style.display = "block";
    return;
  }
  err.style.display = "none";

  // Save session
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));

  // Splash animation (fast)
  const splash = document.createElement("div");
  splash.id = "logoutSplash";
  splash.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#f7fdf9;display:flex;align-items:center;justify-content:center;
    transition:opacity .8s ease;
  `;
  splash.innerHTML = `<img src="Kcal.rll.gif" style="width:120px;height:120px;object-fit:contain;animation:pulse 1.6s infinite;">`;
  document.body.appendChild(splash);
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.remove();
      window.location.href = "dashboard.html";
    }, 800);
  }, 800);
}

// ---------- LOGOUT ----------
function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  // Show splash animation again
  const splash = document.createElement("div");
  splash.id = "logoutSplash";
  splash.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#f7fdf9;display:flex;align-items:center;justify-content:center;
    transition:opacity 1s ease;
  `;
  splash.innerHTML = `<img src="Kcal.rll.gif" style="width:120px;height:120px;object-fit:contain;animation:pulse 1.6s infinite;">`;
  document.body.appendChild(splash);
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.remove();
      window.location.href = "index.html";
    }, 800);
  }, 600);
}

// ---------- SESSION INIT ----------
function getSession() {
  const s = localStorage.getItem(STORAGE_KEYS.SESSION);
  return s ? JSON.parse(s) : null;
}

function ensureAuth() {
  const p = document.body.getAttribute("data-page");
  currentUser = getSession();

  // Only index.html can be accessed without login
  if (!currentUser && p !== "login") {
    window.location.href = "index.html";
    return;
  }

  // Redirect logged-in user away from login page
  if (currentUser && p === "login") {
    window.location.href = "dashboard.html";
    return;
  }

  // Fill header info
  if (currentUser && document.getElementById("headerName")) {
    document.getElementById("headerName").textContent = currentUser.name;
    document.getElementById("headerRole").textContent = currentUser.role;
    const avatar = document.getElementById("headerAvatar");
    if (avatar) {
      avatar.textContent = currentUser.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }
  }
}

// ---------- BELL NOTIFICATION ----------
function updateNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS)) || [];
  const unread = notifs.filter(n => !n.read).length;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? "inline-block" : "none";
}
/* KCAL Loader Animation */
window.addEventListener("load", () => {
  const loader = document.getElementById("pageLoader");
  if (loader) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.style.display = "none", 600);
  }
});
// Profile Dropdown Toggle
document.addEventListener("DOMContentLoaded", () => {
  const userBtn = document.getElementById("userMenuBtn");
  const userMenu = document.getElementById("userDropdown");
  if (userBtn && userMenu) {
    userBtn.addEventListener("click", () => {
      userMenu.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove("show");
      }
    });
  }
});

// ---------- EVENT BINDING ----------
document.addEventListener("DOMContentLoaded", () => {
  ensureAuth();
  updateNotifBadge();

  // Login button
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) btnLogin.addEventListener("click", handleLogin);

  // Logout links
  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      handleLogout();
    });
  });

  // Mobile sidebar toggle
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("appSidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
/* =========================================================
   app.js — Part 2 : Attendance, Overtime, Charts, Summaries
========================================================= */

/* ---------------- TIME + DURATION HELPERS ---------------- */

// Convert "07:15 AM" to minutes since midnight
function parseTime12h(str) {
  // expect "HH:MM AM" or "HH:MM PM"
  if (!str || !str.includes(":")) return null;
  const [time, ampmRaw] = str.trim().split(" ");
  if (!time || !ampmRaw) return null;
  const ampm = ampmRaw.toUpperCase();
  let [hh, mm] = time.split(":").map(x => parseInt(x, 10));
  if (ampm === "PM" && hh !== 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  return hh * 60 + mm;
}

// Turn minutes since midnight back to 12h "HH:MM AM/PM"
function formatTime12h(totalMin) {
  if (totalMin == null) return "-";
  let m = totalMin % 60;
  let h = Math.floor(totalMin / 60);
  let ampm = "AM";
  if (h >= 12) {
    ampm = "PM";
    if (h > 12) h -= 12;
  }
  if (h === 0) {
    h = 12;
    ampm = "AM";
  }
  const mm = m < 10 ? "0" + m : m;
  return `${h}:${mm} ${ampm}`;
}

// Calculate duty (in hours, decimal) allowing overnight
// Example: IN 05:00 PM, OUT 04:00 AM next day
function calcDutyHours(inStr, outStr) {
  const inMin = parseTime12h(inStr);
  const outMin = parseTime12h(outStr);
  if (inMin == null || outMin == null) return 0;
  let diff = outMin - inMin;
  if (diff < 0) diff += 24 * 60; // overnight wrap
  // subtract 60 min break automatically
  diff -= 60;
  if (diff < 0) diff = 0;
  return +(diff / 60).toFixed(2);
}

// Auto OT rule:
// If status === "Present" and dutyHours > 10 -> autoOT = dutyHours - 10
// else 0
function calcAutoOT(dutyHours, status) {
  if (status !== "Present") return 0;
  if (dutyHours <= 10) return 0;
  return +(dutyHours - 10).toFixed(2);
}

// Get today's date in "YYYY-MM-DD"
function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Check if date is in the same month as now
function isThisMonth(ymd) {
  const d = new Date(ymd + "T00:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/* ---------------- STORAGE HELPERS ---------------- */

function loadJSON(key, fallback) {
  return JSON.parse(localStorage.getItem(key)) || fallback;
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  // trigger sync for other tabs
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) }));
}

/* ------------ ATTENDANCE DATA STRUCTURE ------------
Each record in kps_attendance:
{
  uid: "10001",
  name: "System Admin",
  section: "KMP Day",
  date: "2025-10-29",
  in: "07:00 AM",
  out: "05:00 PM",
  status: "Present" | "Off Day" | "Sick Leave" | "Annual Leave" | "Suspended" | "Public Holiday" | "Absent",
  dutyHours: 9.00,
  autoOT: 0.00,
  approvedOT: 0.00
}
--------------------------------------------------- */

function getAttendanceData() {
  return loadJSON(STORAGE_KEYS.ATT, []);
}
function setAttendanceData(list) {
  saveJSON(STORAGE_KEYS.ATT, list);
}

/* ---------- CHECK-IN / CHECK-OUT LOGIC ---------- */

// record (or update) check-in for currentUser
function doCheckIn() {
  if (!currentUser) return;
  const att = getAttendanceData();
  const date = todayYMD();

  // if already checked in today, block
  const existing = att.find(r => r.uid === currentUser.uid && r.date === date);
  if (existing && existing.in) {
    showToast("Already checked in today", "err");
    return;
  }

  // create or update
  const now = new Date();
  let hour = now.getHours();
  let minute = now.getMinutes();
  const mStr = minute < 10 ? "0" + minute : "" + minute;
  let ampm = "AM";
  if (hour >= 12) {
    ampm = "PM";
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  const inTime = `${hour}:${mStr} ${ampm}`;

  if (existing) {
    existing.in = inTime;
    existing.status = "Present";
  } else {
    att.push({
      uid: currentUser.uid,
      name: currentUser.name,
      section: currentUser.section || "",
      date,
      in: inTime,
      out: "",
      status: "Present",
      dutyHours: 0,
      autoOT: 0,
      approvedOT: 0
    });
  }

  setAttendanceData(att);
  addNotification(`${currentUser.name} checked in`, "Attendance", false);
  showToast("Checked In ✅", "ok");
  renderAttendancePage();
  renderOvertimePage();
  renderDashboard();
}

// record (or update) check-out for currentUser
function doCheckOut() {
  if (!currentUser) return;
  const att = getAttendanceData();
  const date = todayYMD();

  const existing = att.find(r => r.uid === currentUser.uid && r.date === date);
  if (!existing || !existing.in) {
    showToast("No check-in found today", "err");
    return;
  }
  if (existing.out) {
    showToast("Already checked out today", "err");
    return;
  }

  // current time 12h
  const now = new Date();
  let hour = now.getHours();
  let minute = now.getMinutes();
  const mStr = minute < 10 ? "0" + minute : "" + minute;
  let ampm = "AM";
  if (hour >= 12) {
    ampm = "PM";
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  const outTime = `${hour}:${mStr} ${ampm}`;

  existing.out = outTime;

  // recalc duty and OT
  const duty = calcDutyHours(existing.in, existing.out);
  existing.dutyHours = duty;
  existing.autoOT = calcAutoOT(duty, existing.status || "Present");

  setAttendanceData(att);
  addNotification(`${currentUser.name} checked out`, "Attendance", false);
  showToast("Checked Out ✅", "ok");

  renderAttendancePage();
  renderOvertimePage();
  renderDashboard();
}

/* ---------- ADMIN/MANAGER/SUPERVISOR ATTENDANCE EDIT ---------- */

function openAttendanceEditModal(uid, date) {
  if (!canEditHR()) return;

  const modal = document.getElementById("attendanceEditModal");
  if (!modal) return;
  const att = getAttendanceData();
  const rec = att.find(r => r.uid === uid && r.date === date);
  if (!rec) return;

  document.getElementById("attEditUID").value = rec.uid;
  document.getElementById("attEditDate").value = rec.date;
  document.getElementById("attEditIn").value = rec.in || "";
  document.getElementById("attEditOut").value = rec.out || "";
  document.getElementById("attEditStatus").value = rec.status || "Present";

  modal.style.display = "flex";
}

function closeAttendanceEditModal() {
  const modal = document.getElementById("attendanceEditModal");
  if (modal) modal.style.display = "none";
}

function saveAttendanceEditModal() {
  const uid = document.getElementById("attEditUID").value;
  const date = document.getElementById("attEditDate").value;
  const newIn = document.getElementById("attEditIn").value.trim();
  const newOut = document.getElementById("attEditOut").value.trim();
  const newStatus = document.getElementById("attEditStatus").value;

  const att = getAttendanceData();
  const rec = att.find(r => r.uid === uid && r.date === date);
  if (!rec) return;

  rec.in = newIn;
  rec.out = newOut;
  rec.status = newStatus;

  const duty = calcDutyHours(rec.in, rec.out);
  rec.dutyHours = duty;
  rec.autoOT = calcAutoOT(duty, newStatus);

  setAttendanceData(att);
  addNotification(`Attendance updated for UID ${uid}`, "Attendance Edit", true);

  showToast("Attendance updated ✅", "ok");
  closeAttendanceEditModal();
  renderAttendancePage();
  renderOvertimePage();
  renderDashboard();
}

/* ---------- PERMISSION HELPERS ---------- */

function isAdmin() {
  return currentUser && currentUser.role === "Admin";
}
function isManagerOrSupervisor() {
  return currentUser && (currentUser.role === "Manager" || currentUser.role === "Supervisor");
}
function canEditHR() {
  // Admin full access; Manager/Supervisor high access
  return isAdmin() || isManagerOrSupervisor();
}

/* ---------- ATTENDANCE PAGE RENDER ---------- */

function renderAttendancePage() {
  if (document.body.getAttribute("data-page") !== "attendance") return;

  const attSection = document.getElementById("attendanceSectionFilter").value;
  const mode = document.getElementById("attendanceViewMode").value;
  const specificDate = document.getElementById("attendanceDateFilter").value || todayYMD();
  const rangeFrom = document.getElementById("attendanceRangeFrom").value;
  const rangeTo = document.getElementById("attendanceRangeTo").value;

  const tbody = document.getElementById("attendanceTableBody");
  const summaryBody = document.getElementById("attendanceSummaryBody");
  const actionsBar = document.getElementById("attendanceActionBar");

  const allData = getAttendanceData();

  // filter by role
  let visibleData = allData.filter(r => {
    if (!currentUser) return false;
    // Employee can only see themself
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return true;
  });

  // filter by section
  if (attSection !== "All") {
    visibleData = visibleData.filter(r => r.section === attSection);
  }

  // filter by date / mode
  if (mode === "today") {
    visibleData = visibleData.filter(r => r.date === specificDate);
  } else if (mode === "month") {
    visibleData = visibleData.filter(r => isThisMonth(r.date));
  } else if (mode === "range") {
    if (rangeFrom && rangeTo) {
      const fromTime = new Date(rangeFrom + "T00:00:00").getTime();
      const toTime = new Date(rangeTo + "T23:59:59").getTime();
      visibleData = visibleData.filter(r => {
        const t = new Date(r.date + "T00:00:00").getTime();
        return t >= fromTime && t <= toTime;
      });
    }
  }

  // sort by date desc then name
  visibleData.sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return a.name.localeCompare(b.name);
  });

  // build rows
  tbody.innerHTML = "";
  visibleData.forEach(rec => {
    const row = document.createElement("tr");

    // badge class for status
    let badgeClass = "badge-present";
    if (rec.status === "Off Day") badgeClass = "badge-offday";
    else if (rec.status === "Sick Leave") badgeClass = "badge-sick";
    else if (rec.status === "Annual Leave") badgeClass = "badge-annual";
    else if (rec.status === "Suspended") badgeClass = "badge-suspended";
    else if (rec.status === "Absent") badgeClass = "badge-absent";
    else if (rec.status === "Public Holiday") badgeClass = "badge-holiday";

    row.innerHTML = `
      <td>${rec.uid}</td>
      <td>${rec.name}</td>
      <td>${rec.date}</td>
      <td>${rec.in || "-"}</td>
      <td>${rec.out || "-"}</td>
      <td>${rec.dutyHours?.toFixed?.(2) || "0.00"}</td>
      <td>${rec.autoOT?.toFixed?.(2) || "0.00"}</td>
      <td><span class="badge ${badgeClass}">${rec.status || "-"}</span></td>
      <td class="actions-cell">
        ${canEditHR() ? `<button class="btn-small btn-secondary" data-edit-att="${rec.uid}::${rec.date}">Edit</button>` : ``}
      </td>
    `;
    tbody.appendChild(row);
  });

  // wire edit buttons
  if (canEditHR()) {
    tbody.querySelectorAll("[data-edit-att]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [uid, date] = btn.getAttribute("data-edit-att").split("::");
        openAttendanceEditModal(uid, date);
      });
    });
  }

  // build summary (monthly only makes sense for month mode, but we will always render this-month stats)
  const monthly = allData.filter(r => {
    if (!currentUser) return false;
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return isThisMonth(r.date);
  });

  // group by uid
  const summaryMap = {};
  monthly.forEach(r => {
    if (!summaryMap[r.uid]) {
      summaryMap[r.uid] = {
        uid: r.uid,
        name: r.name,
        present: 0,
        offday: 0,
        sick: 0,
        annual: 0,
        suspended: 0,
        absent: 0,
        ot: 0
      };
    }
    const obj = summaryMap[r.uid];
    // status counters
    switch (r.status) {
      case "Present": obj.present++; break;
      case "Off Day": obj.offday++; break;
      case "Sick Leave": obj.sick++; break;
      case "Annual Leave": obj.annual++; break;
      case "Suspended": obj.suspended++; break;
      case "Absent": obj.absent++; break;
    }
    obj.ot += (r.autoOT || 0) + (r.approvedOT || 0);
  });

  summaryBody.innerHTML = "";
  Object.values(summaryMap).forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.uid}</td>
      <td>${s.name}</td>
      <td>${s.present}</td>
      <td>${s.offday}</td>
      <td>${s.sick}</td>
      <td>${s.annual}</td>
      <td>${s.suspended}</td>
      <td>${s.absent}</td>
      <td>${s.ot.toFixed(2)}</td>
    `;
    summaryBody.appendChild(tr);
  });

  // build action bar (Check In / Check Out / Mark Off / etc.)
  actionsBar.innerHTML = "";

  // Everyone sees Check In / Check Out
  const btnIn = document.createElement("button");
  btnIn.className = "btn-primary btn-small";
  btnIn.textContent = "Check In";
  btnIn.addEventListener("click", doCheckIn);

  const btnOut = document.createElement("button");
  btnOut.className = "btn-primary btn-small";
  btnOut.textContent = "Check Out";
  btnOut.addEventListener("click", doCheckOut);

  actionsBar.appendChild(btnIn);
  actionsBar.appendChild(btnOut);

  // HR roles get status buttons + reset
  if (canEditHR()) {
    // mark special status for selected date/UID?
    // we'll apply to own uid for now or manually edit via modal.

    const note = document.createElement("div");
    note.style.fontSize = "11px";
    note.style.color = "var(--text-light)";
    note.textContent = "Use Edit on a row to mark Off Day / Sick / Annual / Absent / Suspended / Holiday or to Reset times.";
    actionsBar.appendChild(note);
  }

  // modal buttons
  const cancelBtn = document.getElementById("cancelAttendanceEditBtn");
  if (cancelBtn) cancelBtn.onclick = closeAttendanceEditModal;
  const saveBtn = document.getElementById("saveAttendanceEditBtn");
  if (saveBtn) saveBtn.onclick = saveAttendanceEditModal;
}

/* ---------- OVERTIME PAGE RENDER ---------- */

function getOvertimeFromAttendance(attList) {
  // derive daily OT view and monthly summary from attendance
  // Return:
  // todayRows, monthRowsSummary, grandTotal, sectionAgg(for chart)
  const tday = todayYMD();
  const todayRows = [];
  const monthlyAgg = {}; // by uid
  const sectionAgg = {}; // for chart {section: totalFinalOT}

  attList.forEach(r => {
    const finalOT = (r.autoOT || 0) + (r.approvedOT || 0);
    // only consider if Present
    if (r.status === "Present") {
      // today table
      if (r.date === tday) {
        todayRows.push({
          uid: r.uid,
          name: r.name,
          section: r.section || "",
          date: r.date,
          in: r.in || "-",
          out: r.out || "-",
          duty: r.dutyHours || 0,
          autoOT: r.autoOT || 0,
          approvedOT: r.approvedOT || 0,
          finalOT: finalOT
        });
      }
      // month summary
      if (isThisMonth(r.date)) {
        if (!monthlyAgg[r.uid]) {
          monthlyAgg[r.uid] = {
            uid: r.uid,
            name: r.name,
            section: r.section || "",
            autoOT: 0,
            approvedOT: 0,
            finalOT: 0
          };
        }
        monthlyAgg[r.uid].autoOT += r.autoOT || 0;
        monthlyAgg[r.uid].approvedOT += r.approvedOT || 0;
        monthlyAgg[r.uid].finalOT += finalOT;

        // chart by section
        const sec = r.section || "Unknown";
        if (!sectionAgg[sec]) sectionAgg[sec] = 0;
        sectionAgg[sec] += finalOT;
      }
    }
  });

  // calc grandTotal
  let grand = 0;
  Object.values(monthlyAgg).forEach(row => {
    grand += row.finalOT;
  });

  return {
    todayRows,
    monthSummary: Object.values(monthlyAgg),
    grandTotal: grand,
    sectionAgg
  };
}

// inline edit for Approved OT (Admin/Manager/Supervisor only)
function enableOTInlineEditing(tbody, attList) {
  if (!canEditHR()) return; // staff can't edit

  tbody.querySelectorAll("[data-approved-ot]").forEach(cell => {
    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => {
      // already editing?
      if (cell.querySelector("input")) return;

      const uid = cell.getAttribute("data-uid");
      const date = cell.getAttribute("data-date");
      const rec = attList.find(r => r.uid === uid && r.date === date);
      if (!rec) return;

      const oldVal = rec.approvedOT || 0;
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.25";
      input.style.width = "60px";
      input.value = oldVal.toFixed(2);
      cell.innerHTML = "";
      cell.appendChild(input);
      input.focus();

      function finish(save) {
        if (save) {
          const newVal = parseFloat(input.value) || 0;
          rec.approvedOT = newVal;
          // recalc final OT
          const duty = rec.dutyHours || calcDutyHours(rec.in, rec.out);
          rec.dutyHours = duty;
          rec.autoOT = calcAutoOT(duty, rec.status || "Present");
        }
        setAttendanceData(attList);
        addNotification(`Approved OT updated for ${rec.uid}`, "Overtime Update", true);
        showToast("Approved OT updated ✅", "ok");
        renderOvertimePage();
        renderAttendancePage();
        renderDashboard();
      }

      input.addEventListener("keydown", e => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      });
      input.addEventListener("blur", () => finish(true));
    });
  });
}

function renderOvertimePage() {
  if (document.body.getAttribute("data-page") !== "overtime") return;

  const tbodyToday = document.getElementById("otTodayBody");
  const tbodyMonth = document.getElementById("otMonthBody");
  const grandCell = document.getElementById("otMonthGrandTotal");

  const attList = getAttendanceData().filter(r => {
    // staff sees only themself
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return true;
  });

  const data = getOvertimeFromAttendance(attList);

  // TODAY TABLE
  tbodyToday.innerHTML = "";
  data.todayRows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}</td>
      <td>${row.section}</td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td>${row.duty.toFixed(2)}</td>
      <td>${row.autoOT.toFixed(2)}</td>
      <td data-approved-ot data-uid="${row.uid}" data-date="${row.date}">
        ${row.approvedOT.toFixed(2)}
      </td>
      <td>${row.finalOT.toFixed(2)}</td>
    `;
    tbodyToday.appendChild(tr);
  });

  // enable click-to-edit for today's rows
  enableOTInlineEditing(tbodyToday, getAttendanceData());

  // MONTH SUMMARY
  tbodyMonth.innerHTML = "";
  data.monthSummary.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}</td>
      <td>${row.section}</td>
      <td>${row.autoOT.toFixed(2)}</td>
      <td>${row.approvedOT.toFixed(2)}</td>
      <td>${row.finalOT.toFixed(2)}</td>
    `;
    tbodyMonth.appendChild(tr);
  });

  grandCell.textContent = data.grandTotal.toFixed(2);

  // Chart render
  drawOTChart(data.sectionAgg);
}

/* ---------- DASHBOARD RENDER ---------- */

function renderDashboard() {
  if (document.body.getAttribute("data-page") !== "dashboard") return;

  const attList = getAttendanceData();
  const reqList = loadJSON(STORAGE_KEYS.REQ, []);
  const notifs = loadJSON(STORAGE_KEYS.NOTIFS, []);

  // Filter by role: staff can only see self data
  const visibleAtt = attList.filter(r => {
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return true;
  });

  const today = todayYMD();
  const todayRows = visibleAtt.filter(r => r.date === today);

  // KPI calculations
  const totalEmployees = users.length;
  const presentToday = todayRows.filter(r => r.status === "Present").length;
  const leaveToday = todayRows.filter(r =>
    ["Off Day","Sick Leave","Annual Leave","Suspended","Absent","Public Holiday"]
      .includes(r.status)
  ).length;
  // OT today
  let otToday = 0;
  todayRows.forEach(r => {
    otToday += (r.autoOT || 0) + (r.approvedOT || 0);
  });
  // Pending Requests
  const pendingReq = reqList.filter(req => req.status === "Pending").length;
  // Unread notifications
  const unreadNotif = notifs.filter(n => !n.read).length;

  animateStatNumber("dashTotalEmployees", totalEmployees);
  animateStatNumber("dashPresentToday", presentToday);
  animateStatNumber("dashLeaveToday", leaveToday);
  animateStatNumber("dashOTToday", otToday, true);
  animateStatNumber("dashPendingReq", pendingReq);
  animateStatNumber("dashUnreadNotif", unreadNotif);

  // latest attendance table (last 5 recent)
  const dashTbody = document.getElementById("dashAttendanceTable");
  const recent = [...todayRows]
    .sort((a,b) => a.name.localeCompare(b.name))
    .slice(0,5);

  dashTbody.innerHTML = "";
  recent.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.date}</td>
      <td>${r.in || "-"}</td>
      <td>${r.out || "-"}</td>
      <td>${(r.dutyHours||0).toFixed(2)}</td>
      <td>${((r.autoOT||0)+(r.approvedOT||0)).toFixed(2)}</td>
      <td>${r.status || "-"}</td>
    `;
    dashTbody.appendChild(tr);
  });
}

// animate KPI cards count-up
function animateStatNumber(id, finalValue, isHours=false) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 600; // ms
  const start = 0;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime)/duration,1);
    const current = start + (finalValue - start)*progress;
    el.textContent = isHours ? current.toFixed(2) + "h" : Math.round(current);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- OVERTIME CHART DRAW ---------- */
/* We'll build a light canvas bar chart with KCAL green gradient */

function drawOTChart(sectionAgg) {
  const canvas = document.getElementById("otChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // prepare data
  const labels = Object.keys(sectionAgg);
  const values = labels.map(l => +sectionAgg[l].toFixed(2));

  // canvas size
  const W = canvas.width = canvas.clientWidth;
  const H = canvas.height = 200;

  ctx.clearRect(0,0,W,H);

  if (labels.length === 0) {
    ctx.fillStyle = "#999";
    ctx.font = "13px sans-serif";
    ctx.fillText("No overtime data this month", 10, 30);
    return;
  }

  const maxVal = Math.max(...values, 1);
  const barW = Math.min(60, (W-40)/labels.length - 20);
  const baseY = H-30;

  // animate bars from 0 -> value
  const startT = performance.now();
  const animDur = 800;

  function frame(t) {
    const p = Math.min((t-startT)/animDur,1);

    ctx.clearRect(0,0,W,H);

    // axes
    ctx.strokeStyle = "#cfd8d3";
    ctx.beginPath();
    ctx.moveTo(30,10);
    ctx.lineTo(30,baseY);
    ctx.lineTo(W-10,baseY);
    ctx.stroke();

    // draw bars
    labels.forEach((lab, i) => {
      const val = values[i]*p;
      const barH = (val/maxVal)*(baseY-20);
      const x = 40 + i*(barW+20);
      const y = baseY-barH;

      // gradient KCAL green
      const grad = ctx.createLinearGradient(0,y,0,baseY);
      grad.addColorStop(0,"#0b4030");
      grad.addColorStop(1,"#12714e");

      // shadow
      ctx.fillStyle = grad;
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(x,y,barW,barH);

      // value label
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#0f2e24";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(val.toFixed(1)+"h", x+barW/2, y-6);

      // x label
      ctx.fillStyle = "#4f5c57";
      ctx.font = "11px sans-serif";
      ctx.fillText(lab, x+barW/2, baseY+14);
    });

    if (p<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- PAGE INIT FOR ATTENDANCE + OT + DASH ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Attendance page bindings
  if (document.body.getAttribute("data-page") === "attendance") {
    const viewSel = document.getElementById("attendanceViewMode");
    const rangeBlock = document.getElementById("attendanceRangeBlock");
    if (viewSel) {
      viewSel.addEventListener("change", () => {
        rangeBlock.style.display = (viewSel.value === "range") ? "block" : "none";
      });
    }

    const btnFilter = document.getElementById("btnAttendanceApplyFilter");
    if (btnFilter) {
      btnFilter.addEventListener("click", () => {
        renderAttendancePage();
      });
    }

    renderAttendancePage();
  }

  // Overtime page bindings
  if (document.body.getAttribute("data-page") === "overtime") {
    const btnOTFilter = document.getElementById("btnOTApplyFilter");
    if (btnOTFilter) {
      btnOTFilter.addEventListener("click", () => {
        renderOvertimePage();
      });
    }
    const btnOTExcel = document.getElementById("btnOTExportExcel");
    if (btnOTExcel) {
      btnOTExcel.addEventListener("click", () => exportCurrentOT("excel"));
    }
    const btnOTPDF = document.getElementById("btnOTExportPDF");
    if (btnOTPDF) {
      btnOTPDF.addEventListener("click", () => exportCurrentOT("pdf"));
    }

    renderOvertimePage();
  }

  // Dashboard page
  if (document.body.getAttribute("data-page") === "dashboard") {
    renderDashboard();
  }
});

/* ---------- EXPORT HELPERS (OT) ----------
We just generate CSV for Excel, and open print dialog for PDF-style export.
We'll refine full report export in Part 3 with the reports page.
*/
function exportCurrentOT(format) {
  const page = document.body.getAttribute("data-page");
  if (page !== "overtime") return;

  const attList = getAttendanceData().filter(r => {
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return true;
  });

  const data = getOvertimeFromAttendance(attList);

  if (format === "excel") {
    // build CSV
    let csv = "UID,Name,Section,Date,In,Out,DutyHours,AutoOT,ApprovedOT,TotalOT\n";
    data.todayRows.forEach(r => {
      csv += `${r.uid},${r.name},${r.section},${r.date},${r.in},${r.out},${r.duty},${r.autoOT},${r.approvedOT},${r.finalOT}\n`;
    });

    downloadFile(csv, "text/csv", "Overtime_Today.xlsx");
    showToast("Excel exported ✅", "ok");
  } else if (format === "pdf") {
    // Open print-friendly window for PDF save
    const w = window.open("", "_blank");
    w.document.write("<pre style='font-family:monospace;font-size:12px;'>");
    w.document.write("Overtime Today\n\n");
    data.todayRows.forEach(r => {
      w.document.write(
        `${r.uid} ${r.name} ${r.section} ${r.date} IN:${r.in} OUT:${r.out} Duty:${r.duty} AutoOT:${r.autoOT} ApprovedOT:${r.approvedOT} FinalOT:${r.finalOT}\n`
      );
    });
    w.document.write("\nMonthly Summary (Final OT hrs)\n\n");
    data.monthSummary.forEach(r => {
      w.document.write(
        `${r.uid} ${r.name} ${r.section} FinalOT:${r.finalOT.toFixed(2)}h\n`
      );
    });
    w.document.write(`\nGrand Total This Month: ${data.grandTotal.toFixed(2)}h\n`);
    w.document.write("</pre>");
    w.document.close();
    w.focus();
    w.print();
    showToast("PDF ready (print/save) ✅", "ok");
  }
}

function downloadFile(content, mime, filename) {
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
/* =========================================================
   app.js — Part 3A : Employees & Deductions Logic
========================================================= */

/* ---------- EMPLOYEE MANAGEMENT ---------- */

function getEmployees() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
}

function renderEmployeesPage() {
  if (document.body.getAttribute("data-page") !== "employees") return;
  const tbody = document.getElementById("employeesTableBody");
  const employees = getEmployees();

  tbody.innerHTML = "";
  employees.forEach(emp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.uid}</td>
      <td>${emp.name}</td>
      <td>${emp.role}</td>
      <td>${emp.section || "-"}</td>
      <td>${emp.email}</td>
      <td>${emp.phone}</td>
      <td>${emp.shift || "-"}</td>
      <td>${canEditHR() ? `<button class="btn-small btn-secondary" data-edit-emp="${emp.uid}">Edit</button>` : ""}</td>
    `;
    tbody.appendChild(tr);
  });

  if (canEditHR()) {
    document.getElementById("btnAddEmployee").onclick = () => {
      document.getElementById("empModal").style.display = "flex";
    };

    document.querySelectorAll("[data-edit-emp]").forEach(btn => {
      btn.addEventListener("click", () => openEmployeeEdit(btn.getAttribute("data-edit-emp")));
    });
  }
}

function openEmployeeEdit(uid) {
  const modal = document.getElementById("empModal");
  const emp = getEmployees().find(e => e.uid === uid);
  if (!emp) return;
  modal.style.display = "flex";
  document.getElementById("empUID").value = emp.uid;
  document.getElementById("empName").value = emp.name;
  document.getElementById("empRole").value = emp.role;
  document.getElementById("empSection").value = emp.section;
  document.getElementById("empEmail").value = emp.email;
  document.getElementById("empPhone").value = emp.phone;
  document.getElementById("empShift").value = emp.shift;
  document.getElementById("empPassword").value = emp.password;
}

function saveEmployeeModal() {
  const uid = document.getElementById("empUID").value.trim();
  const name = document.getElementById("empName").value.trim();
  const role = document.getElementById("empRole").value;
  const section = document.getElementById("empSection").value.trim();
  const email = document.getElementById("empEmail").value.trim();
  const phone = document.getElementById("empPhone").value.trim();
  const shift = document.getElementById("empShift").value.trim();
  const pass = document.getElementById("empPassword").value.trim();

  let emps = getEmployees();
  const existing = emps.find(e => e.uid === uid);
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.section = section;
    existing.email = email;
    existing.phone = phone;
    existing.shift = shift;
    existing.password = pass;
  } else {
    emps.push({ uid, name, role, section, email, phone, shift, password: pass });
  }

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(emps));
  addNotification(`Employee ${name} (${uid}) saved`, "Employee", true);
  showToast("Employee saved ✅", "ok");

  document.getElementById("empModal").style.display = "none";
  renderEmployeesPage();
}

/* ---------- DEDUCTIONS ---------- */

function getDeductions() {
  return loadJSON(STORAGE_KEYS.DED, []);
}

function renderDeductionsPage() {
  if (document.body.getAttribute("data-page") !== "deduction") return;
  const tbody = document.getElementById("deductionTableBody");
  const list = getDeductions();
  tbody.innerHTML = "";

  list.forEach((d, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.uid}</td>
      <td>${d.name}</td>
      <td>${d.reason}</td>
      <td>${d.amount.toFixed(2)}</td>
      <td>${d.date}</td>
      <td>${canEditHR() ? `
        <button class="btn-small btn-secondary" data-edit-ded="${idx}">Edit</button>
        <button class="btn-small btn-danger" data-del-ded="${idx}">Delete</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (canEditHR()) {
    document.getElementById("btnAddDeduction").onclick = () => {
      document.getElementById("dedModal").style.display = "flex";
    };

    tbody.querySelectorAll("[data-edit-ded]").forEach(btn => {
      btn.addEventListener("click", () => openDeductionEdit(parseInt(btn.getAttribute("data-edit-ded"))));
    });
    tbody.querySelectorAll("[data-del-ded]").forEach(btn => {
      btn.addEventListener("click", () => deleteDeduction(parseInt(btn.getAttribute("data-del-ded"))));
    });
  }
}

function openDeductionEdit(index) {
  const list = getDeductions();
  const rec = list[index];
  if (!rec) return;
  const modal = document.getElementById("dedModal");
  modal.style.display = "flex";
  document.getElementById("dedIndex").value = index;
  document.getElementById("dedUID").value = rec.uid;
  document.getElementById("dedName").value = rec.name;
  document.getElementById("dedReason").value = rec.reason;
  document.getElementById("dedAmount").value = rec.amount;
  document.getElementById("dedDate").value = rec.date;
}

function saveDeductionModal() {
  const idx = document.getElementById("dedIndex").value;
  const uid = document.getElementById("dedUID").value.trim();
  const name = document.getElementById("dedName").value.trim();
  const reason = document.getElementById("dedReason").value.trim();
  const amount = parseFloat(document.getElementById("dedAmount").value) || 0;
  const date = document.getElementById("dedDate").value || todayYMD();

  const list = getDeductions();
  const record = { uid, name, reason, amount, date };

  if (idx === "") list.push(record);
  else list[parseInt(idx)] = record;

  saveJSON(STORAGE_KEYS.DED, list);
  addNotification(`Deduction saved for ${name}`, "Deduction", true);
  showToast("Deduction saved ✅", "ok");

  document.getElementById("dedModal").style.display = "none";
  renderDeductionsPage();
}

function deleteDeduction(idx) {
  if (!confirm("Delete this deduction?")) return;
  const list = getDeductions();
  const removed = list.splice(idx, 1);
  saveJSON(STORAGE_KEYS.DED, list);
  if (removed.length) addNotification(`Deduction deleted for ${removed[0].name}`, "Deduction", true);
  renderDeductionsPage();
}

/* ---------- PAGE BINDINGS ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.getAttribute("data-page") === "employees") {
    renderEmployeesPage();
    const cancelEmp = document.getElementById("cancelEmpBtn");
    if (cancelEmp) cancelEmp.onclick = () => document.getElementById("empModal").style.display = "none";
    const saveEmp = document.getElementById("saveEmpBtn");
    if (saveEmp) saveEmp.onclick = saveEmployeeModal;
  }

  if (document.body.getAttribute("data-page") === "deduction") {
    renderDeductionsPage();
    const cancelDed = document.getElementById("cancelDedBtn");
    if (cancelDed) cancelDed.onclick = () => document.getElementById("dedModal").style.display = "none";
    const saveDed = document.getElementById("saveDedBtn");
    if (saveDed) saveDed.onclick = saveDeductionModal;
  }
});
/* =========================================================
   app.js — Part 3B : Requests & Notifications
========================================================= */

/* ---------- REQUESTS LOGIC ---------- */

function getRequests() {
  return loadJSON(STORAGE_KEYS.REQ, []);
}
function setRequests(list) {
  saveJSON(STORAGE_KEYS.REQ, list);
}

// Render the Requests page
function renderRequestsPage() {
  if (document.body.getAttribute("data-page") !== "request") return;

  const tbody = document.getElementById("requestsTableBody");
  const reqs = getRequests();

  const visible = reqs.filter(r => {
    if (!currentUser) return false;
    // staff: own only
    if (!canEditHR() && r.uid !== currentUser.uid) return false;
    return true;
  });

  tbody.innerHTML = "";
  visible.forEach((r, idx) => {
    const tr = document.createElement("tr");
    const badge =
      r.status === "Approved"
        ? "badge-approve"
        : r.status === "Rejected"
        ? "badge-reject"
        : "badge-pending";
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.type}</td>
      <td>${r.details}</td>
      <td>${r.date}</td>
      <td><span class="badge ${badge}">${r.status}</span></td>
      <td>${r.approvedBy || "-"}</td>
      <td>
        ${
          canEditHR() && r.status === "Pending"
            ? `
          <button class="btn-small btn-primary" data-approve="${idx}">Approve</button>
          <button class="btn-small btn-danger" data-reject="${idx}">Reject</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  // HR actions
  if (canEditHR()) {
    tbody.querySelectorAll("[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => handleRequestDecision(btn.getAttribute("data-approve"), "Approved"));
    });
    tbody.querySelectorAll("[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => handleRequestDecision(btn.getAttribute("data-reject"), "Rejected"));
    });
  }

  const btnAdd = document.getElementById("btnAddRequest");
  if (btnAdd) btnAdd.onclick = () => (document.getElementById("reqModal").style.display = "flex");
}

function handleRequestDecision(index, decision) {
  const reqs = getRequests();
  const r = reqs[index];
  if (!r) return;
  r.status = decision;
  r.approvedBy = currentUser.name;
  setRequests(reqs);
  addNotification(`Request "${r.type}" ${decision.toLowerCase()} for ${r.name}`, "Request", true);
  showToast(`Request ${decision}`, "ok");
  renderRequestsPage();
}

function saveRequestModal() {
  const type = document.getElementById("reqType").value.trim();
  const details = document.getElementById("reqDetails").value.trim();
  const date = todayYMD();
  if (!type || !details) {
    showToast("Please fill all fields", "err");
    return;
  }

  const reqs = getRequests();
  reqs.push({
    uid: currentUser.uid,
    name: currentUser.name,
    type,
    details,
    date,
    status: "Pending",
    approvedBy: ""
  });
  setRequests(reqs);

  addNotification(`New ${type} request from ${currentUser.name}`, "Request", true);
  showToast("Request submitted ✅", "ok");
  document.getElementById("reqModal").style.display = "none";
  renderRequestsPage();
}

/* ---------- NOTIFICATIONS ---------- */

function getNotifications() {
  return loadJSON(STORAGE_KEYS.NOTIFS, []);
}
function setNotifications(list) {
  saveJSON(STORAGE_KEYS.NOTIFS, list);
}

// Add new notification
function addNotification(text, category, system = false) {
  const list = getNotifications();
  const date = new Date().toISOString();
  list.push({ text, category, date, read: false, system });
  setNotifications(list);
  updateNotifBadge();
}

// Render the Notifications page
function renderNotificationsPage() {
  if (document.body.getAttribute("data-page") !== "notifications") return;
  const tbody = document.getElementById("notifTableBody");
  const list = getNotifications();

  // Auto clear >6 months
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const clean = list.filter(n => new Date(n.date) > cutoff);
  if (clean.length !== list.length) setNotifications(clean);

  // Show latest 50
  const sorted = [...clean].reverse().slice(0, 50);
  tbody.innerHTML = "";
  sorted.forEach((n, idx) => {
    const dateStr = new Date(n.date).toLocaleString();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${n.category}</td>
      <td>${n.text}</td>
      <td>${dateStr}</td>
      <td>${n.read ? "" : "<span class='badge badge-pending'>NEW</span>"}</td>
    `;
    row.addEventListener("click", () => {
      n.read = true;
      setNotifications(clean);
      renderNotificationsPage();
    });
    tbody.appendChild(row);
  });

  updateNotifBadge();
}

/* ---------- PAGE BINDINGS ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.getAttribute("data-page") === "request") {
    renderRequestsPage();
    const cancelReq = document.getElementById("cancelReqBtn");
    if (cancelReq) cancelReq.onclick = () => (document.getElementById("reqModal").style.display = "none");
    const saveReq = document.getElementById("saveReqBtn");
    if (saveReq) saveReq.onclick = saveRequestModal;
  }

  if (document.body.getAttribute("data-page") === "notifications") {
    renderNotificationsPage();
  }
});
/* =========================================================
   app.js — Part 3C : Reports + Profile Page
========================================================= */

/* ---------- REPORTS ---------- */

function renderReportsPage() {
  if (document.body.getAttribute("data-page") !== "reports") return;

  const att = loadJSON(STORAGE_KEYS.ATT, []);
  const ot = loadJSON(STORAGE_KEYS.OT, []);
  const ded = loadJSON(STORAGE_KEYS.DED, []);

  // aggregate by UID
  const map = {};
  att.forEach(a => {
    if (!map[a.uid]) map[a.uid] = { uid: a.uid, name: a.name, totalHrs: 0, totalOT: 0, totalDed: 0 };
    map[a.uid].totalHrs += a.hours || 0;
  });
  ot.forEach(o => {
    if (!map[o.uid]) map[o.uid] = { uid: o.uid, name: o.name, totalHrs: 0, totalOT: 0, totalDed: 0 };
    map[o.uid].totalOT += o.hours || 0;
  });
  ded.forEach(d => {
    if (!map[d.uid]) map[d.uid] = { uid: d.uid, name: d.name, totalHrs: 0, totalOT: 0, totalDed: 0 };
    map[d.uid].totalDed += d.amount || 0;
  });

  const tbody = document.getElementById("reportsTableBody");
  tbody.innerHTML = "";
  Object.values(map).forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.totalHrs.toFixed(2)}</td>
      <td>${r.totalOT.toFixed(2)}</td>
      <td>${r.totalDed.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("btnExportExcel").onclick = () => exportTableToExcel("reportsTable", "KPS_Reports");
  document.getElementById("btnExportPDF").onclick = () => exportTableToPDF("reportsTable", "KPS_Reports");
}

// simple Excel export
function exportTableToExcel(tableID, filename) {
  const table = document.getElementById(tableID);
  const html = table.outerHTML.replace(/ /g, "%20");
  const link = document.createElement("a");
  link.href = "data:application/vnd.ms-excel," + html;
  link.download = `${filename}.xls`;
  link.click();
  showToast("Excel exported ✅", "ok");
}

// simple PDF export using browser print
function exportTableToPDF(tableID, filename) {
  const printWin = window.open("", "_blank");
  const table = document.getElementById(tableID).outerHTML;
  printWin.document.write(`<html><head><title>${filename}</title></head><body>${table}</body></html>`);
  printWin.document.close();
  printWin.print();
  showToast("PDF ready for print ✅", "ok");
}

/* ---------- PROFILE ---------- */

function renderProfilePage() {
  if (document.body.getAttribute("data-page") !== "profile") return;
  const u = getSession();
  if (!u) return;

  document.getElementById("profName").value = u.name;
  document.getElementById("profUID").value = u.uid;
  document.getElementById("profEmail").value = u.email || "";
  document.getElementById("profPhone").value = u.phone || "";
  document.getElementById("profPhotoPreview").src = u.photo || "default-avatar.png";

  document.getElementById("profSaveBtn").onclick = saveProfileData;
  document.getElementById("profPhoto").onchange = previewPhoto;
}

function previewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("profPhotoPreview").src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function saveProfileData() {
  const email = document.getElementById("profEmail").value.trim();
  const phone = document.getElementById("profPhone").value.trim();
  const pass = document.getElementById("profPass").value.trim();
  const photo = document.getElementById("profPhotoPreview").src;

  const u = getSession();
  const all = getEmployees();
  const idx = all.findIndex(x => x.uid === u.uid);
  if (idx < 0) return;

  all[idx].email = email;
  all[idx].phone = phone;
  if (pass) all[idx].password = pass;
  all[idx].photo = photo;

  saveJSON(STORAGE_KEYS.USERS, all);
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(all[idx]));
  showToast("Profile updated ✅", "ok");
}

/* ---------- FINAL PAGE BINDINGS ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.getAttribute("data-page") === "reports") {
    renderReportsPage();
  }
  if (document.body.getAttribute("data-page") === "profile") {
    renderProfilePage();
  }
});
/* =========================================================
   AUTO PAGE TRANSITION LOADER
   — Adds KCAL mini animation between page navigations
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("pageLoader");

  // Find all internal navigation links (sidebar + buttons)
  document.querySelectorAll("a[href$='.html']").forEach(link => {
    link.addEventListener("click", e => {
      const target = link.getAttribute("href");
      // Skip if it's the current page
      if (window.location.pathname.includes(target)) return;

      // Show loader before navigating
      if (loader) {
        e.preventDefault();
        loader.classList.add("active");

        setTimeout(() => {
          window.location.href = target;
        }, 600); // 0.6 second delay for smooth fade
      }
    });
  });
});

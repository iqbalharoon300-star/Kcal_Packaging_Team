/* =========================================================
   KPS — KCAL PACKAGING SYSTEM
   Browser HR Portal
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
  // fire a synthetic "update" so other pages (open tabs) could react if needed
  window.dispatchEvent(new Event("kps-data-updated"));
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

/* ------------------ Permissions ------------------ */
function canManageEmployees(user) {
  return (
    user.role === "Admin" ||
    user.role === "Manager" ||
    user.role === "Supervisor"
  );
}
function canManageOvertime(user) {
  // overtime can be added only by Admin / Manager / Supervisor
  return canManageEmployees(user);
}
function canEditAttendance(user) {
  // admin / manager / supervisor can edit/reset attendance rows
  return canManageEmployees(user);
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

/* ------------------ Overtime store ------------------ */
function getOvertime() {
  return lsGet("kps_overtime", []);
}
function setOvertime(list) {
  lsSet("kps_overtime", list);
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
  // Work hours minus 1 hour break
  let net = diffHours(inT, outT) - 1;
  if (net < 0) net = 0;
  // OT above 10 hours
  let ot = net - 10;
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
      status: "AB", // Absent by default unless check-in
    };
    list.unshift(row);
    setAttendance(list);
  }
  return row;
}

/* CHECK IN */
function handleCheckIn() {
  const s = requireSessionOrRedirect();
  if (!s) return;
  const now = getNow();
  const list = getAttendance();

  let row = list.find((r) => r.uid === s.uid && r.date === now.dateStr);

  if (row && row.status === "Off Day") {
    showToast("This day is marked Off Day", "error");
    return;
  }

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

/* CHECK OUT */
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
  if (row.status === "Off Day") {
    showToast("This day is marked Off Day", "error");
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

/* ATTENDANCE: Mark Off Day (Admin/Manager/Supervisor only) */
function markOffDay(uid, dateStr) {
  const list = getAttendance();
  const row = list.find((r) => r.uid === uid && r.date === dateStr);
  if (!row) {
    // create row if not exists, mark as Off Day
    const emp = findUserByUID(uid);
    if (!emp) return;
    list.unshift({
      uid: emp.uid,
      name: emp.name,
      role: emp.role,
      date: dateStr,
      in: "—",
      out: "—",
      netHours: 0,
      overtime: 0,
      status: "Off Day",
    });
  } else {
    row.in = "—";
    row.out = "—";
    row.netHours = 0;
    row.overtime = 0;
    row.status = "Off Day";
  }
  setAttendance(list);
  addNotification("Attendance", `Marked Off Day for ${uid} (${dateStr})`);
  refreshAttendanceUI();
}

/* ATTENDANCE: Reset day (keep date, clear IN/OUT) */
function resetAttendance(uid, dateStr) {
  const list = getAttendance();
  const row = list.find((r) => r.uid === uid && r.date === dateStr);
  if (!row) return;
  row.in = "—";
  row.out = "—";
  row.netHours = 0;
  row.overtime = 0;
  row.status = "AB";
  setAttendance(list);
  addNotification("Attendance", `Reset attendance for ${uid} (${dateStr})`);
  refreshAttendanceUI();
}

/* ATTENDANCE: Edit IN/OUT times manually */
function saveEditedAttendance(uid, dateStr, newIn, newOut) {
  const list = getAttendance();
  const row = list.find((r) => r.uid === uid && r.date === dateStr);
  if (!row) return;

  row.in = newIn || "—";
  row.out = newOut || "—";

  if (row.in !== "—" && row.out !== "—") {
    const duty = computeDuty(row.in, row.out);
    row.netHours = duty.netHours;
    row.overtime = duty.overtime;
    row.status = "Present";
  } else if (row.status === "Off Day") {
    // keep Off Day if admin already set it
    row.netHours = 0;
    row.overtime = 0;
  } else {
    // partial or no info
    if (row.in === "—" && row.out === "—") {
      row.status = "AB";
      row.netHours = 0;
      row.overtime = 0;
    } else {
      row.status = "Present";
    }
  }

  setAttendance(list);
  addNotification(
    "Attendance",
    `Edited attendance for ${uid} (${dateStr})`
  );
  refreshAttendanceUI();
}

/* ------------------ Overtime Logic ------------------ */
/*
   Overtime entries are separate manual records that a Supervisor/Manager/Admin can add.
   We still apply same duty calculation rule:
   totalHours = OUT-IN minus 1h break
   overtimeHours = totalHours - 10, >=0
*/
function calcOvertimeHours(inTime, outTime) {
  const duty = computeDuty(inTime, outTime); // same function
  return {
    dutyHours: duty.netHours,
    overtimeHours: duty.overtime,
  };
}

function addOrUpdateOvertime(rowData) {
  // rowData = { uid, date, inTime, outTime }
  let list = getOvertime();

  // If already exists same (uid+date+inTime+outTime) or we want editable by index?
  // We'll just push new each time for now.
  const { dutyHours, overtimeHours } = calcOvertimeHours(
    rowData.inTime,
    rowData.outTime
  );

  list.unshift({
    uid: rowData.uid,
    name: (findUserByUID(rowData.uid)?.name) || rowData.uid,
    date: rowData.date,
    in: rowData.inTime,
    out: rowData.outTime,
    dutyHours: dutyHours,
    overtime: overtimeHours,
    ts: Date.now(),
  });

  setOvertime(list);
  addNotification(
    "Overtime",
    `Overtime logged for ${rowData.uid} (${overtimeHours.toFixed(2)} hr OT)`
  );
  renderOvertimeTable();
}

/* Delete OT row by index */
function deleteOvertime(index) {
  let list = getOvertime();
  if (!list[index]) return;
  const rec = list[index];
  list.splice(index, 1);
  setOvertime(list);
  addNotification("Overtime", `Removed OT for ${rec.uid} on ${rec.date}`);
  renderOvertimeTable();
}

/* ------------------ "Find user by UID" helper ------------------ */
function findUserByUID(uid) {
  // Check admin first
  const adminMatch = KPS_USERS.find((u) => u.uid === uid);
  if (adminMatch) return adminMatch;
  // Then employees
  const emps = getEmployees();
  return emps.find((e) => e.uid === uid);
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

/* ------------------ Sidebar Profile / Notifications ------------------ */
function renderSidebarProfile() {
  const s = getSession();
  if (!s) return;

  // Sidebar identity
  const nameEl = document.getElementById("dash-user-name");
  const roleEl = document.getElementById("dash-user-role");
  const secEl = document.getElementById("dash-user-section");
  if (nameEl) nameEl.textContent = s.name;
  if (roleEl) roleEl.textContent = s.role;
  if (secEl) secEl.textContent = s.section || "—";

  // Header chip
  const chipName = document.getElementById("chip-name");
  const chipRole = document.getElementById("chip-role");
  const chipAvatar = document.getElementById("chip-avatar");
  if (chipName) chipName.textContent = s.name;
  if (chipRole) chipRole.textContent = s.role;
  if (chipAvatar) {
    chipAvatar.textContent = s.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  // Welcome line on dashboard
  const welcomeName = document.getElementById("welcome-name");
  const welcomeRole = document.getElementById("welcome-role");
  if (welcomeName) welcomeName.textContent = s.name;
  if (welcomeRole) welcomeRole.textContent = s.role;
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

/* ------------------ Dashboard KPI + latest table ------------------ */
function renderKpis() {
  const attVal = document.getElementById("kpi-attendance");
  const otVal = document.getElementById("kpi-overtime");
  const dedVal = document.getElementById("kpi-deduction");
  const notifVal = document.getElementById("kpi-notif-count");

  const attList = getAttendance();
  const otList = getOvertime();
  const notifList = getNotifications();

  const todayStr = getNow().dateStr;
  const todaysRows = attList.filter((r) => r.date === todayStr);

  // total OT from attendance
  const totalAttendanceOT = attList.reduce(
    (sum, r) => sum + (r.overtime || 0),
    0
  );
  // total OT from manual overtime list
  const totalManualOT = otList.reduce(
    (sum, r) => sum + (r.overtime || 0),
    0
  );

  if (attVal) attVal.textContent = todaysRows.length + " records";
  if (otVal)
    otVal.textContent = (totalAttendanceOT + totalManualOT).toFixed(2) + " hr";
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

/* ------------------ Attendance Page Rendering ------------------ */

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

  if (!dateEl) return;

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
  const s = getSession();
  const list = getAttendance();

  const rowsHtml = list
    .map((r) => {
      // show edit controls only if user can edit
      let actionCol = "";
      if (canEditAttendance(s)) {
        actionCol = `
          <button class="btn-edit" data-edit-att="${r.uid}" data-edit-date="${r.date}">✏️</button>
          <button class="btn-reset" data-reset-att="${r.uid}" data-reset-date="${r.date}">↺</button>
          <button class="btn-reset" data-offday-att="${r.uid}" data-offday-date="${r.date}">Off Day</button>
        `;
      }
      return `
      <tr>
        <td>${r.uid}</td>
        <td>${r.name}</td>
        <td>${r.date}</td>
        <td>${r.in}</td>
        <td>${r.out}</td>
        <td>${r.netHours}</td>
        <td>${r.overtime}</td>
        <td>${r.status}</td>
        <td>${actionCol}</td>
      </tr>`;
    })
    .join("");

  tbody.innerHTML = rowsHtml;

  // wire edit / reset / offday buttons
  if (canEditAttendance(s)) {
    tbody.querySelectorAll("[data-edit-att]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-edit-att");
        const dateStr = btn.getAttribute("data-edit-date");
        openAttendanceEditModal(uid, dateStr);
      });
    });
    tbody.querySelectorAll("[data-reset-att]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-reset-att");
        const dateStr = btn.getAttribute("data-reset-date");
        resetAttendance(uid, dateStr);
      });
    });
    tbody.querySelectorAll("[data-offday-att]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-offday-att");
        const dateStr = btn.getAttribute("data-offday-date");
        markOffDay(uid, dateStr);
      });
    });
  }
}

/* Attendance Edit Modal Logic */
function openAttendanceEditModal(uid, dateStr) {
  const list = getAttendance();
  const row = list.find((r) => r.uid === uid && r.date === dateStr);
  if (!row) return;

  const modal = ensureAttendanceModal(); // build if not exists
  modal.style.display = "flex";

  // fill fields
  document.getElementById("att-edit-uid").value = row.uid;
  document.getElementById("att-edit-date").value = row.date;
  document.getElementById("att-edit-in").value =
    row.in && row.in !== "—" ? row.in : "";
  document.getElementById("att-edit-out").value =
    row.out && row.out !== "—" ? row.out : "";
}

function ensureAttendanceModal() {
  let modal = document.getElementById("att-edit-modal");
  if (modal) return modal;

  // create modal HTML once if not present
  modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "att-edit-modal";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>Edit Attendance</h2>
        <button type="button" class="modal-close" id="att-edit-close">×</button>
      </div>
      <form id="att-edit-form" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>UID</label>
            <input id="att-edit-uid" type="text" readonly />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input id="att-edit-date" type="text" readonly />
          </div>
          <div class="form-group">
            <label>Check-IN</label>
            <input id="att-edit-in" type="time" />
          </div>
          <div class="form-group">
            <label>Check-OUT</label>
            <input id="att-edit-out" type="time" />
          </div>
        </div>
        <button class="btn-save" type="submit">Save Changes</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // close button
  document
    .getElementById("att-edit-close")
    .addEventListener("click", () => (modal.style.display = "none"));

  // submit
  document
    .getElementById("att-edit-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const uid = document.getElementById("att-edit-uid").value;
      const dateStr = document.getElementById("att-edit-date").value;
      const newIn = document.getElementById("att-edit-in").value;
      const newOut = document.getElementById("att-edit-out").value;
      saveEditedAttendance(uid, dateStr, newIn, newOut);
      modal.style.display = "none";
    });

  return modal;
}

/* helper to refresh attendance UIs everywhere */
function refreshAttendanceUI() {
  if (document.body.dataset.page === "dashboard") {
    renderKpis();
    renderLatestAttendanceTable();
    renderSidebarNotifications();
  }
  if (document.body.dataset.page === "attendance") {
    renderAttendanceTable();
    renderTodaySummary();
    renderSidebarNotifications();
  }
  if (document.body.dataset.page === "overtime") {
    renderOvertimeTable();
  }
}

/* ------------------ Employees Page Rendering ------------------ */

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
  const modal = document.getElementById("emp-modal");
  if (modal) modal.style.display = "none";
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

  // Link edit/delete actions
  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEmpModalForEdit(btn.dataset.edit));
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => handleDeleteEmployee(btn.dataset.del));
  });
}

/* ------------------ Overtime Page Rendering ------------------ */
function openOTModal() {
  const modal = ensureOTModal();
  // clear fields
  document.getElementById("ot-uid").value = "";
  document.getElementById("ot-date").value = "";
  document.getElementById("ot-in").value = "";
  document.getElementById("ot-out").value = "";
  modal.style.display = "flex";
}
function closeOTModal() {
  const modal = document.getElementById("ot-modal") || document.getElementById("ot-modal-dynamic");
  if (modal) modal.style.display = "none";
}

// if the static overtime.html already included #ot-modal, we'll just use that
function ensureOTModal() {
  let modal = document.getElementById("ot-modal");
  if (modal) return modal;

  modal = document.getElementById("ot-modal-dynamic");
  if (modal) return modal;

  // build fallback if not defined
  modal = document.createElement("div");
  modal.id = "ot-modal-dynamic";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>Add Overtime</h2>
        <button type="button" class="modal-close" id="close-ot-modal-dyn">×</button>
      </div>
      <form id="ot-form-dyn">
        <div class="form-grid">
          <div class="form-group">
            <label>UID</label>
            <input type="text" id="ot-uid" required>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="ot-date" required>
          </div>
          <div class="form-group">
            <label>IN Time</label>
            <input type="time" id="ot-in" required>
          </div>
          <div class="form-group">
            <label>OUT Time</label>
            <input type="time" id="ot-out" required>
          </div>
        </div>
        <button class="btn-save" type="submit">Save Overtime</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document
    .getElementById("close-ot-modal-dyn")
    .addEventListener("click", closeOTModal);

  document
    .getElementById("ot-form-dyn")
    .addEventListener("submit", handleSaveOvertime);

  return modal;
}

function handleSaveOvertime(e) {
  e.preventDefault();
  const s = getSession();
  if (!canManageOvertime(s)) {
    showToast("Not allowed", "error");
    return;
  }

  const uid = document.getElementById("ot-uid").value.trim();
  const date = document.getElementById("ot-date").value.trim();
  const inTime = document.getElementById("ot-in").value.trim();
  const outTime = document.getElementById("ot-out").value.trim();

  if (!uid || !date || !inTime || !outTime) {
    showToast("Fill all overtime fields", "error");
    return;
  }

  addOrUpdateOvertime({
    uid,
    date,
    inTime,
    outTime,
  });

  closeOTModal();
  renderOvertimeTable();
}

function renderOvertimeTable() {
  const tbody = document.getElementById("ot-tbody");
  if (!tbody) return;

  const list = getOvertime();
  tbody.innerHTML = list
    .map((rec, idx) => {
      return `
        <tr>
          <td>${rec.uid}</td>
          <td>${rec.name}</td>
          <td>${rec.date}</td>
          <td>${rec.in}</td>
          <td>${rec.out}</td>
          <td>${rec.dutyHours.toFixed(2)}</td>
          <td>${rec.overtime.toFixed(2)}</td>
          <td>
            <button class="btn-reset" data-del-ot="${idx}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("[data-del-ot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = btn.getAttribute("data-del-ot");
      deleteOvertime(idx);
    });
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

  const profBtn = menu.querySelector("[data-goto-profile]");
  if (profBtn) {
    profBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

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

  // Admin first
  let found = KPS_USERS.find(
    (u) => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  // Employees next
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

  // For every other page, require a session
  const s = requireSessionOrRedirect();
  if (!s) return;

  renderSidebarProfile();
  initUserDropdown();

  // Hide Employees tab from Staff
  if (!canManageEmployees(s)) {
    const empNav = document.getElementById("nav-employees-link");
    if (empNav) empNav.style.display = "none";
  }

  // DASHBOARD PAGE
  if (page === "dashboard") {
    renderSidebarNotifications();
    renderKpis();
    renderLatestAttendanceTable();
  }

  // ATTENDANCE PAGE
  if (page === "attendance") {
    // wire buttons
    const inBtn = document.getElementById("checkin-btn");
    const outBtn = document.getElementById("checkout-btn");
    if (inBtn) inBtn.addEventListener("click", handleCheckIn);
    if (outBtn) outBtn.addEventListener("click", handleCheckOut);

    renderSidebarNotifications();
    renderTodaySummary();
    renderAttendanceTable();
  }

  // EMPLOYEES PAGE
  if (page === "employees") {
    // open modal only if you have permission
    const addBtn = document.getElementById("open-emp-modal");
    if (addBtn) {
      if (canManageEmployees(s)) {
        addBtn.style.display = "inline-block";
        addBtn.addEventListener("click", openEmpModalForNew);
      } else {
        addBtn.style.display = "none";
      }
    }

    const closeBtn = document.getElementById("close-emp-modal");
    if (closeBtn) closeBtn.addEventListener("click", closeEmpModal);

    const form = document.getElementById("emp-form");
    if (form) form.addEventListener("submit", handleSaveEmployee);

    const genBtn = document.getElementById("generate-pw");
    if (genBtn) genBtn.addEventListener("click", handleGeneratePassword);

    const searchBox = document.getElementById("emp-search");
    if (searchBox) {
      searchBox.addEventListener("input", renderEmployeesTable);
    }

    renderSidebarNotifications();
    renderEmployeesTable();
  }

  // OVERTIME PAGE
  if (page === "overtime") {
    // Only supervisors/managers/admin can add overtime
    const otBtn = document.getElementById("add-ot-btn");
    if (otBtn) {
      if (canManageOvertime(s)) {
        otBtn.style.display = "inline-block";
        otBtn.addEventListener("click", openOTModal);
      } else {
        otBtn.style.display = "none";
      }
    }

    // If static overtime.html defined #ot-modal with <form id="ot-form">,
    // wire its close + submit here:
    const otCloseStatic = document.getElementById("close-ot-modal");
    if (otCloseStatic) {
      otCloseStatic.addEventListener("click", () => {
        const modal = document.getElementById("ot-modal");
        if (modal) modal.style.display = "none";
      });
    }

    const otFormStatic = document.getElementById("ot-form");
    if (otFormStatic) {
      otFormStatic.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!canManageOvertime(s)) {
          showToast("Not allowed", "error");
          return;
        }
        const uid = document.getElementById("ot-uid").value.trim();
        const date = document.getElementById("ot-date").value.trim();
        const inTime = document.getElementById("ot-in").value.trim();
        const outTime = document.getElementById("ot-out").value.trim();
        if (!uid || !date || !inTime || !outTime) {
          showToast("Fill all overtime fields", "error");
          return;
        }
        addOrUpdateOvertime({ uid, date, inTime, outTime });
        const modal = document.getElementById("ot-modal");
        if (modal) modal.style.display = "none";
        renderOvertimeTable();
      });
    }

    renderOvertimeTable();
  }
});
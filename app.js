/*****************************************
 * Kcal Packaging System (KPS)
 * Unified Frontend Logic
 * Developed by Haroon
 ******************************************/

/* ========== CONSTANT STORAGE KEYS ========== */
const KPS_KEYS = {
  users: "kps_users",
  session: "kps_session",
  attendance: "kps_attendance",
  overtime: "kps_overtime",
  deductions: "kps_deductions",
  requests: "kps_requests",
  notifications: "kps_notifications"
};

/* ========== UTIL: LOCAL STORAGE HELPERS ========== */
function lsGet(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  // also dispatch storage-like event so other tabs/pages update live
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

/* ========== BOOTSTRAP DEFAULT DATA ON FIRST RUN ========== */
function bootstrapDefaults() {
  // Users list (employees). If it doesn't exist, create with Admin only.
  // You will add more employees from Employees page later and they will be stored here.
  if (!localStorage.getItem(KPS_KEYS.users)) {
    const seedUsers = [
      {
        uid: "10001",
        name: "System Admin",
        role: "Admin",
        section: "Central Admin",
        shift: "Day",
        joinDate: "2023-01-01",
        phone: "+971 50 000 0000",
        email: "admin@kcal.com",
        password: "Admin@123"
      }
      // More users you add later will appear here
    ];
    lsSet(KPS_KEYS.users, seedUsers);
  }

  if (!localStorage.getItem(KPS_KEYS.attendance)) {
    lsSet(KPS_KEYS.attendance, []);
  }
  if (!localStorage.getItem(KPS_KEYS.overtime)) {
    lsSet(KPS_KEYS.overtime, []);
  }
  if (!localStorage.getItem(KPS_KEYS.deductions)) {
    lsSet(KPS_KEYS.deductions, []);
  }
  if (!localStorage.getItem(KPS_KEYS.requests)) {
    lsSet(KPS_KEYS.requests, []);
  }
  if (!localStorage.getItem(KPS_KEYS.notifications)) {
    lsSet(KPS_KEYS.notifications, []);
  }
}
bootstrapDefaults();

/* ========== TOAST NOTIFICATION (BOTTOM RIGHT) ========== */
function showToast(msg, type = "success") {
  // type: success | error | info
  let toast = document.createElement("div");
  toast.className = "kps-toast kps-toast-" + type;
  toast.textContent = msg;

  // basic styles injected if not already
  if (!document.getElementById("kps-toast-style")) {
    const style = document.createElement("style");
    style.id = "kps-toast-style";
    style.textContent = `
      .kps-toast-container {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 260px;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .kps-toast {
        background: #12714e;
        color: #fff;
        padding: 12px 14px;
        border-radius: 8px;
        font-size: 0.8rem;
        line-height: 1.3;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        animation: kps-toast-in .2s ease;
      }
      .kps-toast-error { background: #c62828; }
      .kps-toast-info  { background: #0f5132; }
      @keyframes kps-toast-in {
        from { opacity:0; transform: translateY(8px); }
        to   { opacity:1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  let wrap = document.querySelector(".kps-toast-container");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "kps-toast-container";
    document.body.appendChild(wrap);
  }

  wrap.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ========== SYSTEM NOTIFICATIONS LOGIC ========== */
function pushNotification(title, message) {
  const all = lsGet(KPS_KEYS.notifications, []);
  const now = new Date().toLocaleString("en-GB", { hour12: true });
  all.push({
    title,
    message,
    time: now,
    read: false
  });
  lsSet(KPS_KEYS.notifications, all);
}

/* ========== SESSION + AUTH ========== */
function getSessionUser() {
  return lsGet(KPS_KEYS.session, null);
}

function setSessionUser(userObj) {
  lsSet(KPS_KEYS.session, userObj);
}

function requireLogin() {
  // called on protected pages
  const u = getSessionUser();
  if (!u) {
    // not logged in, back to login
    window.location.href = "index.html";
    return null;
  }
  return u;
}

function attemptLogin(uid, pw) {
  const users = lsGet(KPS_KEYS.users, []);
  const found = users.find(u => u.uid === uid && u.password === pw);
  if (!found) return null;
  // store a trimmed session object
  const sessionObj = {
    uid: found.uid,
    name: found.name,
    role: found.role,
    section: found.section,
    shift: found.shift,
    joinDate: found.joinDate,
    phone: found.phone || "",
    email: found.email || "",
    password: found.password // for password check later
  };
  setSessionUser(sessionObj);
  return sessionObj;
}

function logout() {
  localStorage.removeItem(KPS_KEYS.session);
  // broadcast
  window.dispatchEvent(new StorageEvent("storage", { key: KPS_KEYS.session }));
  window.location.href = "index.html";
}

/* Hook up login form on index.html */
function initLoginPage() {
  if (document.body.dataset.page !== "login") return;
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const uid = document.getElementById("login-uid").value.trim();
    const pw = document.getElementById("login-pw").value.trim();
    const user = attemptLogin(uid, pw);
    if (!user) {
      showToast("Invalid UID or Password ❌", "error");
      return;
    }
    showToast("Welcome " + user.name + " ✅", "success");
    pushNotification("Login", user.name + " logged in.");
    // redirect to dashboard
    window.location.href = "dashboard.html";
  });
}

/* Attach logout handlers on pages that have [data-logout] */
function bindLogoutLinks() {
  const links = document.querySelectorAll("[data-logout]");
  links.forEach(l => {
    l.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  });
}

/* ========== COMMON HEADER/SIDEBAR USER FILL ========== */
function fillUserHeader() {
  const u = getSessionUser();
  if (!u) return;

  // avatar initials
  const initials = u.name
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // header / sidebar selectors we used in HTML
  const avatarEls = document.querySelectorAll(".user-avatar, #profileTopAvatar, #bigAvatarCircle");
  avatarEls.forEach(el => { el.textContent = initials; });

  const nameEls = document.querySelectorAll(".user-name, #profileTopName, #profileName");
  nameEls.forEach(el => { el.textContent = u.name || ""; });

  const roleEls = document.querySelectorAll(".user-role, #profileTopRole, #profileRole");
  roleEls.forEach(el => { el.textContent = u.role || ""; });

  const sectionEl = document.getElementById("profileSection");
  if (sectionEl) sectionEl.textContent = u.section || "—";

  const shiftEl = document.getElementById("profileShift");
  if (shiftEl) shiftEl.textContent = u.shift || "—";

  const uidEl = document.getElementById("profileUID");
  if (uidEl) uidEl.textContent = u.uid || "—";

  const joinEl = document.getElementById("profileJoin");
  if (joinEl) joinEl.textContent = u.joinDate || "—";

  // phone/email fields on profile
  const phoneInput = document.getElementById("profilePhone");
  if (phoneInput) phoneInput.value = u.phone || "";
  const emailInput = document.getElementById("profileEmail");
  if (emailInput) emailInput.value = u.email || "";
}

/* ========== EMPLOYEE LIST MANAGEMENT (employees.html) ========== */
/*
NOTE:
- We'll assume you will rebuild employees.html later to show/add/edit employees.
- For now we just provide helpers for CRUD in this core file.
*/

function getAllUsers() {
  return lsGet(KPS_KEYS.users, []);
}
function saveAllUsers(list) {
  lsSet(KPS_KEYS.users, list);
}

/* add new employee programmatically */
function addEmployee({ uid, name, role, section, shift, joinDate, phone, email, password }) {
  const list = getAllUsers();
  if (list.find(u => u.uid === uid)) {
    showToast("UID already exists", "error");
    return false;
  }
  list.push({
    uid, name, role, section, shift, joinDate,
    phone: phone || "",
    email: email || "",
    password: password || "User@123"
  });
  saveAllUsers(list);
  pushNotification("New Employee", `${name} (${uid}) added.`);
  showToast("Employee added ✅", "success");
  return true;
}

/* update employee (by uid) */
function updateEmployee(uid, dataPatch) {
  const list = getAllUsers();
  const emp = list.find(e => e.uid === uid);
  if (!emp) return false;
  Object.assign(emp, dataPatch);
  saveAllUsers(list);

  // If currently logged in user is the same person, also sync session
  const session = getSessionUser();
  if (session && session.uid === uid) {
    Object.assign(session, dataPatch);
    setSessionUser(session);
  }

  pushNotification("Employee Updated", `Profile updated for UID ${uid}`);
  showToast("Employee updated ✅", "success");
  return true;
}

/* ========== ATTENDANCE (attendance.html) ========== */

function getTodayDisplay() {
  // e.g. "28 Oct 2025"
  const now = new Date();
  return now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getNowHM() {
  // "08:15"
  const now = new Date();
  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function getAllAttendance() {
  return lsGet(KPS_KEYS.attendance, []);
}
function saveAllAttendance(list) {
  lsSet(KPS_KEYS.attendance, list);
}

function loadAttendanceTable() {
  if (document.body.dataset.page !== "attendance") return;
  const tbody = document.getElementById("attendanceData");
  if (!tbody) return;

  const data = getAllAttendance();
  tbody.innerHTML = "";
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}</td>
      <td>${row.date}</td>
      <td>${row.in || "-"}</td>
      <td>${row.out || "-"}</td>
      <td>${row.duty || "-"}</td>
      <td>${row.ot || "-"}</td>
      <td>${row.status}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* Check In */
function checkIn() {
  const session = requireLogin();
  if (!session) return;

  const all = getAllAttendance();
  const today = getTodayDisplay();

  // already checked in?
  if (all.some(a => a.uid === session.uid && a.date === today && a.in)) {
    showToast("Already Checked In today", "error");
    return;
  }

  all.push({
    uid: session.uid,
    name: session.name,
    date: today,
    in: getNowHM(),
    out: "",
    duty: "",
    ot: "",
    status: "Checked In"
  });

  saveAllAttendance(all);
  pushNotification("Attendance", `${session.name} checked in (${getNowHM()})`);
  showToast("Checked In ✅", "success");
}

/* Check Out */
function checkOut() {
  const session = requireLogin();
  if (!session) return;

  const all = getAllAttendance();
  const today = getTodayDisplay();
  const rec = all.find(a => a.uid === session.uid && a.date === today && a.in);

  if (!rec) {
    showToast("Please Check In first", "error");
    return;
  }
  if (rec.out) {
    showToast("Already Checked Out", "error");
    return;
  }

  rec.out = getNowHM();

  // duty calc
  // convert "08:00" -> Date so we can diff
  const inTime = new Date(`1970-01-01T${rec.in}:00`);
  const outTime = new Date(`1970-01-01T${rec.out}:00`);
  let diffHrs = (outTime - inTime) / (1000 * 60 * 60); // raw hours
  // minus 1hr break
  if (diffHrs < 0) diffHrs = 0;
  const duty = Math.max(diffHrs - 1, 0); // can't be negative
  const dutyRounded = duty.toFixed(2);

  // Overtime rule:
  // Standard duty is 10h (already includes break rule),
  // anything above 10 is OT.
  let ot = 0;
  if (duty > 10) {
    ot = (duty - 10).toFixed(2);
  } else {
    ot = "0";
  }

  rec.duty = dutyRounded;
  rec.ot = ot;
  rec.status = "Present";

  saveAllAttendance(all);
  pushNotification("Attendance", `${session.name} checked out (${rec.out}), OT ${ot}h`);
  showToast("Checked Out ✅", "success");
}

/* Mark Off Day */
function markOffDay() {
  const session = requireLogin();
  if (!session) return;

  const all = getAllAttendance();
  const today = getTodayDisplay();

  // If record for today already exists, don't duplicate. We only add Off Day if
  // there's not already an attendance record for today.
  if (all.some(a => a.uid === session.uid && a.date === today)) {
    showToast("Attendance already exists today", "error");
    return;
  }

  all.push({
    uid: session.uid,
    name: session.name,
    date: today,
    in: "",
    out: "",
    duty: "0",
    ot: "0",
    status: "Off Day"
  });

  saveAllAttendance(all);
  pushNotification("Attendance", `${session.name} marked Off Day (${today})`);
  showToast("Marked Off Day ✅", "info");
}

/* Reset today's attendance for THIS user */
function resetAttendance() {
  const session = requireLogin();
  if (!session) return;

  const all = getAllAttendance();
  const today = getTodayDisplay();
  const filtered = all.filter(a => !(a.uid === session.uid && a.date === today));
  saveAllAttendance(filtered);

  pushNotification("Attendance Reset", `Today cleared for ${session.name}`);
  showToast("Attendance reset for today 🔄", "info");
}

/* ========== OVERTIME (overtime.html) ========== */

function getAllOvertime() {
  return lsGet(KPS_KEYS.overtime, []);
}
function saveAllOvertime(list) {
  lsSet(KPS_KEYS.overtime, list);
}

function loadOvertimeTable() {
  if (document.body.dataset.page !== "overtime") return;
  const tbody = document.getElementById("overtimeTable");
  if (!tbody) return;

  const otData = getAllOvertime();
  const attData = getAllAttendance();
  tbody.innerHTML = "";

  otData.forEach(ot => {
    // find attendance OT for same person/date
    const match = attData.find(a => a.uid === ot.uid && a.date === ot.date);
    const attendanceOT = match ? parseFloat(match.ot || 0) : 0;
    const totalOT = (attendanceOT + parseFloat(ot.hours || 0)).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ot.date}</td>
      <td>${ot.uid}</td>
      <td>${ot.name}</td>
      <td>${attendanceOT}</td>
      <td>${ot.hours}</td>
      <td><strong>${totalOT}</strong></td>
      <td>${ot.approvedBy}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* Add extra approved overtime manually */
function bindOvertimeForm() {
  if (document.body.dataset.page !== "overtime") return;
  const form = document.getElementById("overtimeForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();

    const uid = document.getElementById("uid").value.trim();
    const name = document.getElementById("name").value.trim();
    const dateRaw = document.getElementById("date").value;
    const hoursVal = document.getElementById("hours").value.trim();
    const approvedBy = document.getElementById("approvedBy").value.trim();

    if (!uid || !name || !dateRaw || !hoursVal || !approvedBy) {
      showToast("Please fill all fields", "error");
      return;
    }

    // format date to "28 Oct 2025"
    const dateObj = new Date(dateRaw);
    const date = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });

    const hours = parseFloat(hoursVal);
    if (isNaN(hours)) {
      showToast("Hours not valid", "error");
      return;
    }

    const list = getAllOvertime();
    list.push({ uid, name, date, hours, approvedBy });
    saveAllOvertime(list);

    pushNotification("Overtime Added", `OT added for ${name} (${hours}h)`);
    showToast("Overtime Added ✅", "success");

    form.reset();
  });
}

/* ========== DEDUCTIONS (deduction.html) ========== */
function getAllDeductions() {
  return lsGet(KPS_KEYS.deductions, []);
}
function saveAllDeductions(list) {
  lsSet(KPS_KEYS.deductions, list);
}

function loadDeductionTable() {
  if (document.body.dataset.page !== "deduction") return;
  const tbody = document.getElementById("deductionTable");
  if (!tbody) return;

  const data = getAllDeductions();
  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.uid}</td>
      <td>${d.name}</td>
      <td>${d.reason}</td>
      <td>${parseFloat(d.amount).toFixed(2)}</td>
      <td>${d.approvedBy}</td>
    `;
    tbody.appendChild(tr);
  });
}

function bindDeductionForm() {
  if (document.body.dataset.page !== "deduction") return;
  const form = document.getElementById("deductionForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();

    const uid = document.getElementById("uid").value.trim();
    const name = document.getElementById("name").value.trim();
    const reason = document.getElementById("reason").value.trim();
    const amountVal = document.getElementById("amount").value.trim();
    const dateRaw = document.getElementById("date").value;
    const approvedBy = document.getElementById("approvedBy").value.trim();

    if (!uid || !name || !reason || !amountVal || !dateRaw || !approvedBy) {
      showToast("Fill all fields", "error");
      return;
    }

    const amt = parseFloat(amountVal);
    if (isNaN(amt)) {
      showToast("Amount not valid", "error");
      return;
    }

    const dateObj = new Date(dateRaw);
    const date = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });

    const list = getAllDeductions();
    list.push({ uid, name, reason, amount: amt, date, approvedBy });
    saveAllDeductions(list);

    pushNotification("Deduction Added", `Deduction for ${name}: ${amt} AED`);
    showToast("Deduction Added ✅", "success");

    form.reset();
  });
}

/* ========== REQUESTS (request.html) ========== */
function getAllRequests() {
  return lsGet(KPS_KEYS.requests, []);
}
function saveAllRequests(list) {
  lsSet(KPS_KEYS.requests, list);
}

function loadRequestTable() {
  if (document.body.dataset.page !== "request") return;
  const tbody = document.getElementById("requestTable");
  if (!tbody) return;

  const reqs = getAllRequests();
  tbody.innerHTML = "";

  reqs.forEach((r, index) => {
    const processed = r.status !== "Pending";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.uid}</td>
      <td>${r.name}</td>
      <td>${r.type}</td>
      <td>${r.details}</td>
      <td>${r.status}</td>
      <td>${r.approvedBy || "-"}</td>
      <td>
        ${processed ? `
          <span class="badge-done">Processed</span>
        ` : `
          <button class="btn-small btn-success" data-approve="${index}">Approve</button>
          <button class="btn-small btn-danger" data-reject="${index}">Reject</button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind approve / reject buttons
  tbody.querySelectorAll("[data-approve]").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.target.getAttribute("data-approve"));
      approveRequest(idx);
    });
  });
  tbody.querySelectorAll("[data-reject]").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.target.getAttribute("data-reject"));
      rejectRequest(idx);
    });
  });
}

function bindRequestForm() {
  if (document.body.dataset.page !== "request") return;
  const form = document.getElementById("requestForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();

    const uid = document.getElementById("uid").value.trim();
    const name = document.getElementById("name").value.trim();
    const type = document.getElementById("type").value.trim();
    const details = document.getElementById("details").value.trim();
    const dateRaw = document.getElementById("date").value;

    if (!uid || !name || !type || !details || !dateRaw) {
      showToast("Please fill all request fields", "error");
      return;
    }

    const dateObj = new Date(dateRaw);
    const date = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });

    const reqs = getAllRequests();
    reqs.push({
      uid,
      name,
      type,
      details,
      date,
      status: "Pending",
      approvedBy: ""
    });
    saveAllRequests(reqs);

    pushNotification("Request Submitted", `${name} submitted ${type} request`);
    showToast("Request Submitted ✅", "success");

    form.reset();
  });
}

function approveRequest(index) {
  const reqs = getAllRequests();
  if (!reqs[index]) return;
  reqs[index].status = "Approved";
  reqs[index].approvedBy = "Manager/Admin";
  saveAllRequests(reqs);

  pushNotification("Request Approved", `${reqs[index].name}'s request approved`);
  showToast("Approved ✅", "success");
}

function rejectRequest(index) {
  const reqs = getAllRequests();
  if (!reqs[index]) return;
  reqs[index].status = "Rejected";
  reqs[index].approvedBy = "Manager/Admin";
  saveAllRequests(reqs);

  pushNotification("Request Rejected", `${reqs[index].name}'s request rejected`);
  showToast("Rejected ❌", "info");
}

/* ========== NOTIFICATIONS (notifications.html) ========== */
function loadNotificationList() {
  if (document.body.dataset.page !== "notifications") return;
  const container = document.getElementById("notificationList");
  if (!container) return;

  const notes = lsGet(KPS_KEYS.notifications, []);
  container.innerHTML = "";

  if (notes.length === 0) {
    container.innerHTML = '<p class="no-data">No notifications yet.</p>';
    return;
  }

  // show newest first
  notes.slice().reverse().forEach((n, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "notification-item " + (n.read ? "read" : "unread");
    wrap.innerHTML = `
      <div class="notif-header">
        <span class="notif-title">${n.title}</span>
        <span class="notif-time">${n.time}</span>
      </div>
      <div class="notif-body">${n.message}</div>
    `;
    wrap.addEventListener("click", () => {
      // mark read
      const allNotes = lsGet(KPS_KEYS.notifications, []);
      // index in reversed view = translate back
      const realIndex = allNotes.length - 1 - idx;
      allNotes[realIndex].read = true;
      lsSet(KPS_KEYS.notifications, allNotes);
      showToast("Marked as read", "info");
    });
    container.appendChild(wrap);
  });
}

/* live auto-refresh for pages when data changes */
window.addEventListener("storage", e => {
  if (!e.key) return;
  switch (e.key) {
    case KPS_KEYS.attendance:
      loadAttendanceTable();
      break;
    case KPS_KEYS.overtime:
    case KPS_KEYS.attendance: // OT depends on attendance too
      loadOvertimeTable();
      break;
    case KPS_KEYS.deductions:
      loadDeductionTable();
      break;
    case KPS_KEYS.requests:
      loadRequestTable();
      break;
    case KPS_KEYS.notifications:
      loadNotificationList();
      break;
    case KPS_KEYS.session:
      // session changed (logout somewhere else, etc)
      // we could optionally force reload
      break;
  }
});

/* ========== PROFILE PAGE BINDINGS (profile.html) ========== */
function bindProfileForms() {
  if (document.body.dataset.page !== "profile") return;

  const sessionUser = getSessionUser();
  if (!sessionUser) return;

  // Personal info save
  const personalForm = document.getElementById("personalForm");
  if (personalForm) {
    personalForm.addEventListener("submit", e => {
      e.preventDefault();
      const phone = document.getElementById("profilePhone").value.trim();
      const email = document.getElementById("profileEmail").value.trim();

      // update in users list
      const all = getAllUsers();
      const me = all.find(u => u.uid === sessionUser.uid);
      if (me) {
        me.phone = phone;
        me.email = email;
        saveAllUsers(all);
      }

      // sync session
      sessionUser.phone = phone;
      sessionUser.email = email;
      setSessionUser(sessionUser);

      pushNotification("Profile Updated", sessionUser.name + " updated contact info");
      showToast("Personal info updated ✅", "success");
    });
  }

  // Password change
  const pwForm = document.getElementById("passwordForm");
  if (pwForm) {
    pwForm.addEventListener("submit", e => {
      e.preventDefault();
      const currentPw = document.getElementById("currentPw").value.trim();
      const newPw     = document.getElementById("newPw").value.trim();
      const confirmPw = document.getElementById("confirmPw").value.trim();

      if (!currentPw || !newPw || !confirmPw) {
        showToast("Fill all password fields", "error");
        return;
      }
      if (newPw !== confirmPw) {
        showToast("New passwords don't match", "error");
        return;
      }

      const all = getAllUsers();
      const me = all.find(u => u.uid === sessionUser.uid);
      if (!me) {
        showToast("User record not found", "error");
        return;
      }

      if (me.password !== currentPw) {
        showToast("Current password incorrect", "error");
        return;
      }

      me.password = newPw;
      saveAllUsers(all);

      // sync session
      sessionUser.password = newPw;
      setSessionUser(sessionUser);

      pushNotification("Password Changed", sessionUser.name + " changed password");
      showToast("Password updated ✅", "success");

      // clear form
      document.getElementById("currentPw").value = "";
      document.getElementById("newPw").value = "";
      document.getElementById("confirmPw").value = "";
    });
  }
}

/* ========== DASHBOARD PAGE FILL (dashboard.html) ========== */
function fillDashboardCards() {
  if (document.body.dataset.page !== "dashboard") return;

  const session = requireLogin();
  if (!session) return;

  // we'll compute:
  // - attendance % (rough mock: Present / total days recorded)
  // - total OT sum
  // - total deductions
  // - unread notifications count

  const attendanceAll = getAllAttendance().filter(a => a.uid === session.uid);
  const totalDays = attendanceAll.length;
  const presentDays = attendanceAll.filter(a => a.status === "Present").length;
  const pct = totalDays === 0 ? "—" : Math.round((presentDays / totalDays) * 100) + "%";

  // OT sum
  let otSum = 0;
  attendanceAll.forEach(a => {
    otSum += parseFloat(a.ot || 0);
  });

  // Deductions
  const dedAll = getAllDeductions().filter(d => d.uid === session.uid);
  let dedTotal = 0;
  dedAll.forEach(d => {
    dedTotal += parseFloat(d.amount || 0);
  });

  // Notifications unread
  const notifAll = lsGet(KPS_KEYS.notifications, []);
  const unread = notifAll.filter(n => !n.read).length;

  // fill cards if they exist
  const attCardVal = document.querySelector("[data-dash-attendance]");
  const otCardVal  = document.querySelector("[data-dash-ot]");
  const dedCardVal = document.querySelector("[data-dash-ded]");
  const notCardVal = document.querySelector("[data-dash-notif]");

  if (attCardVal) attCardVal.textContent = pct + " Present";
  if (otCardVal)  otCardVal.textContent  = otSum.toFixed(2) + " hrs";
  if (dedCardVal) dedCardVal.textContent = dedTotal.toFixed(2) + " AED";
  if (notCardVal) notCardVal.textContent = unread + " New";

  // attendance latest table (just show last few for dashboard)
  const dashBody = document.getElementById("attendance-list");
  if (dashBody) {
    dashBody.innerHTML = "";
    attendanceAll.slice(-5).reverse().forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.uid}</td>
        <td>${a.name}</td>
        <td>${a.date}</td>
        <td>${a.in || "-"}</td>
        <td>${a.out || "-"}</td>
        <td>${a.duty || "-"}</td>
        <td>${a.ot || "-"}</td>
        <td>${a.status}</td>
      `;
      dashBody.appendChild(tr);
    });
  }
}

/* ========== PAGE INIT (runs on every load) ========== */
function initPage() {
  const page = document.body.dataset.page;

  // If it's not login, require session:
  if (page !== "login") {
    const s = requireLogin();
    if (!s) return;
  }

  // fill header user info / avatar everywhere except login
  if (page !== "login") {
    fillUserHeader();
    bindLogoutLinks();
  }

  // page specific binds
  switch (page) {
    case "login":
      initLoginPage();
      break;
    case "dashboard":
      fillDashboardCards();
      break;
    case "attendance":
      loadAttendanceTable();
      // expose functions for buttons
      window.checkIn = checkIn;
      window.checkOut = checkOut;
      window.markOffDay = markOffDay;
      window.resetAttendance = resetAttendance;
      break;
    case "overtime":
      loadOvertimeTable();
      bindOvertimeForm();
      break;
    case "deduction":
      loadDeductionTable();
      bindDeductionForm();
      break;
    case "request":
      loadRequestTable();
      bindRequestForm();
      break;
    case "notifications":
      loadNotificationList();
      break;
    case "profile":
      bindProfileForms();
      break;
    case "employees":
      // We'll add employee directory UI logic in future expansions
      break;
  }
}

// run init when DOM is ready
document.addEventListener("DOMContentLoaded", initPage);
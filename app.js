/* ---------------------------------------------
   KCAL PACKAGING SYSTEM (KPS)
   Developed by Haroon
   Version 3.5 - Full HR + Attendance Module
----------------------------------------------*/

// --- Local Storage Helpers ---
function lsGet(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Predefined Admin/Managers ---
const KPS_USERS = [
  { uid: "10001", name: "System Admin", role: "Admin", password: "Admin@123" },
  { uid: "10032", name: "Operations Manager", role: "Manager", password: "Manager@123" },
  { uid: "10489", name: "Haroon Iqbal", role: "Supervisor", password: "Supervisor@123" },
  { uid: "10366", name: "Packaging Staff", role: "Staff", password: "User@123" }
];

// --- Session Management ---
function setSession(user) {
  localStorage.setItem("kps_session", JSON.stringify(user));
}
function getSession() {
  return JSON.parse(localStorage.getItem("kps_session") || "null");
}
function clearSession() {
  localStorage.removeItem("kps_session");
}

// --- LOGIN SYSTEM ---
function handleLoginSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById("login-uid").value.trim();
  const pwVal = document.getElementById("login-pw").value.trim();

  if (!idVal || !pwVal) return alert("Please enter your UID and Password.");

  let found = KPS_USERS.find(
    u => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  if (!found) {
    const employees = lsGet("kps_employees", []);
    found = employees.find(
      emp => emp.uid.toString() === idVal.toString() && emp.password === pwVal
    );
  }

  if (!found) {
    alert("Invalid UID or Password!");
    return;
  }

  setSession(found);
  window.location.href = "dashboard.html";
}

// --- LOGOUT ---
function logoutUser() {
  if (confirm("Do you really want to log out?")) {
    clearSession();
    window.location.href = "index.html";
  }
}

// --- Load User Info on Dashboard ---
function loadSessionUser() {
  const session = getSession();
  if (!session) return (window.location.href = "index.html");

  const userName = document.getElementById("user-name");
  const userRole = document.getElementById("user-role");
  if (userName) userName.textContent = session.name;
  if (userRole) userRole.textContent = session.role;
}

// --- EMPLOYEE FUNCTIONS ---
function getEmployees() {
  return lsGet("kps_employees", []);
}
function setEmployees(list) {
  lsSet("kps_employees", list);
}

function saveEmployeeFromModal(e) {
  e.preventDefault();
  const uid = document.getElementById("emp-id").value.trim();
  const name = document.getElementById("emp-name").value.trim();
  const password = document.getElementById("emp-password").value.trim();
  const role = document.getElementById("emp-role").value.trim();
  const section = document.getElementById("emp-section").value.trim();
  const shift = document.getElementById("emp-shift").value.trim();
  const joinDate = document.getElementById("emp-join").value.trim();

  if (!uid || !name || !role) return alert("Please fill UID, Name, and Role.");

  let list = getEmployees();
  const existing = list.findIndex(emp => emp.uid === uid);
  if (existing >= 0) {
    list[existing] = {
      ...list[existing],
      name,
      role,
      section,
      shift,
      joinDate,
      ...(password ? { password } : {})
    };
  } else {
    list.unshift({
      uid,
      name,
      password: password || "KPS@1234",
      role,
      section,
      shift,
      joinDate,
      createdAt: Date.now()
    });
  }

  setEmployees(list);
  alert("✅ Employee saved successfully.");
  document.getElementById("emp-form").reset();
  document.getElementById("emp-modal").style.display = "none";
  renderEmployees();
}

// --- Password Generator ---
document.getElementById("generate-pw")?.addEventListener("click", () => {
  const newPw = "KPS@" + Math.floor(1000 + Math.random() * 9000);
  document.getElementById("emp-password").value = newPw;
  alert(`Generated Password: ${newPw}`);
});

// --- Render Employee Table ---
function renderEmployees() {
  const list = getEmployees();
  const tbody = document.getElementById("emp-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach(emp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.uid}</td>
      <td>${emp.name}</td>
      <td>${emp.role}</td>
      <td>${emp.section || "-"}</td>
      <td>${emp.shift || "-"}</td>
      <td>${emp.joinDate || "-"}</td>
      <td>
        <button class="btn-edit" data-edit="${emp.uid}">✏️</button>
        <button class="btn-delete" data-del="${emp.uid}">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => openEmployeeForEdit(btn.dataset.edit))
  );

  tbody.querySelectorAll("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => deleteEmployee(btn.dataset.del))
  );
}

function openEmployeeForEdit(uid) {
  const emp = getEmployees().find(e => e.uid === uid);
  if (!emp) return;
  document.getElementById("emp-modal").style.display = "flex";
  document.getElementById("emp-id").value = emp.uid;
  document.getElementById("emp-name").value = emp.name;
  document.getElementById("emp-role").value = emp.role;
  document.getElementById("emp-section").value = emp.section || "";
  document.getElementById("emp-shift").value = emp.shift || "";
  document.getElementById("emp-join").value = emp.joinDate || "";
}

function deleteEmployee(uid) {
  if (!confirm("Delete this employee?")) return;
  let list = getEmployees();
  list = list.filter(e => e.uid !== uid);
  setEmployees(list);
  renderEmployees();
}

// --- ATTENDANCE MANAGEMENT ---
function getAttendance() {
  return lsGet("kps_attendance", []);
}
function setAttendance(list) {
  lsSet("kps_attendance", list);
}

function checkIn() {
  const user = getSession();
  if (!user) return alert("Please log in first.");
  const today = new Date().toISOString().split("T")[0];
  let attendance = getAttendance();
  if (attendance.find(r => r.uid === user.uid && r.date === today)) {
    return alert("Already checked in today!");
  }
  attendance.push({
    uid: user.uid,
    name: user.name,
    role: user.role,
    date: today,
    in: new Date().toLocaleTimeString(),
    out: "",
    status: "Present"
  });
  setAttendance(attendance);
  alert("✅ Checked in successfully!");
}

function checkOut() {
  const user = getSession();
  if (!user) return alert("Please log in first.");
  const today = new Date().toISOString().split("T")[0];
  let attendance = getAttendance();
  const record = attendance.find(r => r.uid === user.uid && r.date === today);
  if (!record) return alert("Please check in first!");
  if (record.out) return alert("Already checked out!");

  const inTime = new Date(`${today} ${record.in}`);
  const outTime = new Date();
  const totalHours = (outTime - inTime) / (1000 * 60 * 60) - 1; // 1-hour break
  const overtime = totalHours > 10 ? totalHours - 10 : 0;

  record.out = outTime.toLocaleTimeString();
  record.netHours = totalHours;
  record.overtime = overtime;
  record.status = "Completed";

  setAttendance(attendance);
  alert("✅ Checked out successfully!");
}

// --- Edit & Reset Attendance (Admin / Manager / Supervisor) ---
function renderAttendanceTable() {
  const list = getAttendance();
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const session = getSession();
  const canModify = ["Admin", "Manager", "Supervisor"].includes(session.role);

  list.forEach(row => {
    const tr = document.createElement("tr");
    const otDisplay = row.overtime ? row.overtime.toFixed(2) : "0.00";
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>${row.name}</td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td>${row.netHours ? row.netHours.toFixed(2) : "0.00"}</td>
      <td>${otDisplay}</td>
      <td>${row.status}</td>
      <td>${canModify ? `
        <button class="btn-edit" data-edit="${row.uid}" data-date="${row.date}">✏️</button>
        <button class="btn-reset" data-reset="${row.uid}" data-date="${row.date}">↻</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Notifications ---
function addNotification(obj) {
  const list = lsGet("kps_notifications", []);
  list.unshift(obj);
  lsSet("kps_notifications", list);
}

// --- Page Init ---
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    document.getElementById("login-form")?.addEventListener("submit", handleLoginSubmit);
  }

  if (page === "employees") {
    renderEmployees();
    document.getElementById("emp-form")?.addEventListener("submit", saveEmployeeFromModal);
    document.getElementById("close-emp-modal")?.addEventListener("click", () => {
      document.getElementById("emp-modal").style.display = "none";
    });
  }

  if (page === "dashboard" || page === "attendance") {
    loadSessionUser();
  }

  document.getElementById("check-in-btn")?.addEventListener("click", checkIn);
  document.getElementById("check-out-btn")?.addEventListener("click", checkOut);

  document.querySelectorAll("[data-logout]")?.forEach(btn =>
    btn.addEventListener("click", logoutUser)
  );
});

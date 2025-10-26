/* KPS Frontend Logic
   - simple login
   - mock dashboard stats
   - mock attendance table
   - mock overtime table
   - signout
*/

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

/* ------------ LOGIN PAGE ------------ */
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

  // Save "session"
  localStorage.setItem(
    "kps_session",
    JSON.stringify({
      uid: found.uid,
      name: found.name,
      role: found.role,
    })
  );

  // go to dashboard
  window.location.href = "dashboard.html";
}

/* ------------ SESSION HELPERS ------------ */
function getSession() {
  const raw = localStorage.getItem("kps_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requireSessionOrRedirect() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

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
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("");
    avatarEl.textContent = initials || "U";
  }
  if (notifEl) notifEl.textContent = "3"; // mock
}

/* ------------ SIGN OUT ------------ */
function signOut() {
  localStorage.removeItem("kps_session");
  window.location.href = "index.html";
}

/* Attach signout to any [data-logout] element */
function wireSignOutButtons() {
  const btns = document.querySelectorAll("[data-logout]");
  btns.forEach((btn) => {
    btn.addEventListener("click", signOut);
  });
}

/* ------------ DASHBOARD MOCK ------------ */
function loadDashboardStats() {
  const s1 = document.getElementById("stat-attendance");
  const s2 = document.getElementById("stat-overtime");
  const s3 = document.getElementById("stat-deductions");
  const s4 = document.getElementById("stat-notifications");

  if (s1) s1.textContent = "92% Present";
  if (s2) s2.textContent = "18 hrs";
  if (s3) s3.textContent = "320 AED";
  if (s4) s4.textContent = "3 New";
}

/* ------------ ATTENDANCE MOCK ------------ */
const ATTENDANCE_ROWS = [
  {
    uid: "10366",
    name: "Sanjay Nayek",
    title: "Senior Packer (Kcal Life)",
    date: "2025-10-26",
    in: "08:00",
    out: "18:00",
    status: "P",
    remarks: "",
  },
  {
    uid: "10391",
    name: "Asanka Sampath",
    title: "Senior Packer (Night)",
    date: "2025-10-26",
    in: "20:00",
    out: "06:00",
    status: "P",
    remarks: "",
  },
  {
    uid: "11032",
    name: "Yogesh Sundas",
    title: "Junior Packer (Spring)",
    date: "2025-10-26",
    in: "—",
    out: "—",
    status: "DO",
    remarks: "Day Off",
  },
  {
    uid: "10907",
    name: "Rubel Ali",
    title: "Junior Packer (Night)",
    date: "2025-10-26",
    in: "—",
    out: "—",
    status: "AB",
    remarks: "No Show",
  },
];

function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  ATTENDANCE_ROWS.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.uid}</td>
      <td>
        ${row.name}<br>
        <small style="opacity:.7">${row.title}</small>
      </td>
      <td>${row.date}</td>
      <td>${row.in}</td>
      <td>${row.out}</td>
      <td><span class="status-pill">${row.status}</span></td>
      <td>${row.remarks || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ------------ OVERTIME MOCK ------------ */
let OVERTIME_ROWS = [
  {
    date: "2025-10-26",
    uid: "10366",
    name: "Sanjay Nayek",
    inTime: "08:00",
    outTime: "19:00",
    dutyHours: "11:00",
    totalOver: "1.0",
    reason: "Order volume high",
    status: "Pending Supervisor",
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
    status: "Approved",
  },
];

function renderOvertimeTable() {
  const tbody = document.getElementById("overtime-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  OVERTIME_ROWS.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>
        ${row.uid}<br>
        <small style="opacity:.7">${row.name}</small>
      </td>
      <td>${row.inTime} - ${row.outTime}</td>
      <td>${row.dutyHours}</td>
      <td>${row.totalOver} hr</td>
      <td>${row.reason}</td>
      <td><span class="status-pill">${row.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* new overtime submit (front-end only) */
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

  OVERTIME_ROWS.unshift({
    date,
    uid,
    name,
    inTime,
    outTime,
    dutyHours,
    totalOver,
    reason,
    status: "Pending Supervisor",
  });

  renderOvertimeTable();
  e.target.reset();
}

/* ------------ INIT PER PAGE ------------ */
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

  fillNavUserInfo();
  wireSignOutButtons();

  if (page === "dashboard") {
    loadDashboardStats();
  }

  if (page === "attendance") {
    renderAttendanceTable();
  }

  if (page === "overtime") {
    renderOvertimeTable();
    const form = document.getElementById("overtime-form");
    if (form) form.addEventListener("submit", handleOvertimeSubmit);
  }
});

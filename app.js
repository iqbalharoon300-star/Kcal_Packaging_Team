/* =========================================================
   KPS — KCAL PACKAGING SYSTEM (Frontend Only)
   Author: Haroon
   ========================================================= */

/* ---------- LocalStorage helpers with soft realtime ---------- */
function lsGet(key, fallback){ try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch{return fallback;}}
function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); publishUpdate(key); }

/* Realtime (same device / multiple tabs) */
const bc = ("BroadcastChannel" in window) ? new BroadcastChannel("kps-bus") : null;
function publishUpdate(key){ if(bc) bc.postMessage({type:"ls-update", key, ts:Date.now()}); }

/* Storage event (other tabs) */
window.addEventListener("storage", (e)=>{ if(e.key && e.key.startsWith("kps_")) softRerender(); });
if(bc){ bc.onmessage = ()=> softRerender(); }
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    const form = document.getElementById("login-form");
    if (form) form.addEventListener("submit", handleLoginSubmit);
  }
});

function softRerender(){
  const page = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (!page) return;
  if (page==="dashboard"){ loadDashboardStats(); fillNavUserInfo(); }
  if (page==="attendance"){ renderAttendanceTable(); fillTodaySummaryBox(); updateCheckButtonsState(); }
  if (page==="employees"){ renderEmployeesTable(); }
  if (page==="profile"){ renderProfileHeader(); renderProfileAttendanceHistory(); }
  if (page==="notifications"){ renderNotificationsPage(); }
  if (page==="overtime"){ renderOvertimeTable(); }
}

/* ---------- Built-in accounts (ONLY ADMIN by default) ---------- */
const KPS_USERS = [
  { uid:"10001", name:"System Admin", role:"Admin", password:"Admin@123", section:"Head Office", shift:"Day", joinDate:"2023-01-01" }
];

/* ---------- First run initializer ---------- */
function currentYearMonth(){
  const now=new Date(); const y=now.getFullYear(); const m=String(now.getMonth()+1).padStart(2,"0"); return `${y}-${m}`;
}
function bootstrapOnce(){
  if(localStorage.getItem("kps_bootstrap_v2")) return;
  lsSet("kps_employees", []);                 // no demo employees
  lsSet("kps_attendance", []);                // clean attendance
  lsSet("kps_notifications", []);             // empty feed
  localStorage.setItem("kps_attendance_month", currentYearMonth());
  localStorage.setItem("kps_bootstrap_v2","true");
}
bootstrapOnce();

/* ---------- Session ---------- */
function setSession(user){ localStorage.setItem("kps_session", JSON.stringify(user)); }
function getSession(){ return JSON.parse(localStorage.getItem("kps_session") || "null"); }
function requireSessionOrRedirect(){ const s=getSession(); if(!s){ window.location.href="index.html"; return null; } return s; }
function signOut(){ localStorage.removeItem("kps_session"); window.location.href="index.html"; }

/* ---------- Monthly rollover (archives) ---------- */
function monthlyAttendanceRollover(){
  const thisYM=currentYearMonth(); const stored=localStorage.getItem("kps_attendance_month");
  if(!stored){ localStorage.setItem("kps_attendance_month", thisYM); return; }
  if(stored===thisYM) return;
  const prev = lsGet("kps_attendance", []);
  if(prev.length){ lsSet("kps_attendance_archive_"+stored.replace("-","_"), prev); }
  lsSet("kps_attendance", []);
  localStorage.setItem("kps_attendance_month", thisYM);
}

/* ---------- Login ---------- */
function handleLoginSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById("login-uid").value.trim();
  const pwVal = document.getElementById("login-pw").value.trim();

  if (!idVal || !pwVal) {
    alert("Please enter your UID and Password.");
    return;
  }

  const KPS_USERS = [
    { uid: "10001", name: "System Admin", role: "Admin", password: "Admin@123" }
  ];

  let found = KPS_USERS.find(
    (u) => u.uid.toString() === idVal.toString() && u.password === pwVal
  );

  if (!found) {
    const employees = JSON.parse(localStorage.getItem("kps_employees") || "[]");
    found = employees.find(
      (emp) => emp.uid.toString() === idVal.toString() && emp.password === pwVal
    );
  }

  if (!found) {
    alert("❌ Invalid UID or Password!");
    return;
  }

  localStorage.setItem("kps_session", JSON.stringify(found));
  window.location.href = "dashboard.html";
}
/* ---------- NAV / Header ---------- */
function canManageEmployees(role){ return role==="Admin" || role==="Manager" || role==="Supervisor"; }
function getAvatarData(uid, name){
  const profiles=lsGet("kps_profiles",{}); const p=profiles[uid];
  if(p && p.photoDataUrl) return {type:"img",src:p.photoDataUrl};
  const initials=(name||"U").split(" ").map(s=>s[0]||"").join("").slice(0,2).toUpperCase();
  return {type:"text",txt:initials};
}
function fillNavUserInfo(){
  const s=getSession(); if(!s) return;
  const nameEl=document.getElementById("user-name"); const roleEl=document.getElementById("user-role");
  const avatarEl=document.getElementById("user-avatar-initials"); const navEmployeesLink=document.getElementById("nav-employees-link");
  if(nameEl) nameEl.textContent=s.name; if(roleEl) roleEl.textContent=s.role;
  if(avatarEl){ const av=getAvatarData(s.uid,s.name); if(av.type==="img"){ avatarEl.innerHTML=`<img src="${av.src}" alt="a"/>`; } else { avatarEl.textContent=av.txt; } }
  if(navEmployeesLink && !canManageEmployees(s.role)) navEmployeesLink.style.display="none";
}
function wireGlobalLogout(){ document.querySelectorAll("[data-logout]").forEach(btn=>btn.addEventListener("click", signOut)); }

/* ---------- TIME & attendance helpers ---------- */
function getNow(){ const d=new Date(); const pad=n=>String(n).padStart(2,"0"); return { dateStr:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, timeStr:`${pad(d.getHours())}:${pad(d.getMinutes())}` }; }
function diffHours(a,b){ if(!a||!b||a==="—"||b==="—") return 0; const [ah,am]=a.split(":").map(Number); const [bh,bm]=b.split(":").map(Number); return (bh+bm/60)-(ah+am/60); }
function computeDuty(inT,outT){ let net=diffHours(inT,outT)-1; if(net<0) net=0; let ot=net-10; if(ot<0) ot=0; return {netHours:+net.toFixed(2), overtime:+ot.toFixed(2)}; }
function rowStatus(inT,outT){ if(inT!=="—"&&outT!=="—") return "Present"; if(inT!=="—"&&outT==="—") return "Half Day"; if(inT==="—"&&outT==="—") return "AB"; return "Present"; }

/* ---------- Attendance store ---------- */
function getAttendance(){ return lsGet("kps_attendance", []); }
function setAttendance(list){ lsSet("kps_attendance", list); }
function addNotification(n){ const list=lsGet("kps_notifications",[]); list.unshift(n); lsSet("kps_notifications", list); }

/* ---------- Attendance actions ---------- */
function ensureTodayRowForUser(user){
  const now=getNow(); const list=getAttendance();
  let row=list.find(r=>r.uid===user.uid && r.date===now.dateStr);
  if(!row){ row={uid:user.uid,name:user.name,title:user.role,date:now.dateStr,in:"—",out:"—",netHours:0,overtime:0,status:"AB"}; list.unshift(row); setAttendance(list); }
  return row;
}
function handleCheckIn(){
  const s=requireSessionOrRedirect(); if(!s) return;
  const now=getNow(); const list=getAttendance(); let row=list.find(r=>r.uid===s.uid && r.date===now.dateStr);
  if(!row){ row={uid:s.uid,name:s.name,title:s.role,date:now.dateStr,in:now.timeStr,out:"—",netHours:0,overtime:0,status:"Present"}; list.unshift(row); }
  else if(row.in!=="—"){ alert("Already checked IN."); return; } else { row.in=now.timeStr; row.status="Present"; }
  setAttendance(list);
  addNotification({category:"Attendance",message:`${s.name} checked IN at ${now.timeStr}`,ts:Date.now()});
  renderAttendanceTable(); fillTodaySummaryBox(); updateCheckButtonsState();
}
function handleCheckOut() {
  const s = requireSessionOrRedirect();
  if (!s) return;

  const now = getNow();
  const list = getAttendance();
  let row = list.find(r => r.uid === s.uid && r.date === now.dateStr);

  if (!row || row.in === "—") {
    alert("Please Check IN first.");
    return;
  }
  if (row.out !== "—") {
    alert("Already checked OUT.");
    return;
  }

  row.out = now.timeStr;
  const duty = computeDuty(row.in, row.out);
  row.netHours = duty.netHours;
  row.overtime = duty.overtime;
  row.status = rowStatus(row.in, row.out);

  setAttendance(list);
  addNotification({
    category: "Attendance",
    message: `${s.name} checked OUT at ${now.timeStr}`,
    ts: Date.now(),
  });

  renderAttendanceTable();
  fillTodaySummaryBox();
  updateCheckButtonsState();
}

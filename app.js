// ====== Storage Keys ======
const LS_KEY = "seventyfive_state_v1";

// ====== State ======
const defaultState = {
  startDate: null,               // yyyy-mm-dd
  startWeight: null,
  days: Array.from({ length: 75 }, () => ({
    completed: false,
    date: null,                  // actual calendar date for that challenge day
    checks: {
      diet: false,
      waterCups: 0,              // 0..8
      inGym: false,
      outdoor: false,
      read: false,
      photo: false
    },
    photoDataUrl: null,
    weight: null                 // optional logged weight for that date
  })),
  weights: [],                   // [{date, value}]
  lastCompletedIndex: -1,
  lastOpenDate: null             // yyyy-mm-dd (for gap detection)
};

let state = loadState();

// ====== Helpers ======
function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}
function fmtDateISO(d) {
  return d.toISOString().slice(0,10);
}
function daysBetween(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const diff = (b - a - tzOffset) / 86400000;
  return Math.floor(diff);
}

function todayISO() {
  const now = new Date();
  // תיקון אזור זמן - נוריד את ה־offset של ה־UTC כדי לקבל תאריך מקומי אמיתי
  const tzOffset = now.getTimezoneOffset() * 60000;
  const local = new Date(now - tzOffset);
  return local.toISOString().slice(0, 10);
}

function ensureStartDates() {
  if (!state.startDate) return;
  const start = new Date(state.startDate + "T00:00:00");
  for (let i = 0; i < 75; i++) {
    const di = new Date(start);
    // נוודא שיום 1 = תאריך ההתחלה (לא אתמול)
    di.setDate(start.getDate() + i);
    state.days[i].date = fmtDateISO(di);
  }
}

function currentChallengeIndex() {
  if (!state.startDate) return null;
  const diff = daysBetween(state.startDate, todayISO());
  if (diff < 0) return 0;
  if (diff > 74) return 74;
  return diff;
}



function completionPercentage() {
  const done = state.days.filter(d => d.completed).length;
  return Math.round((done/75)*100);
}
function consistencyStreak() {
  // רצף מההתחלה עד שאנו מוצאים יום לא הושלם
  let streak = 0;
  for (let i=0; i<75; i++){
    if (state.days[i].completed) streak++;
    else break;
  }
  return streak;
}
function setMotivation(dayIdx) {
  const msgs = [
    "הבטחה לעצמך היא החוזה הכי חשוב שיש.",
    "היום – לא מחר. צא לדרך.",
    "אם זה חשוב — תמצא דרך. אם לא — תמצא תירוץ.",
    "משמעת > מוטיבציה.",
    "צעד קטן היום שווה קילומטרים מחר.",
    "רק אתה מול המראה. תנצח אותו.",
    "שום מזג אוויר לא חזק ממך.",
  ];
  const el = document.getElementById("motivationText");
  el.textContent = msgs[dayIdx % msgs.length];
}
function softToast(msg) {
  const el = document.getElementById("dayStatus");
  el.textContent = msg;
  setTimeout(()=>{ el.textContent=""; }, 4000);
}

// ====== Init DOM refs ======
const startDateInput = document.getElementById("startDateInput");
const startWeightInput = document.getElementById("startWeightInput");
const saveStartBtn = document.getElementById("saveStart");

// Dashboard
const currentDayEl = document.getElementById("currentDay");
const daysLeftEl = document.getElementById("daysLeft");
const overallProgressBar = document.getElementById("overallProgressBar");
const overallProgressText = document.getElementById("overallProgressText");
const daysCompletedEl = document.getElementById("daysCompleted");

// Daily
const waterCupsContainer = document.getElementById("waterCups");
const dietCheck = document.getElementById("dietCheck");
const workoutIndoor = document.getElementById("workoutIndoor");
const workoutOutdoor = document.getElementById("workoutOutdoor");
const readCheck = document.getElementById("readCheck");
const photoCheck = document.getElementById("photoCheck");
const photoInput = document.getElementById("photoInput");

const markDayDoneBtn = document.getElementById("markDayDone");
const resetToDay1Btn = document.getElementById("resetToDay1");
const daysTableBody = document.getElementById("daysTableBody");

// Stats
const completionBar = document.getElementById("completionBar");
const completionText = document.getElementById("completionText");
const consistencyBar = document.getElementById("consistencyBar");
const consistencyText = document.getElementById("consistencyText");

// Weight
const addWeightBtn = document.getElementById("addWeight");
const todayWeightInput = document.getElementById("todayWeight");
const weightList = document.getElementById("weightList");

// Tabs
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    renderAll();
  });
});

// ====== Build Water Cups ======
function buildCups(count){
  waterCupsContainer.innerHTML = "";
  for (let i=0;i<8;i++){
    const div = document.createElement("div");
    div.className = "cup" + (i < count ? " active" : "");
    div.innerHTML = `<span>${(i+1)*0.5}L</span>`;
    div.addEventListener("click", ()=>{
      const newCount = (i+1);
      const idx = currentChallengeIndex();
      if (idx === null) return softToast("שמור תאריך התחלה קודם");
      state.days[idx].checks.waterCups = newCount;
      saveState();
      buildCups(newCount);
    });
    waterCupsContainer.appendChild(div);
  }
}

// ====== Daily Checks Bindings ======
function bindDailyCheckbox(el, path) {
  el.addEventListener("change", ()=>{
    const idx = currentChallengeIndex();
    if (idx === null) return softToast("שמור תאריך התחלה קודם");
    state.days[idx].checks[path] = el.checked;
    saveState();
  });
}
bindDailyCheckbox(dietCheck, "diet");
bindDailyCheckbox(workoutIndoor, "inGym");
bindDailyCheckbox(workoutOutdoor, "outdoor");
bindDailyCheckbox(readCheck, "read");
bindDailyCheckbox(photoCheck, "photo");

photoInput.addEventListener("change", ()=>{
  const file = photoInput.files?.[0];
  const idx = currentChallengeIndex();
  if (!file || idx===null) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.days[idx].photoDataUrl = reader.result;
    saveState();
    softToast("תמונת התקדמות נשמרה מקומית ✔️");
  };
  reader.readAsDataURL(file);
});

// ====== Mark Day Done ======
markDayDoneBtn.addEventListener("click", ()=>{
  const idx = currentChallengeIndex();
  if (idx === null) return softToast("שמור תאריך התחלה קודם");
  const d = state.days[idx];

  const allOk =
    d.checks.diet &&
    d.checks.waterCups === 8 &&
    d.checks.inGym &&
    d.checks.outdoor &&
    d.checks.read &&
    d.checks.photo;

  if (!allOk) {
    return softToast("כדי להשלים יום חייבים להשלים את כל המשימות (כולל 8/8 מים).");
  }
  d.completed = true;
  saveState();
  renderAll();
  softToast("יום הושלם ✔️ יפה!");
});

// ====== Reset ======
resetToDay1Btn.addEventListener("click", ()=>{
  if (!confirm("לאפס לאתגר מחדש (תחזור ליום 1)?")) return;
  // שמור רק תאריך התחלה אם המשתמש לא רוצה לשנות
  const keepStartDate = state.startDate;
  const keepWeight = state.startWeight;

  state = structuredClone(defaultState);
  state.startDate = keepStartDate;
  state.startWeight = keepWeight;
  ensureStartDates();
  saveState();
  renderAll();
  softToast("אופס… לפי החוקים – חוזרים ליום 1.");
});

// ====== Start Inputs ======
saveStartBtn.addEventListener("click", ()=>{
  const dateVal = startDateInput.value || todayISO();
  state.startDate = dateVal;
  state.startWeight = startWeightInput.value ? Number(startWeightInput.value) : null;
  ensureStartDates();
  saveState();
  renderAll();
  softToast("נשמר. צא לדרך 💪");
});

// ====== Weight Log ======
addWeightBtn.addEventListener("click", ()=>{
  const v = todayWeightInput.value ? Number(todayWeightInput.value) : null;
  if (!v) return softToast("הכנס משקל מספרי.");
  const d = todayISO();
  state.weights.push({ date:d, value:v });
  // אם היום מסומן באתגר, נשמור גם שם
  const idx = currentChallengeIndex();
  if (idx !== null) state.days[idx].weight = v;
  saveState();
  todayWeightInput.value = "";
  renderWeights();
  renderStats();
  softToast("משקל נוסף ✔️");
});

function renderWeights(){
  weightList.innerHTML = "";
  const arr = [...state.weights].sort((a,b)=>a.date.localeCompare(b.date));
  for(const w of arr){
    const li = document.createElement("li");
    li.textContent = `${w.date} — ${w.value} ק״ג`;
    weightList.appendChild(li);
  }
}

// ====== Renderers ======
function renderDashboard(){
  const idx = currentChallengeIndex();
  if (state.startDate) {
    const day = idx!==null ? (idx+1) : 1;
    currentDayEl.textContent = String(day);
    daysLeftEl.textContent = `נשארו ${Math.max(0, 75 - day)} ימים`;
  } else {
    currentDayEl.textContent = "—";
    daysLeftEl.textContent = "בחר תאריך התחלה";
  }

  const pct = completionPercentage();
  overallProgressBar.style.width = pct + "%";
  overallProgressText.textContent = pct + "%";
  const done = state.days.filter(d=>d.completed).length;
  daysCompletedEl.textContent = `${done} / 75`;

  setMotivation(idx ?? 0);

  // hydrate inputs
  startDateInput.value = state.startDate || "";
  startWeightInput.value = state.startWeight ?? "";
}

function renderDaily(){
  const idx = currentChallengeIndex();
  const d = idx===null ? null : state.days[idx];

  buildCups(d ? d.checks.waterCups : 0);

  dietCheck.checked = d?.checks.diet ?? false;
  workoutIndoor.checked = d?.checks.inGym ?? false;
  workoutOutdoor.checked = d?.checks.outdoor ?? false;
  readCheck.checked = d?.checks.read ?? false;
  photoCheck.checked = d?.checks.photo ?? false;

  // table
  daysTableBody.innerHTML = "";
  for (let i=0;i<75;i++){
    const row = document.createElement("tr");
    const st = state.days[i];
    const td1 = document.createElement("td"); td1.textContent = (i+1);
    const td2 = document.createElement("td"); td2.textContent = st.date || "—";
    const td3 = document.createElement("td"); td3.textContent = st.completed ? "הושלם ✔️" : "פתוח";
    row.append(td1,td2,td3);
    daysTableBody.appendChild(row);
  }
}

function renderStats(){
  const pct = completionPercentage();
  completionBar.style.width = pct+"%";
  completionText.textContent = `השלמות: ${pct}%`;

  const streak = consistencyStreak();
  const pctStreak = Math.min(100, Math.round((streak/75)*100));
  consistencyBar.style.width = pctStreak+"%";
  consistencyText.textContent = `רצף נוכחי: ${streak} ימים`;
}

function guardGapReset(){
  // אם המשתמש לא נכנס יומיים ומיום שהיה אמור להיות הושלם יש gap לא מושלם — מציעים איפוס.
  if (!state.startDate) return;
  const today = todayISO();
  if (!state.lastOpenDate) { state.lastOpenDate = today; saveState(); return; }

  // מצא את היום האחרון שהיה אמור להיות (לפי תאריך התחלה)
  const idx = currentChallengeIndex();
  if (idx===null) return;
  // אם יש יום קטן מ־idx שלא הושלם, זה אומר שנוצר פער.
  for (let i=0; i<idx; i++){
    if (!state.days[i].completed){
      if (confirm("נראה שיש יום שעבר ולא הושלם לפי הכללים. לאתחל ליום 1?")) {
        const keepSD = state.startDate; const keepW = state.startWeight;
        state = structuredClone(defaultState);
        state.startDate = keepSD;
        state.startWeight = keepW;
        ensureStartDates();
        saveState();
      }
      break;
    }
  }
  state.lastOpenDate = today;
  saveState();
}

function renderAll(){
  ensureStartDates();
  renderDashboard();
  renderDaily();
  renderStats();
  renderWeights();
}

// ====== Boot ======
guardGapReset();
renderAll();

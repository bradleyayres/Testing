const STORAGE_KEY = "scaffoldflow_jobs_v4";

const seedJobs = [
  {
    id: crypto.randomUUID(),
    areaTown: "Leeds",
    sorCode: "SOR-1001",
    toBeConfirmed: "No",
    purchaseNumber: "PO-9981",
    jobNumber: "J-4501",
    date: "2026-03-28",
    amPm: "AM",
    address: "12 Harper Road",
    postCode: "LS1 2AB",
    area: "North",
    accessRequiredFor: "Roof edge work",
    durationHireDays: "7",
    operativeName: "James Cole",
    operativeContact: "07123 456789",
    supervisorName: "Nina Patel",
    supervisorEmail: "nina@scaffoldflow.com",
    comments: [{ text: "Initial booking created", createdAt: new Date().toISOString() }]
  }
];

const state = {
  jobs: loadJobs(),
  monthCursor: new Date(),
  editingId: null,
  draftComments: []
};

const els = {
  dashboardView: document.getElementById("dashboardView"),
  calendarView: document.getElementById("calendarView"),
  calendarToggleBtn: document.getElementById("calendarToggleBtn"),
  dashboardCards: document.getElementById("dashboardCards"),
  jobsTableBody: document.getElementById("jobsTableBody"),
  monthLabel: document.getElementById("monthLabel"),
  calendarGrid: document.getElementById("calendarGrid"),
  jobModal: document.getElementById("jobModal"),
  modalTitle: document.getElementById("modalTitle"),
  jobForm: document.getElementById("jobForm"),
  deleteBtn: document.getElementById("deleteBtn"),
  commentsHistory: document.getElementById("commentsHistory"),
  commentInput: document.getElementById("commentInput")
};

function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedJobs;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeJob) : seedJobs;
  } catch {
    return seedJobs;
  }
}

function saveJobs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.jobs));
}

function normalizeJob(job) {
  const j = job || {};
  return {
    id: j.id || crypto.randomUUID(),
    areaTown: j.areaTown || "",
    sorCode: j.sorCode || "",
    toBeConfirmed: j.toBeConfirmed || "",
    purchaseNumber: j.purchaseNumber || "",
    jobNumber: j.jobNumber || "",
    date: j.date || "",
    amPm: j.amPm || "",
    address: j.address || "",
    postCode: j.postCode || "",
    area: j.area || "",
    accessRequiredFor: j.accessRequiredFor || "",
    durationHireDays: j.durationHireDays || "",
    operativeName: j.operativeName || "",
    operativeContact: j.operativeContact || "",
    supervisorName: j.supervisorName || "",
    supervisorEmail: j.supervisorEmail || "",
    comments: Array.isArray(j.comments)
      ? j.comments.map((c) => ({ text: String(c.text || ""), createdAt: c.createdAt || new Date().toISOString() }))
      : []
  };
}

function render() {
  renderCards();
  renderTable();
  renderCalendar();
}

function renderCards() {
  const total = state.jobs.length;
  const amCount = state.jobs.filter((j) => j.amPm === "AM").length;
  const pmCount = state.jobs.filter((j) => j.amPm === "PM").length;
  const withComments = state.jobs.filter((j) => j.comments && j.comments.length).length;

  els.dashboardCards.innerHTML = [
    ["Total Jobs", total],
    ["AM Bookings", amCount],
    ["PM Bookings", pmCount],
    ["With Comments", withComments]
  ].map(([label, value]) => `<article class="card"><div class="value">${value}</div><div>${label}</div></article>`).join("");
}

function renderTable() {
  const rows = state.jobs
    .slice()
    .sort((a, b) => new Date(a.date || "2100-01-01") - new Date(b.date || "2100-01-01"))
    .map((job) => `
      <tr>
        <td>${esc(job.jobNumber)}</td>
        <td>${esc(job.areaTown)}</td>
        <td>${formatDate(job.date)}</td>
        <td>${esc(job.amPm)}</td>
        <td>${esc(job.sorCode)}</td>
        <td>${esc(job.operativeName)}</td>
        <td><button class="btn btn-secondary open-job" data-id="${job.id}">Open</button></td>
      </tr>
    `)
    .join("");

  els.jobsTableBody.innerHTML = rows || '<tr><td colspan="7">No jobs yet.</td></tr>';

  document.querySelectorAll(".open-job").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
}

function renderCalendar() {
  const first = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const month = first.getMonth();
  els.monthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const html = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => html.push(`<div class="c-head">${d}</div>`));
  for (let i = 0; i < first.getDay(); i += 1) html.push('<div class="c-day c-off"></div>');

  let day = 1;
  while (true) {
    const dateObj = new Date(first.getFullYear(), first.getMonth(), day);
    if (dateObj.getMonth() !== month) break;
    const iso = dateObj.toISOString().slice(0, 10);
    const matches = state.jobs.filter((j) => j.date === iso);
    html.push(`<div class="c-day"><div>${day}</div>${matches.map((m) => `<div class="c-badge">${esc(m.jobNumber)} ${esc(m.amPm)}</div>`).join("")}</div>`);
    day += 1;
  }

  els.calendarGrid.innerHTML = html.join("");
}

function openModal() {
  els.jobModal.classList.remove("hidden");
  els.jobModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  els.jobModal.classList.add("hidden");
  els.jobModal.setAttribute("aria-hidden", "true");
}

function openNew() {
  state.editingId = null;
  state.draftComments = [];
  els.modalTitle.textContent = "Add Job";
  els.jobForm.reset();
  els.deleteBtn.style.display = "none";
  renderComments();
  openModal();
}

function openEdit(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  state.editingId = id;
  state.draftComments = Array.isArray(job.comments) ? [...job.comments] : [];
  els.modalTitle.textContent = `Edit Job ${job.jobNumber}`;
  Object.entries(job).forEach(([k, v]) => {
    if (els.jobForm.elements[k]) els.jobForm.elements[k].value = v;
  });
  els.deleteBtn.style.display = "inline-block";
  renderComments();
  openModal();
}

function renderComments() {
  if (!state.draftComments.length) {
    els.commentsHistory.innerHTML = '<div class="comment-item"><small>No comments yet.</small></div>';
    return;
  }

  els.commentsHistory.innerHTML = state.draftComments
    .map((c) => `<div class="comment-item">${esc(c.text)}<small>${new Date(c.createdAt).toLocaleString()}</small></div>`)
    .join("");
}

function toggleView() {
  const showCalendar = !els.calendarView.classList.contains("active");
  els.dashboardView.classList.toggle("active", !showCalendar);
  els.calendarView.classList.toggle("active", showCalendar);
  els.calendarToggleBtn.textContent = showCalendar ? "Dashboard" : "Bookings Calendar";
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

document.getElementById("newBookingBtn").addEventListener("click", openNew);
els.calendarToggleBtn.addEventListener("click", toggleView);
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

document.getElementById("addCommentBtn").addEventListener("click", () => {
  const text = els.commentInput.value.trim();
  if (!text) return;
  state.draftComments.push({ text, createdAt: new Date().toISOString() });
  els.commentInput.value = "";
  renderComments();
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!state.editingId) return;
  state.jobs = state.jobs.filter((j) => j.id !== state.editingId);
  saveJobs();
  closeModal();
  render();
});

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() + 1);
  renderCalendar();
});

els.jobForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = normalizeJob(Object.fromEntries(new FormData(els.jobForm).entries()));
  payload.comments = state.draftComments;

  if (state.editingId) {
    const index = state.jobs.findIndex((j) => j.id === state.editingId);
    if (index >= 0) state.jobs[index] = { ...state.jobs[index], ...payload, id: state.editingId };
  } else {
    state.jobs.push({ ...payload, id: crypto.randomUUID() });
  }

  saveJobs();
  closeModal();
  render();
});

render();

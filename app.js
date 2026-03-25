const STORAGE_KEY = "tilson_jobs_crm_v2";

const seedJobs = [
  { id: crypto.randomUUID(), jobID: "9762", dept: "R&M", location: "81 Brandsby Road", dateRequested: "2026-03-25", period: "AM", status: "In progress", scaffoldStatus: "Waiting to be Erected", addedBy: "Jessica Foster", addedDate: "2026-02-13 11:56:30", notes: "" },
  { id: crypto.randomUUID(), jobID: "10108", dept: "R&M", location: "21 Cormorant Close", dateRequested: "2026-04-08", period: "AM", status: "In progress", scaffoldStatus: "Waiting to be Dismantled", addedBy: "Jessica Foster", addedDate: "2026-04-01 12:07:37", notes: "" },
  { id: crypto.randomUUID(), jobID: "10949", dept: "R&M", location: "40 Sullivan Street", dateRequested: "2026-12-10", period: "PM", status: "In progress", scaffoldStatus: "Waiting to be Dismantled", addedBy: "Amy Diffin", addedDate: "2026-12-05 09:59:55", notes: "" }
];

const state = {
  jobs: loadJobs(),
  monthCursor: new Date(),
  editingId: null,
};

const tableBody = document.getElementById("jobsTableBody");
const dashboard = document.getElementById("dashboard");
const resultCount = document.getElementById("resultCount");
const monthLabel = document.getElementById("monthLabel");
const calendar = document.getElementById("calendar");
const dialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");

function loadJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedJobs;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedJobs;
  } catch {
    return seedJobs;
  }
}

function saveJobs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.jobs));
}

function draw() {
  renderDashboard();
  renderTable(state.jobs);
  renderCalendar();
}

function renderDashboard() {
  const statuses = {
    Total: state.jobs.length,
    "In progress": state.jobs.filter((j) => j.status === "In progress").length,
    Accepted: state.jobs.filter((j) => j.status === "Accepted").length,
    Completed: state.jobs.filter((j) => j.status === "Completed").length,
  };

  dashboard.innerHTML = Object.entries(statuses)
    .map(([label, value]) => `
      <div class="col-md-3">
        <div class="dashboard-card">
          <div class="count">${value}</div>
          <div>${label}</div>
        </div>
      </div>`)
    .join("");
}

function statusClass(status) {
  if (status === "Accepted") return "label-success";
  if (status === "In progress") return "label-info";
  if (status === "Completed") return "label-primary";
  if (status === "Cancelled") return "label-important";
  return "label-default";
}

function renderTable(rows) {
  resultCount.textContent = rows.length;
  tableBody.innerHTML = rows
    .slice()
    .sort((a, b) => a.jobID.localeCompare(b.jobID, undefined, { numeric: true }))
    .map(
      (j) => `<tr>
      <td>${j.jobID}</td>
      <td>${j.dept}</td>
      <td>${j.location}</td>
      <td>${formatDate(j.dateRequested)}</td>
      <td>${j.period}</td>
      <td><div class="label ${statusClass(j.status)}">${j.status}</div></td>
      <td><div class="label label-primary">${j.scaffoldStatus}</div></td>
      <td>${j.addedBy || ""}</td>
      <td>${j.addedDate}</td>
      <td style="width:200px;"><button data-id="${j.id}" class="btn btn-xs btn-warning edit-btn"><i class="fa fa-edit"></i> View &amp; Update</button></td>
    </tr>`
    )
    .join("");

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => openEditor(btn.dataset.id));
  });
}

function renderCalendar() {
  const first = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const month = first.getMonth();
  monthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const parts = [];
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d) => parts.push(`<div class="cell-head">${d}</div>`));
  for (let i = 0; i < first.getDay(); i += 1) parts.push('<div class="cell-day off"></div>');

  let day = 1;
  while (true) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    if (date.getMonth() !== month) break;
    const iso = date.toISOString().slice(0, 10);
    const jobs = state.jobs.filter((j) => j.dateRequested === iso);
    parts.push(`<div class="cell-day"><div class="day-num">${day}</div>${jobs.map((j) => `<div class="cal-job">#${j.jobID} ${j.dept}</div>`).join("")}</div>`);
    day += 1;
  }

  calendar.innerHTML = parts.join("");
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function openEditor(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  state.editingId = id;
  Object.entries(job).forEach(([key, value]) => {
    if (editForm.elements[key]) editForm.elements[key].value = value;
  });
  dialog.showModal();
}

function openNew() {
  state.editingId = null;
  editForm.reset();
  dialog.showModal();
}

document.getElementById("newJobBtn").addEventListener("click", openNew);
document.getElementById("cancelBtn").addEventListener("click", () => dialog.close());
document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!state.editingId) return;
  state.jobs = state.jobs.filter((j) => j.id !== state.editingId);
  saveJobs();
  dialog.close();
  draw();
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(editForm).entries());
  if (state.editingId) {
    const idx = state.jobs.findIndex((j) => j.id === state.editingId);
    state.jobs[idx] = { ...state.jobs[idx], ...payload };
  } else {
    state.jobs.push({ id: crypto.randomUUID(), addedDate: new Date().toISOString().slice(0, 19).replace("T", " "), ...payload });
  }
  saveJobs();
  dialog.close();
  draw();
});

document.getElementById("applyFilterBtn").addEventListener("click", () => {
  const byId = document.getElementById("jobID").value.trim().toLowerCase();
  const byDept = document.getElementById("jobDept").value.trim().toLowerCase();
  const byAddress = document.getElementById("jobAddress").value.trim().toLowerCase();
  const byStatus = document.getElementById("statusID").value.trim().toLowerCase();
  const byDate = document.getElementById("dates").value.trim();

  const filtered = state.jobs.filter((j) =>
    (!byId || j.jobID.toLowerCase().includes(byId)) &&
    (!byDept || j.dept.toLowerCase().includes(byDept)) &&
    (!byAddress || j.location.toLowerCase().includes(byAddress)) &&
    (!byStatus || j.status.toLowerCase() === byStatus) &&
    (!byDate || j.dateRequested === byDate)
  );

  renderTable(filtered);
});

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() + 1);
  renderCalendar();
});

draw();

const STORAGE_KEY = "scaffoldflow_bookings_v1";

const seed = [
  {
    id: crypto.randomUUID(),
    jobNumber: "SC-1042",
    clientName: "Northside Builders",
    siteAddress: "21 Market St",
    contactPhone: "555-1299",
    startDate: "2026-03-27",
    endDate: "2026-04-03",
    teamSize: 4,
    status: "Scheduled",
    notes: "Pedestrian tunnel required"
  },
  {
    id: crypto.randomUUID(),
    jobNumber: "SC-1043",
    clientName: "Harper Roofing",
    siteAddress: "88 Green Ave",
    contactPhone: "555-4444",
    startDate: "2026-03-29",
    endDate: "2026-04-01",
    teamSize: 3,
    status: "Open",
    notes: "Need edge protection"
  }
];

const state = {
  bookings: loadBookings(),
  currentEditId: null,
  monthCursor: new Date()
};

const bookingRows = document.getElementById("bookingRows");
const stats = document.getElementById("stats");
const bookingDialog = document.getElementById("bookingDialog");
const bookingForm = document.getElementById("bookingForm");
const dialogTitle = document.getElementById("dialogTitle");
const deleteBtn = document.getElementById("deleteBtn");
const monthLabel = document.getElementById("monthLabel");
const calendar = document.getElementById("calendar");

document.getElementById("newBookingBtn").addEventListener("click", openNew);
document.getElementById("cancelBtn").addEventListener("click", () => bookingDialog.close());
document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() + 1);
  renderCalendar();
});

bookingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(bookingForm).entries());
  payload.teamSize = Number(payload.teamSize || 0);

  if (state.currentEditId) {
    const idx = state.bookings.findIndex((b) => b.id === state.currentEditId);
    state.bookings[idx] = { ...state.bookings[idx], ...payload };
  } else {
    state.bookings.push({ id: crypto.randomUUID(), ...payload });
  }

  persist();
  bookingDialog.close();
  draw();
});

deleteBtn.addEventListener("click", () => {
  if (!state.currentEditId) return;
  state.bookings = state.bookings.filter((b) => b.id !== state.currentEditId);
  persist();
  bookingDialog.close();
  draw();
});

function loadBookings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seed;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
}

function draw() {
  renderStats();
  renderTable();
  renderCalendar();
}

function renderStats() {
  const total = state.bookings.length;
  const open = state.bookings.filter((b) => b.status === "Open").length;
  const active = state.bookings.filter((b) => ["Scheduled", "In Progress"].includes(b.status)).length;
  const closed = state.bookings.filter((b) => b.status === "Closed").length;

  stats.innerHTML = [
    [total, "Total Jobs"],
    [open, "Open"],
    [active, "Scheduled/In Progress"],
    [closed, "Closed"]
  ]
    .map(([value, label]) => `<article class="stat"><strong>${value}</strong><span>${label}</span></article>`)
    .join("");
}

function renderTable() {
  bookingRows.innerHTML = state.bookings
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map(
      (b) => `
      <tr>
        <td>${b.jobNumber}</td>
        <td>${b.clientName}</td>
        <td>${b.siteAddress}</td>
        <td>${fmtDate(b.startDate)}</td>
        <td>${fmtDate(b.endDate)}</td>
        <td><span class="badge">${b.status}</span></td>
        <td><button data-id="${b.id}" class="editBtn">Open</button></td>
      </tr>
    `
    )
    .join("");

  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
}

function renderCalendar() {
  const first = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const month = first.getMonth();
  monthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
    cells.push(`<div class="dayHead">${d}</div>`);
  });

  for (let i = 0; i < first.getDay(); i += 1) {
    cells.push('<div class="day empty"></div>');
  }

  let day = 1;
  while (true) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    if (date.getMonth() !== month) break;

    const iso = date.toISOString().slice(0, 10);
    const events = state.bookings.filter((b) => iso >= b.startDate && iso <= b.endDate);

    cells.push(`
      <div class="day">
        <div class="dateNum">${day}</div>
        ${events.map((e) => `<div class="event" title="${e.jobNumber}: ${e.clientName}">${e.jobNumber}</div>`).join("")}
      </div>
    `);
    day += 1;
  }

  calendar.innerHTML = cells.join("");
}

function openNew() {
  state.currentEditId = null;
  dialogTitle.textContent = "Create Booking";
  bookingForm.reset();
  deleteBtn.style.display = "none";
  bookingDialog.showModal();
}

function openEdit(id) {
  const booking = state.bookings.find((b) => b.id === id);
  if (!booking) return;

  state.currentEditId = id;
  dialogTitle.textContent = `Edit ${booking.jobNumber}`;
  deleteBtn.style.display = "inline-block";

  for (const [key, value] of Object.entries(booking)) {
    if (bookingForm.elements[key]) bookingForm.elements[key].value = value;
  }

  bookingDialog.showModal();
}

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString();
}

draw();

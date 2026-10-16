// Gym Attendance Manager - class-based member records, DOM events, and localStorage.
const STORAGE_KEY = "fittrack_gym_members_v1";

class GymMember {
  constructor(id, name, status = "Outside", lastAction = "Not checked in yet") {
    this.id = id.trim().toUpperCase();
    this.name = name.trim();
    this.status = status;
    this.lastAction = lastAction;
  }

  checkIn() {
    if (this.status === "Inside") {
      return { success: false, message: `${this.name} is already marked Inside.` };
    }
    this.status = "Inside";
    this.lastAction = `Checked in · ${this.timeNow()}`;
    return { success: true, message: `${this.name} checked in successfully.` };
  }

  checkOut() {
    if (this.status === "Outside") {
      return { success: false, message: `${this.name} is already marked Outside.` };
    }
    this.status = "Outside";
    this.lastAction = `Checked out · ${this.timeNow()}`;
    return { success: true, message: `${this.name} checked out successfully.` };
  }

  timeNow() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

const sampleMembers = [
  new GymMember("M-001", "Bea Lim", "Inside", "Checked in · 08:15 AM"),
  new GymMember("M-002", "Ken Yu", "Outside", "Checked out · 07:42 AM")
];

let members = loadMembers();
let toastTimer;

const form = document.querySelector("#memberForm");
const idInput = document.querySelector("#memberId");
const nameInput = document.querySelector("#memberName");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const tableBody = document.querySelector("#memberTableBody");
const emptyState = document.querySelector("#emptyState");
const toast = document.querySelector("#toast");

function loadMembers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const records = JSON.parse(saved);
      if (Array.isArray(records)) {
        return records.map(record =>
          new GymMember(record.id, record.name, record.status, record.lastAction)
        );
      }
    }
  } catch (error) {
    console.warn("Saved gym attendance could not be loaded:", error);
  }
  return sampleMembers.map(member =>
    new GymMember(member.id, member.name, member.status, member.lastAction)
  );
}

function saveMembers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch (error) {
    showToast("Could not save records in this browser.", true);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;
  const visibleMembers = members.filter(member => {
    const matchesQuery = member.id.toLowerCase().includes(query) ||
      member.name.toLowerCase().includes(query);
    const matchesStatus = filter === "All" || member.status === filter;
    return matchesQuery && matchesStatus;
  });

  document.querySelector("#totalMembers").textContent = members.length;
  document.querySelector("#insideCount").textContent =
    members.filter(member => member.status === "Inside").length;
  document.querySelector("#outsideCount").textContent =
    members.filter(member => member.status === "Outside").length;
  document.querySelector("#memberTotalLabel").textContent =
    `${members.length} ${members.length === 1 ? "member" : "members"}`;
  document.querySelector("#resultsLabel").textContent =
    `Showing ${visibleMembers.length} of ${members.length} members`;

  tableBody.innerHTML = visibleMembers.map(member => {
    const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0].toUpperCase()).join("");
    const isInside = member.status === "Inside";
    return `
      <tr>
        <td><div class="member-cell">
          <div class="member-avatar">${escapeHTML(initials)}</div>
          <div><div class="member-name">${escapeHTML(member.name)}</div>
          <div class="member-sub">Gym member</div></div>
        </div></td>
        <td><span class="id-code">${escapeHTML(member.id)}</span></td>
        <td><span class="status ${isInside ? "inside" : "outside"}">${escapeHTML(member.status)}</span></td>
        <td><span class="last-action">${escapeHTML(member.lastAction)}</span></td>
        <td><div class="actions">
          <button class="action-button check-in" data-action="checkin" data-id="${escapeHTML(member.id)}" ${isInside ? "disabled" : ""}>Check In</button>
          <button class="action-button check-out" data-action="checkout" data-id="${escapeHTML(member.id)}" ${!isInside ? "disabled" : ""}>Check Out</button>
          <button class="action-button remove" data-action="remove" data-id="${escapeHTML(member.id)}" title="Remove member" aria-label="Remove ${escapeHTML(member.name)}">✕</button>
        </div></td>
      </tr>`;
  }).join("");

  emptyState.hidden = visibleMembers.length !== 0;
  tableBody.hidden = visibleMembers.length === 0;
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const id = idInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();

  if (!id || !name) {
    showToast("Please enter both a member ID and full name.", true);
    (!id ? idInput : nameInput).focus();
    return;
  }
  if (!/^[A-Z0-9-]+$/.test(id)) {
    showToast("Member ID can contain only letters, numbers, and hyphens.", true);
    idInput.focus();
    return;
  }
  if (members.some(member => member.id.toLowerCase() === id.toLowerCase())) {
    showToast("That member ID already exists. Use a unique ID.", true);
    idInput.focus();
    return;
  }

  members.unshift(new GymMember(id, name));
  saveMembers();
  render();
  form.reset();
  idInput.focus();
  showToast(`${name} was added to the member list.`);
});

tableBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;

  const member = members.find(item => item.id === button.dataset.id);
  if (!member) return;

  let result;
  if (button.dataset.action === "checkin") {
    result = member.checkIn();
  } else if (button.dataset.action === "checkout") {
    result = member.checkOut();
  } else if (button.dataset.action === "remove") {
    const confirmed = window.confirm(`Remove ${member.name} (${member.id}) from the member list?`);
    if (!confirmed) return;
    members = members.filter(item => item.id !== member.id);
    saveMembers();
    render();
    showToast(`${member.name} was removed.`);
    return;
  }

  if (result) {
    if (result.success) {
      saveMembers();
      render();
      showToast(result.message);
    } else {
      showToast(result.message, true);
    }
  }
});

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

document.querySelector("#resetDemo").addEventListener("click", () => {
  const confirmed = window.confirm("Reset the list to the original sample members? This replaces the current saved list.");
  if (!confirmed) return;
  members = sampleMembers.map(member =>
    new GymMember(member.id, member.name, member.status, member.lastAction)
  );
  saveMembers();
  searchInput.value = "";
  statusFilter.value = "All";
  render();
  showToast("Sample data has been restored.");
});

document.querySelector("#todayLabel").textContent =
  new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

render();

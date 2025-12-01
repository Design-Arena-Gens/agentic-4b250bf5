const entryForm = document.getElementById("entryForm");
const plateNumberInput = document.getElementById("plateNumber");
const checkNumberInput = document.getElementById("checkNumber");
const yukBilanInput = document.getElementById("yukBilan");
const yuksizInput = document.getElementById("yuksiz");
const sofVaznInput = document.getElementById("sofVazn");
const dateInput = document.getElementById("date");
const summa30Input = document.getElementById("summa30");
const summa40Input = document.getElementById("summa40");
const priceInput = document.getElementById("price");

const addBtn = document.getElementById("addEntryBtn");
const editBtn = document.getElementById("editEntryBtn");
const deleteBtn = document.getElementById("deleteEntryBtn");
const printBtn = document.getElementById("printBtn");
const reloadBtn = document.getElementById("reloadBtn");
const relayBtn = document.getElementById("relayBtn");
const searchInput = document.getElementById("searchInput");
const tableBody = document.querySelector("#entriesTable tbody");
const alarmAudio = document.getElementById("alarmAudio");
const alarmSection = document.querySelector(".alarm");

const entries = [];
let selectedIndex = null;
let editingIndex = null;
let currentSearch = "";
let alarmActive = true;
let alarmInitialized = false;

dateInput.value = new Date().toISOString().split("T")[0];

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatNumber = (value) => {
  if (value === "" || value === null || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const computeSofVazn = () => {
  const yukBilan = parseFloat(yukBilanInput.value) || 0;
  const yuksiz = parseFloat(yuksizInput.value) || 0;
  const sof = Math.max(yukBilan - yuksiz, 0);
  sofVaznInput.value = sof ? sof.toFixed(2) : "";
};

yukBilanInput.addEventListener("input", computeSofVazn);
yuksizInput.addEventListener("input", computeSofVazn);

const clearForm = () => {
  entryForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  sofVaznInput.value = "";
  editingIndex = null;
  addBtn.textContent = "Add";
};

const getFormData = () => {
  return {
    plateNumber: plateNumberInput.value.trim(),
    checkNumber: checkNumberInput.value.trim(),
    yukBilan: parseFloat(yukBilanInput.value) || 0,
    date: dateInput.value,
    yuksiz: parseFloat(yuksizInput.value) || 0,
    sofVazn: parseFloat(sofVaznInput.value) || 0,
    price:
      priceInput.value.trim() !== ""
        ? parseFloat(priceInput.value)
        : parseFloat(summa40Input.value) || parseFloat(summa30Input.value) || 0,
  };
};

const validateForm = () => {
  if (!plateNumberInput.value.trim()) return false;
  if (!yukBilanInput.value.trim()) return false;
  if (!yuksizInput.value.trim()) return false;
  if (!dateInput.value) return false;
  return true;
};

const matchesSearch = (entry, query) => {
  if (!query) return true;
  const target = query.toLowerCase();
  return Object.values(entry).some((value) =>
    String(value).toLowerCase().includes(target),
  );
};

const highlightMatches = (text, query) => {
  if (!query) return text;
  const safe = escapeRegExp(query);
  return String(text).replace(
    new RegExp(`(${safe})`, "gi"),
    '<span class="highlight">$1</span>',
  );
};

const renderTable = () => {
  tableBody.innerHTML = "";
  const filtered = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => matchesSearch(entry, currentSearch));

  filtered.forEach(({ entry, index }) => {
    const row = document.createElement("tr");
    if (index === selectedIndex) {
      row.classList.add("selected-row");
    }
    row.dataset.index = String(index);
    row.innerHTML = `
      <td>${highlightMatches(entry.plateNumber, currentSearch)}</td>
      <td>${highlightMatches(entry.checkNumber || "-", currentSearch)}</td>
      <td>${highlightMatches(formatNumber(entry.yukBilan), currentSearch)}</td>
      <td>${highlightMatches(entry.date, currentSearch)}</td>
      <td>${highlightMatches(formatNumber(entry.yuksiz), currentSearch)}</td>
      <td>${highlightMatches(formatNumber(entry.sofVazn), currentSearch)}</td>
      <td>${highlightMatches(formatNumber(entry.price), currentSearch)}</td>
    `;
    tableBody.appendChild(row);
  });
};

tableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  selectedIndex = Number(row.dataset.index);
  Array.from(tableBody.querySelectorAll("tr")).forEach((tr) =>
    tr.classList.remove("selected-row"),
  );
  row.classList.add("selected-row");
});

const ensureAlarmRunning = async () => {
  if (!alarmActive || alarmInitialized) return;
  try {
    await alarmAudio.play();
    alarmInitialized = true;
  } catch (error) {
    // browsers may block autoplay; ignore
  }
};

addBtn.addEventListener("click", async () => {
  if (!validateForm()) {
    entryForm.reportValidity();
    return;
  }
  const payload = getFormData();
  if (!payload.sofVazn) {
    payload.sofVazn = Math.max(payload.yukBilan - payload.yuksiz, 0);
  }

  if (editingIndex !== null && editingIndex >= 0) {
    entries[editingIndex] = payload;
  } else {
    entries.unshift(payload);
  }
  await ensureAlarmRunning();
  clearForm();
  selectedIndex = null;
  renderTable();
});

editBtn.addEventListener("click", () => {
  if (selectedIndex === null || !entries[selectedIndex]) return;
  const current = entries[selectedIndex];
  plateNumberInput.value = current.plateNumber;
  checkNumberInput.value = current.checkNumber;
  yukBilanInput.value = current.yukBilan;
  yuksizInput.value = current.yuksiz;
  sofVaznInput.value = current.sofVazn || "";
  dateInput.value = current.date;
  priceInput.value = current.price || "";
  editingIndex = selectedIndex;
  addBtn.textContent = "Save";
  computeSofVazn();
  plateNumberInput.focus();
});

deleteBtn.addEventListener("click", () => {
  if (selectedIndex === null) return;
  entries.splice(selectedIndex, 1);
  selectedIndex = null;
  renderTable();
});

const updateAlarmVisual = () => {
  if (alarmActive) {
    alarmSection.classList.remove("off");
    relayBtn.textContent = "Relay";
  } else {
    alarmSection.classList.add("off");
    relayBtn.textContent = "Relay (Off)";
  }
};

relayBtn.addEventListener("click", async () => {
  alarmActive = !alarmActive;
  if (alarmActive) {
    await ensureAlarmRunning();
  } else {
    alarmAudio.pause();
    alarmInitialized = false;
  }
  updateAlarmVisual();
});

printBtn.addEventListener("click", () => window.print());
reloadBtn.addEventListener("click", () => window.location.reload());

searchInput.addEventListener("input", () => {
  currentSearch = searchInput.value;
  renderTable();
});

updateAlarmVisual();
renderTable();

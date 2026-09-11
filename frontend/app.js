const API_URL = "https://odeh-myles.onrender.com";

// --- Tab switching ---------------------------------------------------

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// --- API helpers ----------------------------------------------------

async function fetchTeams() {
  const res = await fetch(`${API_URL}/teams`);
  return res.json();
}

async function fetchPrediction(homeTeam, awayTeam) {
  const params = new URLSearchParams({ home_team: homeTeam, away_team: awayTeam });
  const res = await fetch(`${API_URL}/predict?${params}`);
  return res.json();
}

async function fetchUpcoming(competition, dateFrom, dateTo) {
  const params = new URLSearchParams({ competition, date_from: dateFrom, date_to: dateTo });
  const res = await fetch(`${API_URL}/upcoming?${params}`);
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// --- Predict tab ------------------------------------------------------

const homeSelect = document.getElementById("home-select");
const awaySelect = document.getElementById("away-select");
const predictForm = document.getElementById("predict-form");
const predictResult = document.getElementById("predict-result");

function renderProbBar(label, value) {
  const pct = (value * 100).toFixed(1);
  return `
    <div class="prob-row">
      <div class="prob-label">${label}</div>
      <div class="prob-bar-track"><div class="prob-bar-fill" style="width: ${pct}%"></div></div>
      <div class="prob-value">${pct}%</div>
    </div>
  `;
}

predictForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const homeTeam = homeSelect.value;
  const awayTeam = awaySelect.value;
  if (!homeTeam || !awayTeam) return;

  const result = await fetchPrediction(homeTeam, awayTeam);

  predictResult.innerHTML = `
    <h3>${result.home_team} (${result.home_rating}) vs ${result.away_team} (${result.away_rating})</h3>
    ${renderProbBar(result.home_team + " win", result.home_win)}
    ${renderProbBar("Draw", result.draw)}
    ${renderProbBar(result.away_team + " win", result.away_win)}
  `;
  predictResult.hidden = false;
});

// --- Ratings tab ------------------------------------------------------

async function renderRatingsTable() {
  const teams = await fetchTeams();
  const tbody = document.getElementById("ratings-body");
  tbody.innerHTML = "";

  teams.forEach((t, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${i + 1}</td><td>${t.team}</td><td>${t.rating.toFixed(1)}</td>`;
    tbody.appendChild(row);
  });
}

// --- Populate team dropdowns (shared with Predict tab) -------------

async function populateTeamDropdowns() {
  const teams = await fetchTeams();
  const optionsHtml = teams.map((t) => `<option value="${t.team}">${t.team} (${t.rating.toFixed(0)})</option>`).join("");
  homeSelect.innerHTML = optionsHtml;
  awaySelect.innerHTML = optionsHtml;
}

// --- Upcoming tab -----------------------------------------------------

const upcomingForm = document.getElementById("upcoming-form");
const upcomingStatus = document.getElementById("upcoming-status");
const upcomingResults = document.getElementById("upcoming-results");

upcomingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const competition = document.getElementById("competition-select").value;
  const dateFrom = document.getElementById("date-from").value;
  const dateTo = document.getElementById("date-to").value;

  upcomingStatus.textContent = "Loading...";
  upcomingResults.innerHTML = "";

  const { ok, status, data } = await fetchUpcoming(competition, dateFrom, dateTo);

  if (!ok) {
    upcomingStatus.textContent = `Error (${status}): ${data.detail || "something went wrong"}`;
    return;
  }

  if (data.length === 0) {
    upcomingStatus.textContent = "No upcoming matches found for that range.";
    return;
  }

  upcomingStatus.textContent = `${data.length} upcoming match(es):`;

  upcomingResults.innerHTML = data.map((m) => `
    <div class="fixture-card">
      <div class="teams">${m.home_team} vs ${m.away_team}</div>
      <div class="probs">
        ${m.home_team}: ${(m.home_win * 100).toFixed(1)}% &nbsp;|&nbsp;
        Draw: ${(m.draw * 100).toFixed(1)}% &nbsp;|&nbsp;
        ${m.away_team}: ${(m.away_win * 100).toFixed(1)}%
      </div>
    </div>
  `).join("");
});

// --- Init ---------------------------------------------------------------

populateTeamDropdowns();
renderRatingsTable();

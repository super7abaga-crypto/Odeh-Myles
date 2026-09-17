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

    // Leaving the Upcoming tab pauses auto-refresh — no point polling an
    // endpoint the user can't see the results of.
    if (tab.dataset.tab !== "upcoming") stopAutoRefresh();
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

async function fetchHistory(team) {
  const res = await fetch(`${API_URL}/history/${encodeURIComponent(team)}`);
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function fetchHeadToHead(teamA, teamB) {
  const params = new URLSearchParams({ team_a: teamA, team_b: teamB });
  const res = await fetch(`${API_URL}/head-to-head?${params}`);
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

// --- Populate team dropdowns (shared across tabs) --------------------

async function populateTeamDropdowns() {
  const teams = await fetchTeams();
  const optionsHtml = teams.map((t) => `<option value="${t.team}">${t.team} (${t.rating.toFixed(0)})</option>`).join("");

  homeSelect.innerHTML = optionsHtml;
  awaySelect.innerHTML = optionsHtml;
  document.getElementById("history-team-select").innerHTML = optionsHtml;
  document.getElementById("h2h-team-a").innerHTML = optionsHtml;
  document.getElementById("h2h-team-b").innerHTML = optionsHtml;
}

// --- Upcoming tab -----------------------------------------------------

const upcomingForm = document.getElementById("upcoming-form");
const upcomingStatus = document.getElementById("upcoming-status");
const upcomingResults = document.getElementById("upcoming-results");
const autoRefreshCheckbox = document.getElementById("upcoming-autorefresh");

let autoRefreshTimer = null;
let lastUpcomingQuery = null;

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  autoRefreshCheckbox.checked = false;
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshCheckbox.checked = true;
  autoRefreshTimer = setInterval(() => {
    if (lastUpcomingQuery) runUpcomingSearch(lastUpcomingQuery, { silent: true });
  }, 60000);
}

async function runUpcomingSearch({ competition, dateFrom, dateTo }, { silent = false } = {}) {
  if (!silent) {
    upcomingStatus.textContent = "Loading...";
    upcomingResults.innerHTML = "";
  }

  const { ok, status, data } = await fetchUpcoming(competition, dateFrom, dateTo);

  if (!ok) {
    upcomingStatus.textContent = `Error (${status}): ${data.detail || "something went wrong"}`;
    return;
  }

  if (data.length === 0) {
    upcomingStatus.textContent = "No upcoming matches found for that range.";
    upcomingResults.innerHTML = "";
    return;
  }

  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  upcomingStatus.textContent = `${data.length} upcoming match(es) — last checked ${stamp}`;

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
}

upcomingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  lastUpcomingQuery = {
    competition: document.getElementById("competition-select").value,
    dateFrom: document.getElementById("date-from").value,
    dateTo: document.getElementById("date-to").value,
  };
  runUpcomingSearch(lastUpcomingQuery);
});

autoRefreshCheckbox.addEventListener("change", () => {
  if (autoRefreshCheckbox.checked) {
    if (!lastUpcomingQuery) {
      upcomingStatus.textContent = "Find fixtures first, then turn on auto-refresh.";
      autoRefreshCheckbox.checked = false;
      return;
    }
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

// --- History tab --------------------------------------------------------

const historyForm = document.getElementById("history-form");
const historyStatus = document.getElementById("history-status");
const historyChart = document.getElementById("history-chart");

function renderLineChart(container, points) {
  const width = 640;
  const height = 220;
  const padding = 32;

  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings) - 15;
  const max = Math.max(...ratings) + 15;
  const span = max - min || 1;

  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const toY = (rating) => height - padding - ((rating - min) / span) * (height - padding * 2);

  const coords = points.map((p, i) => [padding + i * xStep, toY(p.rating)]);
  const pathD = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const dots = coords.map(([x, y], i) => `
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" class="chart-dot">
      <title>${points[i].date}: ${points[i].rating.toFixed(1)}</title>
    </circle>
  `).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="rating-chart" preserveAspectRatio="xMidYMid meet">
      <path d="${pathD}" class="chart-line" />
      ${dots}
    </svg>
    <div class="chart-range">
      <span>${points[0].date}</span>
      <span>${points[points.length - 1].date}</span>
    </div>
  `;
}

historyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const team = document.getElementById("history-team-select").value;
  if (!team) return;

  historyStatus.textContent = "Loading...";
  historyChart.innerHTML = "";

  const { ok, status, data } = await fetchHistory(team);

  if (!ok) {
    historyStatus.textContent = `Error (${status}): couldn't load history.`;
    return;
  }

  if (data.length === 0) {
    historyStatus.textContent = `No logged match history for ${team} yet — it'll build up as results get synced.`;
    return;
  }

  historyStatus.textContent = `${data.length} logged result(s) for ${team}`;
  renderLineChart(historyChart, data);
});

// --- Head-to-head tab -----------------------------------------------------

const h2hForm = document.getElementById("h2h-form");
const h2hStatus = document.getElementById("h2h-status");
const h2hPrediction = document.getElementById("h2h-prediction");
const h2hMeetings = document.getElementById("h2h-meetings");

h2hForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const teamA = document.getElementById("h2h-team-a").value;
  const teamB = document.getElementById("h2h-team-b").value;
  if (!teamA || !teamB) return;

  if (teamA === teamB) {
    h2hStatus.textContent = "Pick two different teams.";
    h2hPrediction.hidden = true;
    h2hMeetings.innerHTML = "";
    return;
  }

  h2hStatus.textContent = "Loading...";
  h2hPrediction.hidden = true;
  h2hMeetings.innerHTML = "";

  const { ok, status, data } = await fetchHeadToHead(teamA, teamB);

  if (!ok) {
    h2hStatus.textContent = `Error (${status}): couldn't load head-to-head.`;
    return;
  }

  const pred = data.current_prediction;
  h2hPrediction.innerHTML = `
    <h3>${pred.home_team} (${pred.home_rating}) vs ${pred.away_team} (${pred.away_rating})</h3>
    ${renderProbBar(pred.home_team + " win", pred.home_win)}
    ${renderProbBar("Draw", pred.draw)}
    ${renderProbBar(pred.away_team + " win", pred.away_win)}
  `;
  h2hPrediction.hidden = false;

  if (data.meetings.length === 0) {
    h2hStatus.textContent = `No logged past meetings between ${teamA} and ${teamB} yet.`;
    return;
  }

  h2hStatus.textContent = `${data.meetings.length} past meeting(s):`;
  h2hMeetings.innerHTML = data.meetings.map((m) => {
    const winner = m.result === "home_win" ? m.home_team : m.result === "away_win" ? m.away_team : "Draw";
    return `
      <div class="fixture-card">
        <div class="teams">${m.home_team} vs ${m.away_team}</div>
        <div class="probs">${m.date} &nbsp;|&nbsp; ${m.competition} &nbsp;|&nbsp; Result: ${winner}</div>
      </div>
    `;
  }).join("");
});

// --- Init ---------------------------------------------------------------

populateTeamDropdowns();
renderRatingsTable();
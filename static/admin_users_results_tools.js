(function () {
  const API = "/api/";
  let lastLeaderboardData = null;
  let lastVotersData = null;

  function safe(x) {
    return String(x || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getKey() {
    const input = document.getElementById("adminKey");
    return (input && input.value.trim()) || localStorage.getItem("ADMIN_API_KEY") || "";
  }

  async function api(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers["X-Admin-Key"] = getKey();

    const sep = url.includes("?") ? "&" : "?";
    const fullUrl = url + sep + "admin_key=" + encodeURIComponent(getKey());

    const res = await fetch(fullUrl, options);
    const text = await res.text();

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      throw new Error((data && (data.detail || data.message)) || text || "Request failed");
    }

    return data;
  }

  function addStyles() {
    if (document.getElementById("adminUsersResultsStyle")) return;

    const style = document.createElement("style");
    style.id = "adminUsersResultsStyle";
    style.innerHTML = `
      .admin-live-toolbar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 14px 0 20px;
      }

      .admin-live-btn {
        border: 0;
        border-radius: 14px;
        padding: 12px 15px;
        font-weight: 950;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #ef233c, #ff7a18);
      }

      .admin-live-btn.green {
        background: linear-gradient(135deg, #16a34a, #22c55e);
      }

      .admin-live-btn.blue {
        background: linear-gradient(135deg, #2563eb, #06b6d4);
      }

      .admin-live-btn.dark {
        background: #111827;
      }

      .admin-live-btn.danger {
        background: linear-gradient(135deg, #dc2626, #991b1b);
      }

      .leader-section {
        margin: 18px 0;
        padding: 16px;
        border-radius: 22px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.12);
      }

      .leader-section h3 {
        margin: 0 0 14px;
        font-weight: 950;
      }

      .leader-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 14px;
      }

      .leader-card {
        border-radius: 20px;
        overflow: hidden;
        background: rgba(0,0,0,.24);
        border: 1px solid rgba(255,255,255,.13);
      }

      .leader-img-box {
        height: 230px;
        background: #05070d;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .leader-img-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .leader-body {
        padding: 14px;
      }

      .leader-badge {
        display: inline-block;
        margin-bottom: 10px;
        padding: 7px 12px;
        border-radius: 999px;
        background: linear-gradient(135deg, #16a34a, #22c55e);
        color: white;
        font-weight: 950;
      }

      .leader-name {
        font-size: 20px;
        font-weight: 950;
        margin-bottom: 8px;
      }

      .rank-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
        overflow: hidden;
        border-radius: 14px;
      }

      .rank-table th,
      .rank-table td {
        padding: 10px;
        border-bottom: 1px solid rgba(255,255,255,.12);
        text-align: left;
      }

      .rank-table th {
        color: #ff4057;
        font-weight: 950;
      }

      .voters-table-wrap {
        overflow-x: auto;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.12);
      }

      .voters-table {
        width: 100%;
        min-width: 720px;
        border-collapse: collapse;
        background: rgba(255,255,255,.05);
      }

      .voters-table th,
      .voters-table td {
        padding: 12px;
        border-bottom: 1px solid rgba(255,255,255,.12);
        vertical-align: top;
      }

      .voters-table th {
        color: #ff4057;
        font-weight: 950;
        text-align: left;
      }

      .admin-panel-title {
        margin: 18px 0 12px;
        font-size: 24px;
        font-weight: 950;
      }

      @media print {
        body * {
          visibility: hidden !important;
        }

        #adminResults,
        #adminResults *,
        #adminVotersBox,
        #adminVotersBox * {
          visibility: visible !important;
        }

        #adminResults,
        #adminVotersBox {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          color: #000 !important;
          background: #fff !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBoxes() {
    const adminResults = document.getElementById("adminResults");
    if (!adminResults) return;

    if (!document.getElementById("adminLiveToolbar")) {
      const toolbar = document.createElement("div");
      toolbar.id = "adminLiveToolbar";
      toolbar.className = "admin-live-toolbar";
      toolbar.innerHTML = `
        <button id="adminShowLeadersBtn" class="admin-live-btn green">Show Results</button>
        <button id="adminShowVotersBtn" class="admin-live-btn blue">Show Voters</button>
        <button id="adminDownloadResultsBtn" class="admin-live-btn dark">Download Results CSV</button>
        <button id="adminPrintBtn" class="admin-live-btn dark">Print</button>
        <button id="adminClearVotesBtn2" class="admin-live-btn danger">Delete Votes/Results</button>
      `;

      adminResults.parentNode.insertBefore(toolbar, adminResults);
    }

    if (!document.getElementById("adminVotersBox")) {
      const voters = document.createElement("div");
      voters.id = "adminVotersBox";
      voters.style.display = "none";
      adminResults.parentNode.insertBefore(voters, adminResults.nextSibling);
    }

    adminResults.style.display = "none";

    const oldToolbar = document.getElementById("adminFinishToolbar");
    if (oldToolbar) oldToolbar.style.display = "none";

    const oldLoadBtn = document.getElementById("loadResults");
    if (oldLoadBtn) oldLoadBtn.style.display = "none";

    bindToolbar();
  }

  function bindToolbar() {
    const leadersBtn = document.getElementById("adminShowLeadersBtn");
    const votersBtn = document.getElementById("adminShowVotersBtn");
    const downloadBtn = document.getElementById("adminDownloadResultsBtn");
    const printBtn = document.getElementById("adminPrintBtn");
    const clearBtn = document.getElementById("adminClearVotesBtn2");

    if (leadersBtn) {
      leadersBtn.onclick = async function () {
        const box = document.getElementById("adminResults");
        const votersBox = document.getElementById("adminVotersBox");

        if (box.style.display === "none") {
          await loadLeaderboard();
          box.style.display = "block";
          votersBox.style.display = "none";
          leadersBtn.textContent = "Hide Results";
          if (votersBtn) votersBtn.textContent = "Show Voters";
        } else {
          // Ikibonyezwa tena ifiche tu
          box.style.display = "none";
          leadersBtn.textContent = "Show Results";
        }
      };
    }

    if (votersBtn) {
      votersBtn.onclick = async function () {
        const box = document.getElementById("adminVotersBox");
        const resultsBox = document.getElementById("adminResults");

        if (box.style.display === "none") {
          await loadVoters();
          box.style.display = "block";
          resultsBox.style.display = "none";
          votersBtn.textContent = "Hide Voters";
          if (leadersBtn) leadersBtn.textContent = "Show Results";
        } else {
          box.style.display = "none";
          votersBtn.textContent = "Show Voters";
        }
      };
    }

    if (downloadBtn) {
      downloadBtn.onclick = async function () {
        if (!lastLeaderboardData) await loadLeaderboard();
        downloadResultsCSV();
      };
    }

    if (printBtn) {
      printBtn.onclick = async function () {
        const resultsBox = document.getElementById("adminResults");
        if (!lastLeaderboardData) await loadLeaderboard();
        resultsBox.style.display = "block";
        window.print();
      };
    }

    if (clearBtn) {
      clearBtn.onclick = async function () {
        if (!confirm("Una uhakika unataka kufuta votes/results zote?")) return;
        if (!confirm("Confirm tena kufuta votes na voters wote?")) return;

        try {
          await api(API + "admin/votes/clear/", { method: "DELETE" });
          lastLeaderboardData = null;
          lastVotersData = null;
          await loadLeaderboard();
          await loadVoters();
          alert("Votes/Results zimefutwa.");
        } catch (err) {
          alert(err.message);
        }
      };
    }
  }

  async function loadLeaderboard() {
    const box = document.getElementById("adminResults");
    box.innerHTML = `<div class="admin-comment">Loading results...</div>`;

    const data = await api(API + "admin/leaderboard/");
    lastLeaderboardData = data;

    box.innerHTML = `
      <div class="admin-panel-title">Results / Leading Nominees</div>
      ${(data.positions || []).map(pos => renderPosition(pos)).join("")}
    `;
  }

  function renderPosition(pos) {
    const leaders = pos.leaders || [];
    const candidates = pos.candidates || [];

    return `
      <section class="leader-section">
        <h3>${safe(pos.position)}</h3>

        <div class="leader-grid">
          ${leaders.map(c => `
            <div class="leader-card">
              <div class="leader-img-box">
                ${c.image_url ? `<img src="${safe(c.image_url)}" alt="${safe(c.name)}">` : `<span>No Image</span>`}
              </div>

              <div class="leader-body">
                <span class="leader-badge">Leading: ${safe(c.votes)} votes</span>
                <div class="leader-name">${safe(c.name)}</div>
              </div>
            </div>
          `).join("")}
        </div>

        <table class="rank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nominee</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${safe(c.name)}</td>
                <td><b>${safe(c.votes)}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  async function loadVoters() {
    const box = document.getElementById("adminVotersBox");
    box.innerHTML = `<div class="admin-comment">Loading voters...</div>`;

    const data = await api(API + "admin/voters/");
    lastVotersData = data;

    const voters = data.voters || [];

    box.innerHTML = `
      <div class="admin-panel-title">Voters / Users</div>
      <p><b>Total voters:</b> ${safe(data.total_voters || 0)}</p>

      <div class="voters-table-wrap">
        <table class="voters-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Votes Count</th>
              <th>Votes Details</th>
            </tr>
          </thead>

          <tbody>
            ${voters.map((v, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${safe(v.name)}</td>
                <td>${safe(v.phone)}</td>
                <td><b>${safe(v.votes_count)}</b></td>
                <td>
                  ${(v.votes || []).map(vote => `
                    <div>${safe(vote.position)} → <b>${safe(vote.candidate)}</b></div>
                  `).join("")}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function downloadResultsCSV() {
    if (!lastLeaderboardData) {
      alert("Load results first.");
      return;
    }

    let csv = "Category,Rank,Nominee,Votes\n";

    (lastLeaderboardData.positions || []).forEach(pos => {
      (pos.candidates || []).forEach((c, i) => {
        csv += `"${String(pos.position || "").replaceAll('"', '""')}","${i + 1}","${String(c.name || "").replaceAll('"', '""')}","${c.votes || 0}"\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "jagwa-results-leaderboard.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  function bindBottomResultsNav() {
    document.addEventListener("click", function (e) {
      const a = e.target.closest("#forceAdminResults, #adminNavResults");
      if (!a) return;

      e.preventDefault();

      const btn = document.getElementById("adminShowLeadersBtn");
      if (btn) btn.click();

      setTimeout(function () {
        const target = document.getElementById("adminLiveToolbar") || document.getElementById("adminResults");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    addStyles();
    ensureBoxes();
    bindBottomResultsNav();

    setTimeout(function () {
      ensureBoxes();
    }, 1000);
  });
})();

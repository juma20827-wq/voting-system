(function () {
  const API = "/api/";
  let lastResultsData = null;

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

    if (!(options.body instanceof FormData)) {
      options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    }

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
    if (document.getElementById("adminFinishToolsStyle")) return;

    const style = document.createElement("style");
    style.id = "adminFinishToolsStyle";
    style.innerHTML = `
      .admin-finish-toolbar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 14px 0 18px;
      }

      .admin-finish-btn {
        border: 0;
        border-radius: 14px;
        padding: 11px 14px;
        font-weight: 950;
        cursor: pointer;
        color: white;
        background: linear-gradient(135deg, #ef233c, #ff7a18);
      }

      .admin-finish-btn.green {
        background: linear-gradient(135deg, #16a34a, #22c55e);
      }

      .admin-finish-btn.blue {
        background: linear-gradient(135deg, #2563eb, #06b6d4);
      }

      .admin-finish-btn.dark {
        background: #111827;
      }

      .admin-finish-btn.danger {
        background: linear-gradient(135deg, #dc2626, #991b1b);
      }

      .admin-category-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        padding: 10px 12px;
        margin: 8px 0;
      }

      .admin-category-row span {
        font-weight: 850;
      }

      @media print {
        body * {
          visibility: hidden !important;
        }
        #adminResults, #adminResults * {
          visibility: visible !important;
        }
        #adminResults {
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

  function removeAdminVoteLinks() {
    document.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").trim().toLowerCase();

      if (
        href.includes("/login/?next=/vote") ||
        href.includes("/login/?next=/my-vote") ||
        href.includes("/my-vote/") ||
        text === "vote" ||
        text === "myvote" ||
        text === "my vote"
      ) {
        const parent = a.closest(".admin-actions");
        a.remove();

        if (parent && parent.children.length === 0) {
          parent.style.display = "none";
        }
      }
    });

    document.querySelectorAll("section, .admin-card").forEach(card => {
      const txt = (card.textContent || "").toLowerCase();
      if (txt.includes("quick action") && txt.includes("admin akibonyeza")) {
        card.style.display = "none";
      }
    });
  }

  function ensureResultsToolbar() {
    const resultBox = document.getElementById("adminResults");
    if (!resultBox) return;

    if (document.getElementById("adminFinishToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "adminFinishToolbar";
    toolbar.className = "admin-finish-toolbar";
    toolbar.innerHTML = `
      <button id="showHideResultsBtn" class="admin-finish-btn green">Show Results</button>
      <button id="downloadResultsBtn" class="admin-finish-btn blue">Download CSV</button>
      <button id="printResultsBtn" class="admin-finish-btn dark">Print Results</button>
      <button id="clearVotesBtn" class="admin-finish-btn danger">Delete Votes/Results</button>
    `;

    resultBox.parentNode.insertBefore(toolbar, resultBox);
    resultBox.style.display = "none";

    document.getElementById("showHideResultsBtn").onclick = async function () {
      if (resultBox.style.display === "none") {
        await loadResults();
        resultBox.style.display = "block";
        this.textContent = "Hide Results";
      } else {
        resultBox.style.display = "none";
        this.textContent = "Show Results";
      }
    };

    document.getElementById("downloadResultsBtn").onclick = function () {
      downloadCSV();
    };

    document.getElementById("printResultsBtn").onclick = async function () {
      if (!lastResultsData) await loadResults();
      resultBox.style.display = "block";
      window.print();
    };

    document.getElementById("clearVotesBtn").onclick = async function () {
      if (!confirm("Una uhakika unataka kufuta votes/results zote? Nominees na categories hazitafutika.")) return;
      if (!confirm("Confirm tena: Delete all votes and voters?")) return;

      try {
        const data = await api(API + "admin/votes/clear/", { method: "DELETE" });
        alert(data.detail || "Votes cleared");
        lastResultsData = null;
        await loadResults();
      } catch (err) {
        alert(err.message);
      }
    };

    const oldBtn = document.getElementById("loadResults");
    if (oldBtn) {
      oldBtn.style.display = "none";
    }
  }

  async function loadResults() {
    const resultBox = document.getElementById("adminResults");
    if (!resultBox) return;

    const data = await api(API + "results/");
    lastResultsData = data;

    if (!data.positions || !data.positions.length) {
      resultBox.innerHTML = `<div class="admin-comment">No results found.</div>`;
      return;
    }

    resultBox.innerHTML = data.positions.map(pos => `
      <div class="admin-comment">
        <h3>${safe(pos.position)}</h3>
        ${pos.candidates.map(c => `
          <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.12);padding:7px 0;">
            <span>${safe(c.name)}</span>
            <b>${safe(c.votes)} votes</b>
          </div>
        `).join("")}
      </div>
    `).join("");
  }

  function downloadCSV() {
    if (!lastResultsData) {
      alert("Bonyeza Show Results kwanza.");
      return;
    }

    let csv = "Category,Nominee,Votes\n";

    (lastResultsData.positions || []).forEach(pos => {
      (pos.candidates || []).forEach(c => {
        csv += `"${String(pos.position || "").replaceAll('"', '""')}","${String(c.name || "").replaceAll('"', '""')}","${c.votes || 0}"\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "jagwa-results.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function reloadCategoriesWithDelete() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const positions = await fetch(API + "positions/").then(r => r.json());

    categoryList.innerHTML = positions.map(p => `
      <li class="admin-category-row">
        <span>${safe(p.name)}</span>
        <button class="admin-finish-btn danger delete-category-btn" data-id="${p.id}" data-name="${safe(p.name)}">Delete</button>
      </li>
    `).join("");

    document.querySelectorAll(".delete-category-btn").forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const name = btn.dataset.name;

        if (!confirm("Delete category: " + name + "? Nominees zake pia zinaweza kufutika.")) return;
        if (!confirm("Confirm tena kufuta category hii?")) return;

        try {
          await api(API + "admin/positions/" + id + "/", { method: "DELETE" });
          alert("Category deleted.");
          await reloadCategoriesWithDelete();

          if (window.loadCandidatesWithTools) {
            await window.loadCandidatesWithTools();
          }
        } catch (err) {
          alert(err.message);
        }
      };
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    addStyles();
    removeAdminVoteLinks();
    ensureResultsToolbar();

    setTimeout(function () {
      removeAdminVoteLinks();
      ensureResultsToolbar();
      reloadCategoriesWithDelete().catch(err => console.log(err));
    }, 800);
  });
})();

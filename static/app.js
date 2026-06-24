
(function () {
  const API = "/api/";
  let positionsCache = null;
  const candidateCache = {};
  let currentCategoryIndex = Number(localStorage.getItem("currentCategoryIndex") || "0");

  function safe(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getVoter() {
    try {
      return JSON.parse(localStorage.getItem("voterProfile") || "null");
    } catch {
      return null;
    }
  }

  function setVoter(profile) {
    localStorage.setItem("voterProfile", JSON.stringify(profile));
  }

  function clearVoter() {
    localStorage.removeItem("voterProfile");
    localStorage.removeItem("voteMessage");
    window.location.href = "/login/";
  }

  async function fetchJSON(url, opts = {}) {
    const response = await fetch(url, opts);
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const msg = typeof data === "string" ? data : (data && (data.detail || data.message)) || response.statusText;
      const error = new Error(msg);
      error.data = data;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function loadPositions() {
    if (positionsCache) return positionsCache;
    positionsCache = await fetchJSON(API + "positions/");
    return positionsCache;
  }

  async function loadCandidates(positionId) {
    if (candidateCache[positionId]) return candidateCache[positionId];
    candidateCache[positionId] = await fetchJSON(API + "positions/" + positionId + "/candidates/");
    return candidateCache[positionId];
  }

  function renderAuthStatus() {
    const el = document.getElementById("authStatus");
    if (!el) return;

    const voter = getVoter();
    if (voter) {
      el.innerHTML = `
        <span class="me-2">${safe(voter.name)} | ${safe(voter.phone)}</span>
        <button class="btn btn-sm btn-outline-danger btn-logout">Logout</button>
      `;
      const btn = el.querySelector(".btn-logout");
      if (btn) btn.addEventListener("click", clearVoter);
    } else {
      el.innerHTML = `<span>Guest voter</span> <a href="/login/" class="btn btn-sm btn-primary ms-2">Login</a>`;
    }
  }

  function candidateImageHTML(candidate) {
    if (candidate && candidate.image_url) {
      return `<img src="${safe(candidate.image_url)}" alt="${safe(candidate.name)}" class="candidate-img">`;
    }
    return `<div class="candidate-img placeholder">No Image</div>`;
  }

  function resultImageHTML(item) {
    if (item && item.image_url) {
      return `<img src="${safe(item.image_url)}" alt="${safe(item.candidate)}" class="candidate-img">`;
    }
    return `<div class="candidate-img placeholder">No Image</div>`;
  }

  function descriptionHTML(description) {
    const lines = String(description || "")
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);

    if (!lines.length) return "";

    return `
      <div class="candidate-comments">
        ${lines.map(line => `<div class="candidate-comment-line">${safe(line)}</div>`).join("")}
      </div>
    `;
  }

  function showVoteMessage(message, type = "success") {
    const alertBox = document.getElementById("voteAlert");
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = message;
    alertBox.classList.remove("visually-hidden");
  }

  function renderCategoryControls(total, current) {
    return `
      <div class="category-nav card border-0 shadow-sm p-3 mb-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <strong>Category ${current + 1} of ${total}</strong>
            <div class="text-muted small">
              Unaweza kupiga kura moja au zaidi kwenye category hii, kisha uende category nyingine.
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-secondary" id="prevCategoryBtn" ${current <= 0 ? "disabled" : ""}>
              Previous Category
            </button>
            <button class="btn btn-primary" id="nextCategoryBtn" ${current >= total - 1 ? "disabled" : ""}>
              Next Category
            </button>
            <a class="btn btn-success" href="/my-vote/">
              Result
            </a>
          </div>
        </div>
      </div>
    `;
  }

  async function renderPositions() {
    const container = document.getElementById("positions");
    const profile = document.getElementById("voteProfile");
    if (!container) return;

    renderAuthStatus();

    const voter = getVoter();

    if (profile) {
      if (voter) {
        profile.innerHTML = `
          <h3>${safe(voter.name)}</h3>
          <p>${safe(voter.phone)}</p>
          <button class="btn btn-outline-danger profile-logout-btn">Logout</button>
        `;
        const logoutBtn = profile.querySelector(".profile-logout-btn");
        if (logoutBtn) logoutBtn.addEventListener("click", clearVoter);
      } else {
        profile.innerHTML = `
          <h3>Login Required</h3>
          <p>You are not signed in. Please login to continue voting.</p>
          <a href="/login/?next=/vote/" class="btn btn-primary">Login Now</a>
        `;
      }
    }

    if (!voter) {
      showVoteMessage("Please sign in before voting. Use the login page to create your voter profile.", "warning");
    } else {
      showVoteMessage("Unaweza kupiga kura moja au zaidi kwenye category moja. Ukiona inatosha, bonyeza Next Category.", "info");
    }

    container.innerHTML = `<div class="alert alert-info">Loading categories…</div>`;

    try {
      const positions = await loadPositions();

      if (!Array.isArray(positions) || positions.length === 0) {
        container.innerHTML = `<div class="alert alert-warning">No categories are available at this time.</div>`;
        return;
      }

      if (currentCategoryIndex < 0) currentCategoryIndex = 0;
      if (currentCategoryIndex > positions.length - 1) currentCategoryIndex = positions.length - 1;

      const pos = positions[currentCategoryIndex];
      const candidates = await loadCandidates(pos.id);

      container.innerHTML = `
        ${renderCategoryControls(positions.length, currentCategoryIndex)}

        <section class="position-card">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <h3 class="mb-1">${safe(pos.name)}</h3>
              <p class="text-muted mb-0">Choose one candidate. Unaweza kurudia kuchagua candidate mwingine kwenye category hii.</p>
            </div>
            <span class="badge bg-primary">${safe(pos.name)}</span>
          </div>

          <div id="pos-${pos.id}" class="candidate-list"></div>
        </section>
      `;

      const prevBtn = document.getElementById("prevCategoryBtn");
      const nextBtn = document.getElementById("nextCategoryBtn");

      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          currentCategoryIndex = Math.max(0, currentCategoryIndex - 1);
          localStorage.setItem("currentCategoryIndex", String(currentCategoryIndex));
          renderPositions();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          currentCategoryIndex = Math.min(positions.length - 1, currentCategoryIndex + 1);
          localStorage.setItem("currentCategoryIndex", String(currentCategoryIndex));
          renderPositions();
        });
      }

      const list = document.getElementById(`pos-${pos.id}`);

      if (!Array.isArray(candidates) || candidates.length === 0) {
        list.innerHTML = `<div class="alert alert-warning">No nominees found in this category.</div>`;
        return;
      }

      candidates.forEach(function (c) {
        const card = document.createElement("div");
        card.className = "candidate-card";

        card.innerHTML = `
          ${candidateImageHTML(c)}
          <h4>${safe(c.name)}</h4>
          <p class="text-muted">${safe(c.position_name || pos.name)}</p>
          ${descriptionHTML(c.description)}
          <button class="btn btn-primary vote-button" ${!voter ? "disabled" : ""}>
            ${voter ? "Vote" : "Sign in to vote"}
          </button>
        `;

        const voteBtn = card.querySelector(".vote-button");
        if (voteBtn && voter) {
          voteBtn.addEventListener("click", function () {
            submitVote(pos.id, c.id, c.name);
          });
        }

        list.appendChild(card);
      });
    } catch (error) {
      container.innerHTML = `
        <div class="alert alert-danger">
          Unable to load categories. ${safe(error.message || "")}
        </div>
      `;
    }
  }

  async function submitVote(positionId, candidateId, candidateName) {
    const voter = getVoter();

    if (!voter) {
      alert("Please login before submitting your vote.");
      window.location.href = "/login/?next=/vote/";
      return;
    }

    if (!confirm("Submit vote for " + candidateName + "?")) return;

    try {
      await fetchJSON(API + "vote/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: voter.token,
          candidate_id: candidateId
        })
      });

      showVoteMessage("Vote recorded. Unaweza kupiga kura nyingine kwenye category hii au bonyeza Next Category.", "success");
    } catch (error) {
      alert("Vote failed: " + (error.message || "Request failed"));
    }
  }

  function formatDateTime(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function renderResultsData(data) {
    const container = document.getElementById("results");
    if (!container) return;

    container.innerHTML = "";

    if (!data || !Array.isArray(data.votes) || data.votes.length === 0) {
      container.innerHTML = `
        <div class="alert alert-warning">
          You have not voted yet.
          <a href="/vote/" class="btn btn-sm btn-primary ms-2">Go to Vote</a>
        </div>
      `;
      return;
    }

    const voterName = data.voter && data.voter.name ? data.voter.name : "Voter";
    const voterPhone = data.voter && data.voter.phone ? data.voter.phone : "";

    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML = `
      <h3>Result</h3>
      <p><strong>Voter:</strong> ${safe(voterName)}</p>
      ${voterPhone ? `<p><strong>Phone:</strong> ${safe(voterPhone)}</p>` : ""}
      <p><strong>Total votes you submitted:</strong> ${data.votes.length}</p>
      <a href="/vote/" class="btn btn-primary">Back to Vote</a>
    `;
    container.appendChild(summary);

    data.votes.forEach(function (vote, index) {
      const card = document.createElement("div");
      card.className = "result-card";

      const votedAt = vote.voted_at ? formatDateTime(vote.voted_at) : "";

      card.innerHTML = `
        ${resultImageHTML(vote)}
        <div class="result-info">
          <span class="badge bg-primary mb-2">Vote #${index + 1}</span>
          <p class="text-muted mb-1">Category</p>
          <h4>${safe(vote.position)}</h4>

          <p class="text-muted mb-1">Nominee you voted for</p>
          <h3>${safe(vote.candidate)}</h3>

          ${descriptionHTML(vote.description)}

          ${votedAt ? `<p class="text-muted mt-2">Voted at: ${safe(votedAt)}</p>` : ""}
        </div>
      `;

      container.appendChild(card);
    });
  }

  async function renderResults() {
    renderAuthStatus();

    const container = document.getElementById("results");
    if (!container) return;

    const voter = getVoter();

    if (!voter || !voter.token) {
      container.innerHTML = `
        <div class="alert alert-warning">
          Please login first to view your result.
          <a href="/login/?next=/my-vote/" class="btn btn-primary ms-2">Login</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="alert alert-info">Loading result…</div>`;

    try {
      const data = await fetchJSON(API + "results/", {
        method: "GET",
        headers: { "Authorization": "Token " + voter.token }
      });

      renderResultsData(data);
    } catch (error) {
      container.innerHTML = `
        <div class="alert alert-danger">
          Unable to load result. ${safe(error.message || "")}
        </div>
      `;
    }
  }

  function initLogin() {
    const form = document.getElementById("loginForm");
    const alertBox = document.getElementById("loginAlert");
    if (!form) return;

    const nextPath = new URLSearchParams(window.location.search).get("next") || "/";

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById("loginName") || document.getElementById("name");
      const phoneInput = document.getElementById("loginPhone") || document.getElementById("phone");

      const name = nameInput ? nameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";

      if (name.length < 2) {
        if (alertBox) {
          alertBox.className = "alert alert-danger";
          alertBox.textContent = "Please enter your full name.";
          alertBox.classList.remove("visually-hidden");
        }
        return;
      }

      try {
        const data = await fetchJSON(API + "login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone })
        });

        if (data.token) {
          setVoter({ name: data.name, phone: data.phone, token: data.token });
          window.location.href = nextPath;
        } else {
          throw new Error("No token returned.");
        }
      } catch (error) {
        if (alertBox) {
          alertBox.className = "alert alert-danger";
          alertBox.textContent = error.message || "Login failed.";
          alertBox.classList.remove("visually-hidden");
        }
      }
    });
  }

  async function initHome() {
    renderAuthStatus();
  }

  function initSuccess() {
    renderAuthStatus();
  }

  window.pageInit = function (page) {
    if (page === "vote") {
      renderPositions();
    } else if (page === "results") {
      renderResults();
    } else if (page === "login") {
      initLogin();
    } else if (page === "home") {
      initHome();
    } else if (page === "success") {
      initSuccess();
    } else {
      renderAuthStatus();
    }
  };
})();

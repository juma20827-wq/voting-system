/* =====================================================
   JAGWA BEST GOALKEEPER VOTE
===================================================== */

const API_BASE = "/api/";

let positions = [];
let selectedPositionId = null;
let votedPositionIds = [];

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
        return JSON.parse(localStorage.getItem("jagwaVoter") || localStorage.getItem("voterProfile") || "null");
    } catch {
        return null;
    }
}

function showToast(message) {
    const box = document.getElementById("toastMessage");
    if (!box) return;

    box.textContent = message;
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 3500);
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const error = new Error(
            typeof data === "string"
                ? data
                : data?.detail || data?.message || data?.error || "Request failed"
        );
        error.data = data;
        throw error;
    }

    return data;
}

async function checkProgress() {
    const voter = getVoter();

    if (!voter || !voter.token) {
        window.location.href = "/login/";
        return;
    }

    try {
        const data = await fetchJSON(API_BASE + "results/", {
            headers: {
                Authorization: "Token " + voter.token
            }
        });

        votedPositionIds = (data.votes || []).map(v => Number(v.position_id || v.position));

        const status = document.getElementById("voteStatusText");
        if (status) status.textContent = "You have completed voting. View your vote anytime.";

    } catch (error) {
        if (error.data && Array.isArray(error.data.voted_position_ids)) {
            votedPositionIds = error.data.voted_position_ids.map(Number);

            const status = document.getElementById("voteStatusText");
            if (status) {
                status.textContent =
                    `${error.data.voted_positions || 0}/${error.data.total_positions || 0} completed`;
            }
        } else {
            votedPositionIds = [];
        }
    }
}

async function loadPositions() {
    const box = document.getElementById("positionList");
    box.innerHTML = `<p class="loading-text">Loading category...</p>`;

    positions = await fetchJSON(API_BASE + "positions/");

    if (!Array.isArray(positions) || positions.length === 0) {
        box.innerHTML = `<p class="loading-text">No Best Goalkeeper category found.</p>`;
        return;
    }

    box.innerHTML = "";

    positions.forEach((pos) => {
        const done = votedPositionIds.includes(Number(pos.id));

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "category-btn" + (done ? " done" : "");
        btn.dataset.id = pos.id;
        btn.textContent = done ? `${pos.name} ✓ Voted` : pos.name;

        btn.addEventListener("click", () => selectPosition(pos.id));

        box.appendChild(btn);
    });

    const firstUnvoted = positions.find(p => !votedPositionIds.includes(Number(p.id)));
    const first = firstUnvoted || positions[0];

    if (first) {
        await selectPosition(first.id);
    }
}

async function selectPosition(positionId) {
    selectedPositionId = Number(positionId);

    document.querySelectorAll(".category-btn").forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.id) === selectedPositionId);
    });

    const pos = positions.find(p => Number(p.id) === selectedPositionId);
    const title = document.getElementById("selectedCategoryTitle");

    if (title) title.textContent = pos ? pos.name : "Goalkeeper Nominees";

    await loadCandidates(selectedPositionId);
}

async function loadCandidates(positionId) {
    const box = document.getElementById("candidateList");
    const alreadyVoted = votedPositionIds.includes(Number(positionId));

    box.innerHTML = `<p class="loading-text">Loading goalkeepers...</p>`;

    const candidates = await fetchJSON(API_BASE + `positions/${positionId}/candidates/`);

    if (!Array.isArray(candidates) || candidates.length === 0) {
        box.innerHTML = `<p class="loading-text">No goalkeeper nominees found.</p>`;
        return;
    }

    box.innerHTML = "";

    candidates.forEach((gk) => {
        const card = document.createElement("div");
        card.className = "goalkeeper-card";

        const image = gk.image_url
            ? `<img src="${safe(gk.image_url)}" alt="${safe(gk.name)}">`
            : `<span class="no-photo">No Photo</span>`;

        card.innerHTML = `
            <div class="goalkeeper-photo">
                ${image}
            </div>

            <div class="goalkeeper-body">
                <h4>${safe(gk.name)}</h4>
                <p>${safe(gk.description || "Goalkeeper nominee for JAGWA SPORTS Best Goalkeeper Award.")}</p>

                <button class="vote-button" data-id="${gk.id}" ${alreadyVoted ? "disabled" : ""}>
                    ${alreadyVoted ? "Already Voted" : "Vote This Goalkeeper"}
                </button>
            </div>
        `;

        box.appendChild(card);
    });
}

async function submitVote(candidateId) {
    const voter = getVoter();

    if (!voter || !voter.token) {
        window.location.href = "/login/";
        return;
    }

    if (!confirm("Confirm your vote for this goalkeeper?")) {
        return;
    }

    const result = await fetchJSON(API_BASE + "vote/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Token " + voter.token
        },
        body: JSON.stringify({
            token: voter.token,
            candidate_id: candidateId
        })
    });

    showToast("Vote saved successfully.");

    if (result && result.completed_all_positions) {
        window.location.href = "/success/";
        return;
    }

    await checkProgress();
    await loadPositions();
}

document.addEventListener("DOMContentLoaded", async () => {
    const list = document.getElementById("candidateList");

    list.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("vote-button")) return;

        try {
            await submitVote(e.target.dataset.id);
        } catch (error) {
            showToast(error.message);
        }
    });

    try {
        await checkProgress();
        await loadPositions();
    } catch (error) {
        showToast(error.message);
    }
});

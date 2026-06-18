/* =====================================================
   JAGWA PUBLIC RESULTS
===================================================== */

const PUBLIC_API = "/api/";

function safe(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url) {
    const response = await fetch(url);
    const text = await response.text();

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(
            typeof data === "string"
                ? data
                : data?.detail || data?.message || "Request failed"
        );
    }

    return data;
}

function sortByVotes(candidates) {
    return [...candidates].sort((a, b) => {
        return Number(b.votes_count || 0) - Number(a.votes_count || 0);
    });
}

function renderNoResults(box) {
    box.innerHTML = `
        <div class="glass-card empty-state">
            <h3>No Results Found</h3>
            <p>No goalkeeper nominees or votes are available yet.</p>
            <a href="/vote/" class="btn btn-gold">Go to Vote</a>
        </div>
    `;
}

function renderResults(box, candidates) {
    const sorted = sortByVotes(candidates);

    if (sorted.length === 0) {
        renderNoResults(box);
        return;
    }

    const winner = sorted[0];

    const winnerImage = winner.image_url
        ? `<img src="${safe(winner.image_url)}" alt="${safe(winner.name)}">`
        : `<span class="no-photo">No Photo</span>`;

    let html = `
        <div class="winner-highlight">
            <div class="winner-photo">
                ${winnerImage}
            </div>

            <div class="winner-content">
                <small>🏆 CURRENT LEADER</small>

                <h3>${safe(winner.name)}</h3>

                <p>
                    ${safe(winner.description || "Leading goalkeeper nominee for JAGWA SPORTS Best Goalkeeper Award.")}
                </p>

                <div class="vote-big-number">
                    <strong>${Number(winner.votes_count || 0)}</strong>
                    <span>Votes</span>
                </div>
            </div>
        </div>

        <div class="ranking-list">
    `;

    sorted.forEach((gk, index) => {
        const image = gk.image_url
            ? `<img src="${safe(gk.image_url)}" alt="${safe(gk.name)}">`
            : `<span class="no-photo">No Photo</span>`;

        html += `
            <div class="ranking-item">
                <div class="rank-number">${index + 1}</div>

                <div class="rank-photo">
                    ${image}
                </div>

                <div class="rank-info">
                    <h4>${safe(gk.name)}</h4>
                    <p>${safe(gk.position_name || "Best Goalkeeper")}</p>
                </div>

                <div class="rank-votes">
                    ${Number(gk.votes_count || 0)}
                    <span>Votes</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    box.innerHTML = html;
}

async function loadPublicResults() {
    const box = document.getElementById("resultsBox");
    if (!box) return;

    try {
        const positions = await fetchJSON(PUBLIC_API + "positions/");

        if (!Array.isArray(positions) || positions.length === 0) {
            renderNoResults(box);
            return;
        }

        let allCandidates = [];

        for (const pos of positions) {
            try {
                const candidates = await fetchJSON(PUBLIC_API + `positions/${pos.id}/candidates/`);
                if (Array.isArray(candidates)) {
                    allCandidates = allCandidates.concat(candidates);
                }
            } catch (e) {}
        }

        renderResults(box, allCandidates);

    } catch (error) {
        box.innerHTML = `
            <div class="glass-card empty-state">
                <h3>Could Not Load Results</h3>
                <p>${safe(error.message)}</p>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", loadPublicResults);

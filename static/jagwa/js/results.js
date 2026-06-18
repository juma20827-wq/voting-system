/* =====================================================
   JAGWA MY VOTE / RESULTS JS
===================================================== */

const RESULTS_API = "/api/";

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

function renderNeedLogin(box) {
    box.innerHTML = `
        <div class="glass-card empty-state">
            <h3>Login Required</h3>
            <p>Please login first to view your saved Best Goalkeeper vote.</p>
            <a href="/login/" class="btn btn-gold">Login to Continue</a>
        </div>
    `;
}

function renderLocked(box, data) {
    box.innerHTML = `
        <div class="glass-card empty-state">
            <h3>Voting Not Completed</h3>
            <p>
                You have completed ${safe(data?.voted_positions || 0)} out of
                ${safe(data?.total_positions || 0)} voting categories.
                Complete your vote first to view your saved choice.
            </p>
            <a href="/vote/" class="btn btn-gold">Continue Voting</a>
        </div>
    `;
}

function renderNoVote(box) {
    box.innerHTML = `
        <div class="glass-card empty-state">
            <h3>No Vote Found</h3>
            <p>You have not voted yet for the Best Goalkeeper award.</p>
            <a href="/vote/" class="btn btn-gold">Vote Now</a>
        </div>
    `;
}

function renderVotes(box, votes) {
    if (!Array.isArray(votes) || votes.length === 0) {
        renderNoVote(box);
        return;
    }

    const vote = votes[0];

    const name =
        vote.candidate_name ||
        vote.candidate ||
        vote.name ||
        "Selected Goalkeeper";

    const position =
        vote.position_name ||
        vote.position ||
        "Best Goalkeeper";

    const description =
        vote.description ||
        vote.candidate_description ||
        "Your selected goalkeeper for JAGWA SPORTS Best Goalkeeper Award.";

    const imageUrl =
        vote.image_url ||
        vote.candidate_image ||
        vote.image ||
        "";

    box.innerHTML = `
        <div class="myvote-card">
            <div class="myvote-photo">
                ${
                    imageUrl
                    ? `<img src="${safe(imageUrl)}" alt="${safe(name)}">`
                    : `<span class="no-photo">No Photo</span>`
                }
            </div>

            <div class="myvote-content">
                <small>✅ Vote Saved</small>

                <h3>${safe(name)}</h3>

                <p>${safe(description)}</p>

                <div class="vote-meta">
                    <div>
                        <strong>${safe(position)}</strong>
                        <span>Category</span>
                    </div>

                    <div>
                        <strong>Recorded</strong>
                        <span>Status</span>
                    </div>
                </div>

                <a href="/" class="btn btn-dark">Back Home</a>
            </div>
        </div>
    `;
}

async function loadMyVote() {
    const box = document.getElementById("myVoteBox");
    if (!box) return;

    const voter = getVoter();

    if (!voter || !voter.token) {
        renderNeedLogin(box);
        return;
    }

    try {
        const data = await fetchJSON(RESULTS_API + "results/", {
            headers: {
                Authorization: "Token " + voter.token
            }
        });

        renderVotes(box, data.votes || data.results || data);

    } catch (error) {
        if (error.data && error.data.locked) {
            renderLocked(box, error.data);
            return;
        }

        box.innerHTML = `
            <div class="glass-card empty-state">
                <h3>Could Not Load Vote</h3>
                <p>${safe(error.message)}</p>
                <a href="/vote/" class="btn btn-gold">Go to Vote</a>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", loadMyVote);

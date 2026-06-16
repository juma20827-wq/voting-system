/* JAGWA SPORTS NEW ADMIN JS */

const API_BASE = "/api";

function getAdminKey() {
    let key =
        sessionStorage.getItem("jagwaAdminKey") ||
        localStorage.getItem("jagwaAdminKey") ||
        sessionStorage.getItem("adminKey") ||
        localStorage.getItem("adminKey") ||
        "";

    if (!key) {
        key = prompt("Enter Admin Key:");
        if (key) {
            sessionStorage.setItem("jagwaAdminKey", key);
        }
    }

    return key || "";
}
async function apiFetch(path, options = {}) {
    const key = getAdminKey();

    options.headers = options.headers || {};
    options.headers["X-Admin-Key"] = key;

    const response = await fetch(API_BASE + path, options);
    const text = await response.text();

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch (e) {
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
function safe(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clearForm() {
    document.getElementById("editingCandidateId").value = "";
    document.getElementById("newCandidateName").value = "";
    document.getElementById("newCandidatePosition").value = "";
    document.getElementById("newCandidateImage").value = "";
    document.getElementById("newCandidateDescription").value = "";

    document.getElementById("newCandidateSubmit").textContent = "Add Candidate";
    document.getElementById("cancelCandidateEdit").style.display = "none";
}

async function loadPositions() {
    const list = document.getElementById("newPositionsList");
    const select = document.getElementById("newCandidatePosition");
    const count = document.getElementById("newPositionCount");

    list.innerHTML = "Loading positions...";
    select.innerHTML = `<option value="">Select position</option>`;

    const positions = await apiFetch("/admin/positions/");

    count.textContent = Array.isArray(positions) ? positions.length : 0;
    list.innerHTML = "";

    if (!Array.isArray(positions) || positions.length === 0) {
        list.innerHTML = `<div class="clean-item"><p>No positions found</p></div>`;
        return;
    }

    positions.forEach((pos) => {
        const option = document.createElement("option");
        option.value = pos.id;
        option.textContent = pos.name;
        select.appendChild(option);

        const item = document.createElement("div");
        item.className = "clean-item";

        item.innerHTML = `
            <div>
                <h4>${safe(pos.name)}</h4>
                <p>Position ID: ${pos.id}</p>
            </div>

            <button class="btn-danger delete-position" data-id="${pos.id}">
                Delete
            </button>
        `;

        list.appendChild(item);
    });
}

async function loadCandidates() {
    const list = document.getElementById("newCandidatesList");
    const count = document.getElementById("newCandidateCount");

    list.innerHTML = "Loading candidates...";

    const candidates = await apiFetch("/admin/candidates/");

    count.textContent = Array.isArray(candidates) ? candidates.length : 0;
    list.innerHTML = "";

    if (!Array.isArray(candidates) || candidates.length === 0) {
        list.innerHTML = `<div class="clean-item"><p>No candidates found</p></div>`;
        return;
    }

    candidates.forEach((c) => {
        const positionId = c.position || c.position_id || "";
        const image = c.image_url
            ? `<img src="${safe(c.image_url)}" alt="${safe(c.name)}">`
            : `<div class="candidate-no-img">No Image</div>`;

        const row = document.createElement("div");
        row.className = "candidate-row";

        row.innerHTML = `
            ${image}

            <div>
                <h4>${safe(c.name)}</h4>
                <p><strong>Position:</strong> ${safe(c.position_name || "")}</p>
                <p><strong>Comments:</strong> ${safe(c.description || "No comments added")}</p>
                <p><strong>Votes:</strong> ${c.votes_count || 0}</p>
            </div>

            <div class="candidate-actions">
                <button class="btn-secondary upload-image" data-id="${c.id}">
                    Upload
                </button>

                <button
                    class="btn-secondary edit-candidate"
                    data-id="${c.id}"
                    data-name="${safe(c.name)}"
                    data-position="${positionId}"
                    data-description="${safe(c.description || "")}"
                >
                    Edit
                </button>

                <button class="btn-danger delete-candidate" data-id="${c.id}">
                    Delete
                </button>
            </div>
        `;

        list.appendChild(row);
    });
}

async function uploadCandidateImage(candidateId, file) {
    const formData = new FormData();
    formData.append("candidate_id", candidateId);
    formData.append("image", file);

    await apiFetch("/admin/upload-image/", {
        method: "POST",
        body: formData,
    });
}

async function loadWinners() {
    const box = document.getElementById("newWinnersList");
    const btn = document.getElementById("showWinnersBtn");

    if (box.dataset.visible === "yes") {
        box.innerHTML = "";
        box.dataset.visible = "no";
        btn.textContent = "Show Winners";
        return;
    }

    box.innerHTML = "Loading winners...";

    const winners = await apiFetch("/admin/winners/");

    box.innerHTML = "";

    if (!Array.isArray(winners) || winners.length === 0) {
        box.innerHTML = `<div class="clean-item"><p>No winners found</p></div>`;
    } else {
        winners.forEach((w) => {
            const image = w.image_url
                ? `<img src="${safe(w.image_url)}" alt="${safe(w.candidate)}">`
                : `<div class="candidate-no-img">No Image</div>`;

            const row = document.createElement("div");
            row.className = "candidate-row";

            row.innerHTML = `
                ${image}

                <div>
                    <h4>${safe(w.candidate)}</h4>
                    <p><strong>Position:</strong> ${safe(w.position)}</p>
                    <p><strong>Votes:</strong> ${w.votes || 0}</p>
                </div>

                <div>
                    <strong>Winner</strong>
                </div>
            `;

            box.appendChild(row);
        });
    }

    box.dataset.visible = "yes";
    btn.textContent = "Hide Winners";
}

async function loadVoters() {
    const box = document.getElementById("newVotersList");
    box.innerHTML = "Loading voters...";

    try {
        const users = await apiFetch("/admin/users/");

        box.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            box.innerHTML = `<div class="clean-item"><p>No voters found</p></div>`;
            return;
        }

        users.forEach((u) => {
            const item = document.createElement("div");
            item.className = "clean-item";

            item.innerHTML = `
                <div>
                    <h4>${safe(u.username || u.name || u.full_name || "Voter")}</h4>
                    <p>${safe(u.email || u.phone || "")}</p>
                </div>
            `;

            box.appendChild(item);
        });
    } catch (error) {
        box.innerHTML = `<div class="clean-item"><p>${safe(error.message)}</p></div>`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    document.querySelectorAll(".top-card[data-scroll]").forEach((card) => {
        card.addEventListener("click", () => {
            const id = card.dataset.scroll;
            const el = document.getElementById(id);

            if (el) {
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });
    });

    document.getElementById("newPositionForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("newPositionName").value.trim();

        if (!name) {
            alert("Enter position name");
            return;
        }

        try {
            await apiFetch("/admin/positions/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name,
                    description: "",
                }),
            });

            document.getElementById("newPositionName").value = "";
            await loadPositions();
            alert("Position added successfully");
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("newPositionsList").addEventListener("click", async (e) => {
        if (!e.target.classList.contains("delete-position")) return;

        const id = e.target.dataset.id;

        if (!confirm("Delete this position? Candidates and votes under it will also be deleted.")) {
            return;
        }

        try {
            await apiFetch(`/admin/positions/${id}/`, {
                method: "DELETE",
            });

            await loadPositions();
            await loadCandidates();
            alert("Position deleted successfully");
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("newCandidateForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const editingId = document.getElementById("editingCandidateId").value.trim();
        const name = document.getElementById("newCandidateName").value.trim();
        const positionId = document.getElementById("newCandidatePosition").value;
        const image = document.getElementById("newCandidateImage").files[0];
        const description = document.getElementById("newCandidateDescription").value.trim();

        if (!name || !positionId) {
            alert("Enter candidate name and select position");
            return;
        }

        try {
            if (editingId) {
                await apiFetch(`/admin/candidates/${editingId}/`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name,
                        position_id: positionId,
                        description: description,
                    }),
                });

                if (image) {
                    await uploadCandidateImage(editingId, image);
                }

                alert("Candidate updated successfully");
            } else {
                const candidate = await apiFetch("/admin/candidates/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name,
                        position_id: positionId,
                        description: description,
                        image_url: "",
                    }),
                });

                if (image && candidate && candidate.id) {
                    await uploadCandidateImage(candidate.id, image);
                }

                alert("Candidate added successfully");
            }

            clearForm();
            await loadCandidates();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("cancelCandidateEdit").addEventListener("click", clearForm);

    document.getElementById("newCandidatesList").addEventListener("click", async (e) => {
        const id = e.target.dataset.id;

        if (!id) return;

        if (e.target.classList.contains("edit-candidate")) {
            document.getElementById("editingCandidateId").value = id;
            document.getElementById("newCandidateName").value = e.target.dataset.name || "";
            document.getElementById("newCandidatePosition").value = e.target.dataset.position || "";
            document.getElementById("newCandidateDescription").value = e.target.dataset.description || "";
            document.getElementById("newCandidateImage").value = "";

            document.getElementById("newCandidateSubmit").textContent = "Save Changes";
            document.getElementById("cancelCandidateEdit").style.display = "block";

            document.getElementById("candidatesPanel").scrollIntoView({
                behavior: "smooth",
                block: "start",
            });

            return;
        }

        if (e.target.classList.contains("delete-candidate")) {
            if (!confirm("Delete this candidate?")) return;

            try {
                await apiFetch(`/admin/candidates/${id}/`, {
                    method: "DELETE",
                });

                await loadCandidates();
                alert("Candidate deleted successfully");
            } catch (error) {
                alert(error.message);
            }

            return;
        }

        if (e.target.classList.contains("upload-image")) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";

            input.addEventListener("change", async () => {
                const file = input.files[0];

                if (!file) return;

                try {
                    await uploadCandidateImage(id, file);
                    await loadCandidates();
                    alert("Image uploaded successfully");
                } catch (error) {
                    alert(error.message);
                }
            });

            input.click();
        }
    });

    document.getElementById("showWinnersBtn").addEventListener("click", async () => {
        try {
            await loadWinners();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("loadVotersBtn").addEventListener("click", loadVoters);

    try {
        await loadPositions();
        await loadCandidates();
    } catch (error) {
        alert(error.message);
    }
});

/* =====================================================
   JAGWA SPORTS ADMIN DASHBOARD
   Fresh clean admin JS
===================================================== */

const ADMIN_API = "/api/";

let adminCategories = [];
let adminGoalkeepers = [];
let adminResultsVisible = false;
let adminVotersVisible = false;

function safe(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showAdminToast(message) {
    const toast = document.getElementById("adminToast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3500);
}

function getAdminKey() {
    let key =
        sessionStorage.getItem("jagwaAdminKey") ||
        localStorage.getItem("jagwaAdminKey") ||
        "";

    if (!key) {
        key = prompt("Enter Admin Key:");

        if (key) {
            sessionStorage.setItem("jagwaAdminKey", key);
        }
    }

    return key || "";
}

async function readResponse(response) {
    const text = await response.text();

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return {
            detail: "Server returned an HTML error page. Check terminal for Django error details."
        };
    }

    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return {
            detail: text || "Unknown server response"
        };
    }
}

async function adminFetch(path, options = {}) {
    const key = getAdminKey();

    options.headers = options.headers || {};
    options.headers["X-Admin-Key"] = key;

    const response = await fetch(ADMIN_API + path, options);
    const data = await readResponse(response);

    if (!response.ok) {
        throw new Error(
            typeof data === "string"
                ? data
                : data?.detail || data?.message || data?.error || "Request failed"
        );
    }

    return data;
}

function resetGoalkeeperForm() {
    const editing = document.getElementById("editingGoalkeeperId");
    const name = document.getElementById("adminGoalkeeperName");
    const category = document.getElementById("adminGoalkeeperCategory");
    const image = document.getElementById("adminGoalkeeperImage");
    const description = document.getElementById("adminGoalkeeperDescription");
    const submit = document.getElementById("adminGoalkeeperSubmit");
    const cancel = document.getElementById("cancelGoalkeeperEdit");

    if (editing) editing.value = "";
    if (name) name.value = "";
    if (category) category.value = "";
    if (image) image.value = "";
    if (description) description.value = "";
    if (submit) submit.textContent = "Add Goalkeeper";
    if (cancel) cancel.style.display = "none";
}

console.log("JAGWA admin.js part 1 loaded");

/* ================= CATEGORY FUNCTIONS ================= */

async function loadAdminCategories() {
    const list = document.getElementById("adminCategoryList");
    const select = document.getElementById("adminGoalkeeperCategory");
    const count = document.getElementById("adminCategoryCount");

    if (!list || !select) return;

    list.innerHTML = `<p class="admin-muted">Loading categories...</p>`;
    select.innerHTML = `<option value="">Select category</option>`;

    adminCategories = await adminFetch("admin/positions/");

    if (count) {
        count.textContent = Array.isArray(adminCategories) ? adminCategories.length : 0;
    }

    list.innerHTML = "";

    if (!Array.isArray(adminCategories) || adminCategories.length === 0) {
        list.innerHTML = `<p class="admin-muted">No category found. Add BEST GOALKEEPER category.</p>`;
        return;
    }

    adminCategories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);

        const item = document.createElement("div");
        item.className = "admin-list-item";

        item.innerHTML = `
            <div>
                <h4>${safe(cat.name)}</h4>
                <p>Category ID: ${cat.id}</p>
            </div>

            <button class="btn btn-red delete-category-btn" type="button" data-id="${cat.id}">
                Delete
            </button>
        `;

        list.appendChild(item);
    });
}

async function addAdminCategory(name) {
    return await adminFetch("admin/positions/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            description: ""
        })
    });
}

async function deleteAdminCategory(categoryId) {
    return await adminFetch(`admin/positions/${categoryId}/`, {
        method: "DELETE"
    });
}

function attachCategoryEvents() {
    const form = document.getElementById("adminCategoryForm");
    const list = document.getElementById("adminCategoryList");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const input = document.getElementById("adminCategoryName");
            const name = input ? input.value.trim() : "";

            if (!name) {
                showAdminToast("Enter category name.");
                return;
            }

            try {
                await addAdminCategory(name);
                input.value = "";
                await loadAdminCategories();
                showAdminToast("Category added successfully.");
            } catch (error) {
                showAdminToast(error.message);
            }
        });
    }

    if (list) {
        list.addEventListener("click", async (e) => {
            if (!e.target.classList.contains("delete-category-btn")) return;

            const id = e.target.dataset.id;

            if (!confirm("Delete this category? All goalkeepers and votes under it may also be deleted.")) {
                return;
            }

            try {
                await deleteAdminCategory(id);
                await loadAdminCategories();

                if (typeof loadAdminGoalkeepers === "function") {
                    await loadAdminGoalkeepers();
                }

                showAdminToast("Category deleted successfully.");
            } catch (error) {
                showAdminToast(error.message);
            }
        });
    }
}

console.log("JAGWA admin.js part 2 loaded");

/* ================= GOALKEEPER LOAD + OVERVIEW ================= */

function getTotalVotes(goalkeepers) {
    if (!Array.isArray(goalkeepers)) return 0;

    return goalkeepers.reduce((sum, gk) => {
        return sum + Number(gk.votes_count || 0);
    }, 0);
}

function getCurrentLeader(goalkeepers) {
    if (!Array.isArray(goalkeepers) || goalkeepers.length === 0) return null;

    return [...goalkeepers].sort((a, b) => {
        return Number(b.votes_count || 0) - Number(a.votes_count || 0);
    })[0];
}

function updateAdminOverview() {
    const goalkeeperCount = document.getElementById("adminGoalkeeperCount");
    const categoryCount = document.getElementById("adminCategoryCount");
    const voteCount = document.getElementById("adminVoteCount");
    const leaderName = document.getElementById("adminLeaderName");

    if (goalkeeperCount) {
        goalkeeperCount.textContent = Array.isArray(adminGoalkeepers) ? adminGoalkeepers.length : 0;
    }

    if (categoryCount) {
        categoryCount.textContent = Array.isArray(adminCategories) ? adminCategories.length : 0;
    }

    if (voteCount) {
        voteCount.textContent = getTotalVotes(adminGoalkeepers);
    }

    const leader = getCurrentLeader(adminGoalkeepers);

    if (leaderName) {
        leaderName.textContent = leader ? leader.name : "None";
    }
}

async function loadAdminGoalkeepers() {
    const list = document.getElementById("adminGoalkeeperList");

    if (!list) return;

    list.innerHTML = `<p class="admin-muted">Loading goalkeepers...</p>`;

    adminGoalkeepers = await adminFetch("admin/candidates/");

    updateAdminOverview();

    list.innerHTML = "";

    if (!Array.isArray(adminGoalkeepers) || adminGoalkeepers.length === 0) {
        list.innerHTML = `<p class="admin-muted">No goalkeeper nominees found.</p>`;
        return;
    }

    adminGoalkeepers.forEach((gk) => {
        const imageUrl = gk.image_url || gk.image || "";

        const image = imageUrl
            ? `<img src="${safe(imageUrl)}" alt="${safe(gk.name)}">`
            : `<span class="no-photo">No Photo</span>`;

        const positionId = gk.position || gk.position_id || "";

        const card = document.createElement("div");
        card.className = "admin-goalkeeper-card";

        card.innerHTML = `
            <div class="admin-goalkeeper-photo">
                ${image}
            </div>

            <div class="admin-goalkeeper-info">
                <h4>${safe(gk.name)}</h4>
                <p><strong>Category:</strong> ${safe(gk.position_name || "Best Goalkeeper")}</p>
                <p><strong>Comments:</strong> ${safe(gk.description || "No comments added")}</p>
                <p><strong>Votes:</strong> ${Number(gk.votes_count || 0)}</p>
            </div>

            <div class="admin-actions">
                <button
                    class="btn btn-dark upload-goalkeeper-image"
                    type="button"
                    data-id="${gk.id}"
                >
                    Upload
                </button>

                <button
                    class="btn btn-gold edit-goalkeeper-btn"
                    type="button"
                    data-id="${gk.id}"
                    data-name="${safe(gk.name)}"
                    data-position="${positionId}"
                    data-description="${safe(gk.description || "")}"
                >
                    Edit
                </button>

                <button
                    class="btn btn-red delete-goalkeeper-btn"
                    type="button"
                    data-id="${gk.id}"
                >
                    Delete
                </button>
            </div>
        `;

        list.appendChild(card);
    });
}

async function uploadGoalkeeperImage(goalkeeperId, file) {
    const formData = new FormData();
    formData.append("candidate_id", goalkeeperId);
    formData.append("image", file);

    return await adminFetch("admin/upload-image/", {
        method: "POST",
        body: formData
    });
}

console.log("JAGWA admin.js part 3 loaded");

/* ================= ADD / EDIT / DELETE GOALKEEPER ================= */

async function saveGoalkeeper(data, editingId = "") {
    if (editingId) {
        return await adminFetch(`admin/candidates/${editingId}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    return await adminFetch("admin/candidates/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

async function deleteGoalkeeper(goalkeeperId) {
    return await adminFetch(`admin/candidates/${goalkeeperId}/`, {
        method: "DELETE"
    });
}

function attachGoalkeeperEvents() {
    const form = document.getElementById("adminGoalkeeperForm");
    const list = document.getElementById("adminGoalkeeperList");
    const cancelBtn = document.getElementById("cancelGoalkeeperEdit");
    const refreshBtn = document.getElementById("refreshAdminData");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const editingId = document.getElementById("editingGoalkeeperId").value.trim();
            const name = document.getElementById("adminGoalkeeperName").value.trim();
            const categoryId = document.getElementById("adminGoalkeeperCategory").value;
            const imageFile = document.getElementById("adminGoalkeeperImage").files[0];
            const description = document.getElementById("adminGoalkeeperDescription").value.trim();

            if (!name || !categoryId) {
                showAdminToast("Enter goalkeeper name and select category.");
                return;
            }

            const payload = {
                name: name,
                position: categoryId,
                position_id: categoryId,
                description: description
            };

            try {
                const saved = await saveGoalkeeper(payload, editingId);

                const goalkeeperId = editingId || saved?.id;

                if (imageFile && goalkeeperId) {
                    await uploadGoalkeeperImage(goalkeeperId, imageFile);
                }

                resetGoalkeeperForm();
                await loadAdminGoalkeepers();
                showAdminToast(editingId ? "Goalkeeper updated successfully." : "Goalkeeper added successfully.");

            } catch (error) {
                showAdminToast(error.message);
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", resetGoalkeeperForm);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", async () => {
            try {
                await loadAdminCategories();
                await loadAdminGoalkeepers();
                showAdminToast("Dashboard refreshed.");
            } catch (error) {
                showAdminToast(error.message);
            }
        });
    }

    if (list) {
        list.addEventListener("click", async (e) => {
            const id = e.target.dataset.id;

            if (!id) return;

            if (e.target.classList.contains("edit-goalkeeper-btn")) {
                document.getElementById("editingGoalkeeperId").value = id;
                document.getElementById("adminGoalkeeperName").value = e.target.dataset.name || "";
                document.getElementById("adminGoalkeeperCategory").value = e.target.dataset.position || "";
                document.getElementById("adminGoalkeeperDescription").value = e.target.dataset.description || "";
                document.getElementById("adminGoalkeeperImage").value = "";

                document.getElementById("adminGoalkeeperSubmit").textContent = "Save Changes";

                const cancel = document.getElementById("cancelGoalkeeperEdit");
                if (cancel) cancel.style.display = "inline-flex";

                const panel = document.getElementById("goalkeeperFormPanel");
                if (panel) {
                    panel.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

                return;
            }

            if (e.target.classList.contains("delete-goalkeeper-btn")) {
                if (!confirm("Delete this goalkeeper nominee?")) {
                    return;
                }

                try {
                    await deleteGoalkeeper(id);
                    await loadAdminGoalkeepers();
                    showAdminToast("Goalkeeper deleted successfully.");
                } catch (error) {
                    showAdminToast(error.message);
                }

                return;
            }

            if (e.target.classList.contains("upload-goalkeeper-image")) {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";

                input.addEventListener("change", async () => {
                    const file = input.files[0];

                    if (!file) return;

                    try {
                        await uploadGoalkeeperImage(id, file);
                        await loadAdminGoalkeepers();
                        showAdminToast("Image uploaded successfully.");
                    } catch (error) {
                        showAdminToast(error.message);
                    }
                });

                input.click();
            }
        });
    }
}

console.log("JAGWA admin.js part 4 loaded");

/* ================= RESULTS / VOTERS / RESET ================= */

function sortGoalkeepersByVotes(goalkeepers) {
    return [...goalkeepers].sort((a, b) => {
        return Number(b.votes_count || 0) - Number(a.votes_count || 0);
    });
}

async function showAdminResults() {
    const box = document.getElementById("adminResultsBox");
    const btn = document.getElementById("showAdminResults");

    if (!box) return;

    if (adminResultsVisible) {
        box.innerHTML = "";
        adminResultsVisible = false;
        if (btn) btn.textContent = "Show Results";
        return;
    }

    try {
        await loadAdminGoalkeepers();

        const sorted = sortGoalkeepersByVotes(adminGoalkeepers);

        if (!Array.isArray(sorted) || sorted.length === 0) {
            box.innerHTML = `<p class="admin-muted">No results found.</p>`;
            return;
        }

        let html = "";

        sorted.forEach((gk, index) => {
            const imageUrl = gk.image_url || gk.image || "";

            const image = imageUrl
                ? `<img src="${safe(imageUrl)}" alt="${safe(gk.name)}">`
                : `<span class="no-photo">No Photo</span>`;

            html += `
                <div class="admin-goalkeeper-card">
                    <div class="admin-goalkeeper-photo">
                        ${image}
                    </div>

                    <div class="admin-goalkeeper-info">
                        <h4>#${index + 1} ${safe(gk.name)}</h4>
                        <p><strong>Category:</strong> ${safe(gk.position_name || "Best Goalkeeper")}</p>
                        <p><strong>Votes:</strong> ${Number(gk.votes_count || 0)}</p>
                    </div>

                    <div class="admin-actions">
                        <span class="btn btn-gold" style="cursor:default;">
                            ${index === 0 ? "Leader" : "Rank " + (index + 1)}
                        </span>
                    </div>
                </div>
            `;
        });

        box.innerHTML = html;
        adminResultsVisible = true;
        if (btn) btn.textContent = "Hide Results";

    } catch (error) {
        showAdminToast(error.message);
    }
}

async function loadAdminVoters() {
    const box = document.getElementById("adminVotersBox");
    const btn = document.getElementById("loadAdminVoters");

    if (!box) return;

    if (adminVotersVisible) {
        box.innerHTML = "";
        adminVotersVisible = false;
        if (btn) btn.textContent = "Load Voters";
        return;
    }

    box.innerHTML = `<p class="admin-muted">Loading voters...</p>`;

    try {
        const voters = await adminFetch("admin/users/");

        box.innerHTML = "";

        if (!Array.isArray(voters) || voters.length === 0) {
            box.innerHTML = `<p class="admin-muted">No voters found.</p>`;
            adminVotersVisible = true;
            if (btn) btn.textContent = "Hide Voters";
            return;
        }

        voters.forEach((voter) => {
            const item = document.createElement("div");
            item.className = "admin-list-item";

            item.innerHTML = `
                <div>
                    <h4>${safe(voter.full_name || voter.name || voter.username || "Voter")}</h4>
                    <p>${safe(voter.phone || voter.phone_number || voter.email || "")}</p>
                </div>
            `;

            box.appendChild(item);
        });

        adminVotersVisible = true;
        if (btn) btn.textContent = "Hide Voters";

    } catch (error) {
        box.innerHTML = `<p class="admin-muted">${safe(error.message)}</p>`;
    }
}

async function resetElection() {
    if (!confirm("Are you sure you want to reset election data?")) return;
    if (!confirm("This action may remove votes. Continue?")) return;

    try {
        await adminFetch("admin/reset/", {
            method: "POST"
        });

        await loadAdminCategories();
        await loadAdminGoalkeepers();

        const resultsBox = document.getElementById("adminResultsBox");
        if (resultsBox) resultsBox.innerHTML = "";

        adminResultsVisible = false;

        const resultsBtn = document.getElementById("showAdminResults");
        if (resultsBtn) resultsBtn.textContent = "Show Results";

        showAdminToast("Election reset successfully.");

    } catch (error) {
        showAdminToast(error.message);
    }
}

function attachDashboardEvents() {
    const resultsBtn = document.getElementById("showAdminResults");
    const votersBtn = document.getElementById("loadAdminVoters");
    const resetBtn = document.getElementById("resetElectionBtn");

    if (resultsBtn) {
        resultsBtn.addEventListener("click", showAdminResults);
    }

    if (votersBtn) {
        votersBtn.addEventListener("click", loadAdminVoters);
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", resetElection);
    }
}

/* ================= START ADMIN DASHBOARD ================= */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        attachCategoryEvents();
        attachGoalkeeperEvents();
        attachDashboardEvents();

        await loadAdminCategories();
        await loadAdminGoalkeepers();

        updateAdminOverview();

        showAdminToast("Admin dashboard ready.");

    } catch (error) {
        showAdminToast(error.message);
        console.error(error);
    }
});

console.log("JAGWA admin.js part 5 loaded");

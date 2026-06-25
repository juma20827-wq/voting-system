(function () {
  const API = "/api/";

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
    const finalUrl = url + sep + "admin_key=" + encodeURIComponent(getKey());

    const res = await fetch(finalUrl, options);
    const text = await res.text();

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      throw new Error((data && (data.detail || data.message)) || text || "Request failed");
    }

    return data;
  }

  function cleanValue(v) {
    return String(v || "")
      .replace(/\\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/🇹🇿|🏆|⚽/g, " ")
      .replace(/NATIONAL\s+TEAM/ig, " ")
      .replace(/CLUB\s*\/\s*TEAM/ig, " ")
      .replace(/^TEAM/ig, " ")
      .replace(/\bCOMMENT\b/ig, " ")
      .replace(/[._]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseDescription(description) {
    let raw = String(description || "")
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\bCOMMENT\b/ig, "")
      .trim();

    let flat = raw.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    let national = "";
    let club = "";

    const n = flat.match(/NATIONAL\s+TEAM\s*(?:⚽)?\s*(.*)$/i);

    if (n) {
      let rest = n[1] || "";
      const split = rest.match(/^(.*?)(?:🏆|CLUB\s*\/\s*TEAM|TEAM\s*⚽|TEAM\s+)(.*)$/i);

      if (split) {
        national = cleanValue(split[1]);
        club = cleanValue(split[2]);
      } else {
        national = cleanValue(rest);
      }
    }

    if (!club && /🏆|CLUB\s*\/\s*TEAM/i.test(flat)) {
      const c = flat.match(/(?:🏆\s*)?(?:CLUB\s*\/\s*TEAM)\s*(?:⚽)?\s*(.*)$/i);
      if (c) club = cleanValue(c[1]);
    }

    return { national, club };
  }

  function buildDescription(national, club) {
    const parts = [];

    if (national && national.trim()) {
      parts.push("🇹🇿 NATIONAL TEAM ⚽ " + national.trim());
    }

    if (club && club.trim()) {
      parts.push("🏆 CLUB / TEAM ⚽ " + club.trim());
    }

    return parts.join("\\n");
  }

  function commentsHTML(description) {
    const d = parseDescription(description);
    let html = "";

    if (d.national) {
      html += `<div class="admin-comment"><b>NATIONAL TEAM</b><br>${safe(d.national)}</div>`;
    }

    if (d.club) {
      html += `<div class="admin-comment"><b>CLUB / TEAM</b><br>${safe(d.club)}</div>`;
    }

    return html;
  }

  async function uploadImage(candidateId, file) {
    if (!file) return;

    const form = new FormData();
    form.append("candidate_id", candidateId);
    form.append("image", file);

    await api(API + "admin/upload-image/", {
      method: "POST",
      body: form
    });
  }

  async function loadPositions() {
    return await fetch(API + "positions/").then(r => r.json());
  }

  function categoryOptions(positions, selectedId) {
    return positions.map(p => `
      <option value="${p.id}" ${String(p.id) === String(selectedId) ? "selected" : ""}>
        ${safe(p.name)}
      </option>
    `).join("");
  }

  function addStyles() {
    if (document.getElementById("adminToolsStyle")) return;

    const style = document.createElement("style");
    style.id = "adminToolsStyle";
    style.innerHTML = `
      .candidate-admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
      }

      .candidate-admin-card {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 22px;
        overflow: hidden;
        color: white;
      }

      .candidate-admin-img {
        height: 220px;
        background: #05070d;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
      }

      .candidate-admin-img img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 12px;
      }

      .candidate-admin-body {
        padding: 16px;
      }

      .admin-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .admin-btn {
        border: 0;
        border-radius: 14px;
        padding: 11px 14px;
        font-weight: 900;
        cursor: pointer;
        background: linear-gradient(135deg, #ef233c, #ff7a18);
        color: #fff;
        text-decoration: none;
        display: inline-block;
      }

      .admin-btn.green { background: linear-gradient(135deg, #16a34a, #22c55e); }
      .admin-btn.blue { background: linear-gradient(135deg, #2563eb, #06b6d4); }
      .admin-btn.danger { background: linear-gradient(135deg, #dc2626, #991b1b); }
      .admin-btn.light { background: #fff; color: #111827; }

      .admin-comment {
        background: rgba(255,255,255,0.08);
        padding: 9px 11px;
        border-radius: 12px;
        margin: 8px 0;
        font-weight: 800;
      }

      .edit-panel {
        margin-top: 14px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        display: none;
      }

      .edit-panel.show { display: block; }

      .edit-title {
        font-weight: 950;
        margin-bottom: 12px;
        color: #ff4057;
      }

      .admin-field {
        margin-bottom: 12px;
      }

      .admin-field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 800;
      }

      .admin-input,
      .admin-select {
        width: 100%;
        padding: 12px;
        border-radius: 13px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.95);
        color: #111827;
      }

      .admin-two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      @media (max-width: 700px) {
        .admin-two { grid-template-columns: 1fr; }
        .candidate-admin-img { height: 210px; }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadCandidatesWithTools() {
    addStyles();

    const box = document.getElementById("candidateList");
    if (!box) return;

    const positions = await loadPositions();
    const candidates = await api(API + "admin/candidates/");

    if (!candidates.length) {
      box.innerHTML = `<div class="admin-comment">No nominees found.</div>`;
      return;
    }

    box.innerHTML = `
      <div class="candidate-admin-grid">
        ${candidates.map(c => {
          const parsed = parseDescription(c.description);

          return `
            <div class="candidate-admin-card" data-id="${c.id}">
              <div class="candidate-admin-img">
                ${c.image_url ? `<img src="${safe(c.image_url)}">` : `<span>No Image</span>`}
              </div>

              <div class="candidate-admin-body">
                <h3>${safe(c.name)}</h3>
                <p>${safe(c.position_name || "")}</p>
                ${commentsHTML(c.description)}
                <p><b>Votes:</b> ${c.votes_count || 0}</p>

                <div class="admin-actions">
                  <button class="admin-btn blue edit-toggle" data-id="${c.id}">Edit</button>
                  <button class="admin-btn danger delete-candidate" data-id="${c.id}" data-name="${safe(c.name)}">Delete</button>
                </div>

                <div class="edit-panel" id="editPanel-${c.id}">
                  <div class="edit-title">Edit Nominee</div>

                  <div class="admin-field">
                    <label>Name</label>
                    <input class="admin-input edit-name" value="${safe(c.name)}">
                  </div>

                  <div class="admin-field">
                    <label>Category</label>
                    <select class="admin-select edit-position">
                      ${categoryOptions(positions, c.position_id)}
                    </select>
                  </div>

                  <div class="admin-two">
                    <div class="admin-field">
                      <label>National Team</label>
                      <input class="admin-input edit-national" value="${safe(parsed.national)}">
                    </div>

                    <div class="admin-field">
                      <label>Club / Team</label>
                      <input class="admin-input edit-club" value="${safe(parsed.club)}">
                    </div>
                  </div>

                  <div class="admin-field">
                    <label>Upload New Photo</label>
                    <input type="file" accept="image/*" class="admin-input edit-image">
                  </div>

                  <div class="admin-actions">
                    <button class="admin-btn green save-edit" data-id="${c.id}">Save / Upload</button>
                    <button class="admin-btn light cancel-edit" data-id="${c.id}">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    bindButtons();
  }

  function bindButtons() {
    document.querySelectorAll(".edit-toggle").forEach(btn => {
      btn.onclick = function () {
        const panel = document.getElementById("editPanel-" + btn.dataset.id);
        if (panel) panel.classList.add("show");
      };
    });

    document.querySelectorAll(".cancel-edit").forEach(btn => {
      btn.onclick = function () {
        const panel = document.getElementById("editPanel-" + btn.dataset.id);
        if (panel) panel.classList.remove("show");
      };
    });

    document.querySelectorAll(".save-edit").forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const card = document.querySelector(`.candidate-admin-card[data-id="${id}"]`);

        const name = card.querySelector(".edit-name").value.trim();
        const positionId = card.querySelector(".edit-position").value;
        const national = card.querySelector(".edit-national").value.trim();
        const club = card.querySelector(".edit-club").value.trim();
        const file = card.querySelector(".edit-image").files[0];

        if (!name) {
          alert("Name is required.");
          return;
        }

        try {
          await api(API + "admin/candidates/" + id + "/", {
            method: "PATCH",
            body: JSON.stringify({
              name: name,
              position_id: positionId,
              description: buildDescription(national, club)
            })
          });

          if (file) {
            await uploadImage(id, file);
          }

          await loadCandidatesWithTools();
          alert("Nominee updated successfully.");
        } catch (err) {
          alert(err.message);
        }
      };
    });

    document.querySelectorAll(".delete-candidate").forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const name = btn.dataset.name;

        if (!confirm("Delete nominee: " + name + "?")) return;

        try {
          await api(API + "admin/candidates/" + id + "/", {
            method: "DELETE"
          });

          await loadCandidatesWithTools();
          alert("Nominee deleted.");
        } catch (err) {
          alert(err.message);
        }
      };
    });
  }

  window.loadCandidatesWithTools = loadCandidatesWithTools;

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(loadCandidatesWithTools, 500);

    const refresh = document.getElementById("refreshCandidates");
    if (refresh) {
      refresh.onclick = function () {
        loadCandidatesWithTools().catch(err => alert(err.message));
      };
    }
  });
})();

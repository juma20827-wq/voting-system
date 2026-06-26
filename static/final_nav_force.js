(function () {
  function isAdminPage() {
    return location.pathname.includes("/jagwa-control");
  }

  function isAdminLoginPage() {
    return location.pathname.includes("/jagwa-login");
  }

  function navHTMLAdmin() {
    return `
      <a href="/" class="force-nav-item">
        <span>🏠</span>
        <b>Home</b>
      </a>

      <a href="#adminResults" id="forceAdminResults" class="force-nav-item">
        <span>📊</span>
        <b>Results</b>
      </a>

      <a href="#" id="forceAdminRefresh" class="force-nav-item">
        <span>🔄</span>
        <b>Refresh</b>
      </a>

      <a href="#" id="forceAdminLogout" class="force-nav-item danger">
        <span>🚪</span>
        <b>Logout</b>
      </a>
    `;
  }

  function navHTMLVoter() {
    return `
      <a href="/" class="force-nav-item">
        <span>🏠</span>
        <b>Home</b>
      </a>

      <a href="/vote/" class="force-nav-item">
        <span>🧤</span>
        <b>Vote</b>
      </a>

      <a href="/my-vote/" class="force-nav-item">
        <span>✅</span>
        <b>MyVote</b>
      </a>

      <a href="#" id="forceVoterLogout" class="force-nav-item danger">
        <span>🚪</span>
        <b>Logout</b>
      </a>
    `;
  }

  function addStyle() {
    if (document.getElementById("forceNavFinalStyle")) return;

    const style = document.createElement("style");
    style.id = "forceNavFinalStyle";
    style.innerHTML = `
      .force-nav-final {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 8px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 14px 12px !important;
        border-radius: 24px !important;
        background: rgba(4, 8, 15, .92) !important;
        border: 1px solid rgba(255,255,255,.14) !important;
        box-shadow: 0 14px 35px rgba(0,0,0,.28) !important;
        max-width: 1000px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .force-nav-final .force-nav-item {
        text-decoration: none !important;
        color: #d1d5db !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        min-height: 64px !important;
        border-radius: 16px !important;
        font-weight: 950 !important;
      }

      .force-nav-final .force-nav-item span {
        font-size: 24px !important;
        line-height: 1 !important;
      }

      .force-nav-final .force-nav-item b {
        font-size: 13px !important;
        letter-spacing: .2px !important;
      }

      .force-nav-final .force-nav-item:hover {
        background: rgba(255,255,255,.08) !important;
        color: white !important;
      }

      .force-nav-final .force-nav-item.danger {
        color: #fff !important;
        background: linear-gradient(135deg, rgba(220,38,38,.88), rgba(153,27,27,.88)) !important;
      }

      .force-hide-top-nav-copy {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      @media (max-width: 430px) {
        .force-nav-final {
          gap: 5px !important;
          padding: 12px 8px !important;
        }

        .force-nav-final .force-nav-item {
          min-height: 58px !important;
        }

        .force-nav-final .force-nav-item span {
          font-size: 22px !important;
        }

        .force-nav-final .force-nav-item b {
          font-size: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeInsideLogoutCards() {
    document.querySelectorAll(
      ".admin-bottom-logout-final, .voter-bottom-logout-final, #adminBottomLogoutFinal, #voterBottomLogoutFinal"
    ).forEach(el => el.remove());

    document.querySelectorAll("section, .admin-card, .login-box, .result-header-card").forEach(card => {
      const text = (card.textContent || "").toLowerCase();

      if (
        text.includes("admin session") ||
        text.includes("voter session") ||
        text.includes("ukimaliza kazi") ||
        text.includes("ukimaliza kupiga kura")
      ) {
        card.style.display = "none";
      }
    });
  }

  function navCandidateElements() {
    return Array.from(document.querySelectorAll(
      "nav, footer, .bottom-nav, .mobile-nav, .app-nav, .jagwa-nav, .nav, .navigation, .force-nav-final"
    )).filter(el => {
      const text = (el.textContent || "").toLowerCase();
      const cls = (el.className || "").toString().toLowerCase();

      return (
        cls.includes("force-nav-final") ||
        cls.includes("bottom") ||
        cls.includes("mobile") ||
        (
          text.includes("home") &&
          (
            text.includes("vote") ||
            text.includes("myvote") ||
            text.includes("my vote") ||
            text.includes("result") ||
            text.includes("logout")
          )
        )
      );
    });
  }

  function getBottomBar() {
    const candidates = navCandidateElements()
      .filter(el => el.offsetParent !== null)
      .map(el => ({
        el,
        top: el.getBoundingClientRect().top,
        bottom: el.getBoundingClientRect().bottom
      }));

    if (!candidates.length) return null;

    candidates.sort((a, b) => b.top - a.top);
    return candidates[0].el;
  }

  function hideAllOtherNavCopies(bottomBar) {
    navCandidateElements().forEach(el => {
      if (el !== bottomBar) {
        const text = (el.textContent || "").toLowerCase();

        if (
          el.classList.contains("force-nav-final") ||
          (
            text.includes("home") &&
            (
              text.includes("vote") ||
              text.includes("myvote") ||
              text.includes("my vote") ||
              text.includes("result") ||
              text.includes("logout")
            )
          )
        ) {
          el.classList.add("force-hide-top-nav-copy");
        }
      }
    });
  }

  function createBottomBarIfMissing() {
    const wrap = document.createElement("div");
    wrap.id = "forceCreatedBottomNavWrap";
    wrap.style.maxWidth = "1000px";
    wrap.style.margin = "30px auto 80px";
    wrap.style.padding = "0 18px";

    const nav = document.createElement("nav");
    nav.id = "forceCreatedBottomNav";
    nav.className = "force-nav-final";
    wrap.appendChild(nav);

    document.body.appendChild(wrap);
    return nav;
  }

  function applyBottomOnlyNav() {
    if (isAdminLoginPage()) return;

    addStyle();
    removeInsideLogoutCards();

    let bottomBar = getBottomBar();

    if (!bottomBar) {
      bottomBar = createBottomBarIfMissing();
    }

    hideAllOtherNavCopies(bottomBar);

    bottomBar.classList.remove("force-hide-top-nav-copy");
    bottomBar.classList.add("force-nav-final");
    bottomBar.innerHTML = isAdminPage() ? navHTMLAdmin() : navHTMLVoter();

    bindActions();
  }

  function bindActions() {
    const adminResults = document.getElementById("forceAdminResults");
    const adminRefresh = document.getElementById("forceAdminRefresh");
    const adminLogout = document.getElementById("forceAdminLogout");
    const voterLogout = document.getElementById("forceVoterLogout");

    if (adminResults) {
      adminResults.onclick = function (e) {
        e.preventDefault();

        const newLeaderBtn = document.getElementById("adminShowLeadersBtn");
        const resultsBox = document.getElementById("adminResults");
        const votersBox = document.getElementById("adminVotersBox");

        if (newLeaderBtn) {
          // Lazimisha results mpya za current leaders zionekane
          if (!resultsBox || resultsBox.style.display === "none" || !resultsBox.innerHTML.trim()) {
            newLeaderBtn.click();
          } else {
            // Kama already open, refresh results upya
            resultsBox.style.display = "none";
            newLeaderBtn.textContent = "Show Results";
            setTimeout(function () {
              newLeaderBtn.click();
            }, 100);
          }

          if (votersBox) {
            votersBox.style.display = "none";
          }
        } else {
          // fallback ya zamani kama JS mpya haijaload
          const showBtn = document.getElementById("showHideResultsBtn");
          const oldBtn = document.getElementById("loadResults");

          if (showBtn) showBtn.click();
          else if (oldBtn) oldBtn.click();
        }

        setTimeout(function () {
          const target =
            document.getElementById("adminLiveToolbar") ||
            document.getElementById("adminResults");

          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 500);
      };
    }

    if (adminRefresh) {
      adminRefresh.onclick = function (e) {
        e.preventDefault();
        window.location.href = "/jagwa-control/?refresh=" + Date.now();
      };
    }

    if (adminLogout) {
      adminLogout.onclick = function (e) {
        e.preventDefault();
        localStorage.removeItem("ADMIN_API_KEY");
        localStorage.removeItem("voterProfile");
        localStorage.removeItem("votedCandidates");
        window.location.href = "/jagwa-login/";
      };
    }

    if (voterLogout) {
      voterLogout.onclick = function (e) {
        e.preventDefault();
        localStorage.removeItem("voterProfile");
        localStorage.removeItem("votedCandidates");
        window.location.href = "/login/?next=/vote/";
      };
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyBottomOnlyNav();
    setTimeout(applyBottomOnlyNav, 700);
    setTimeout(applyBottomOnlyNav, 1500);
  });

  const observer = new MutationObserver(function () {
    removeInsideLogoutCards();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

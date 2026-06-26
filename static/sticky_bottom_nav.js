(function () {
  function addStickyStyle() {
    if (document.getElementById("stickyBottomNavStyle")) return;

    const style = document.createElement("style");
    style.id = "stickyBottomNavStyle";
    style.innerHTML = `
      body {
        padding-bottom: 125px !important;
      }

      .force-nav-final {
        position: fixed !important;
        left: 50% !important;
        right: auto !important;
        bottom: calc(14px + env(safe-area-inset-bottom)) !important;
        transform: translateX(-50%) !important;
        width: calc(100% - 28px) !important;
        max-width: 1000px !important;
        z-index: 999999 !important;
        margin: 0 !important;
      }

      #forceCreatedBottomNavWrap {
        margin: 0 !important;
        padding: 0 !important;
        height: 0 !important;
      }

      @media (max-width: 650px) {
        body {
          padding-bottom: 118px !important;
        }

        .force-nav-final {
          width: calc(100% - 18px) !important;
          bottom: calc(10px + env(safe-area-inset-bottom)) !important;
          border-radius: 22px !important;
        }
      }

      @media (max-width: 390px) {
        .force-nav-final {
          width: calc(100% - 12px) !important;
          gap: 4px !important;
          padding: 10px 6px !important;
        }

        .force-nav-final .force-nav-item b {
          font-size: 11px !important;
        }

        .force-nav-final .force-nav-item span {
          font-size: 20px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", function () {
    addStickyStyle();
    setTimeout(addStickyStyle, 600);
    setTimeout(addStickyStyle, 1500);
  });
})();

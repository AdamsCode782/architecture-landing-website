
window.addEventListener("load", () => {
  setTimeout(() => {
    try {
      document.body.classList.add("display");
    } catch (err) {
      console.error(err);
    }
  }, 4000);
});

// --- Hamburger toggle ---
const hamburger = document.querySelector(".hamburger-menu");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    const container = document.querySelector(".container");
    if (container) container.classList.toggle("change");
  });
}

// --- Smooth scroll for sidebar menu links (and close sidebar) ---
document.querySelectorAll(".menu-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const href = link.getAttribute("href") || "";
    let targetId = null;

    if (href.startsWith("#") && href.length > 1) {
      targetId = href.slice(1);
    } else {
      const dc = (link.getAttribute("data-content") || "").toLowerCase();
      if (dc.includes("home")) targetId = "home";
      else if (dc.includes("about")) targetId = "about";
      else if (dc.includes("team")) targetId = "team";
      else if (dc.includes("pricing")) targetId = "pricing";
      else if (dc.includes("contact")) targetId = "contact";
    }

    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Close sidebar if open
    const container = document.querySelector(".container");
    if (container?.classList.contains("change")) {
      container.classList.remove("change");
    }
  });
});

// --- Hero "Discover" button scroll -> about ---
const discoverBtn = document.querySelector(".discover-now");
if (discoverBtn) {
  discoverBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const about = document.getElementById("about");
    if (about) about.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// --- Scroll-to-top button ---
(() => {
  const btn = document.getElementById("scrollTopBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    // Fallback for maximum browser compatibility
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

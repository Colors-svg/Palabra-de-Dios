/* ==========================================================================
   PALABRA VISUAL — VISOR PÚBLICO LIMPIO (viewer.js)
   Listo desde el segundo 0 sin controles de edición ni autoplay/presentar
   ========================================================================== */
(function () {
  const { escapeHTML, buildSlideHTML, animateSlideContent, preloadImages } = window.PalabraRenderer;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THEMES = ["oscuro", "claro", "sepia"];
  const THEME_NAMES = { oscuro: "Noche", claro: "Amanecer", sepia: "Pergamino" };

  const state = {
    catalog: [],
    book: null,
    currentBookKey: "oseas",
    currentIndex: 0,
    isTransitioning: false,
    theme: "oscuro",
    lockTimer: null
  };

  const stageEl = document.getElementById("slides-stage");
  const counterEl = document.getElementById("slide-counter");
  const dotsEl = document.getElementById("dots-nav");
  const progressFillEl = document.getElementById("progress-fill");
  const progressTrackEl = document.getElementById("progress-track");
  const indexDrawer = document.getElementById("index-drawer");
  const drawerBackdropEl = document.getElementById("drawer-backdrop");

  function setTheme(themeName) {
    state.theme = THEMES.includes(themeName) ? themeName : "oscuro";
    document.documentElement.setAttribute("data-theme", state.theme);
    document.getElementById("theme-label").textContent = THEME_NAMES[state.theme];
    document.querySelectorAll("[data-theme-choice]").forEach(btn => {
      const isSel = btn.dataset.themeChoice === state.theme;
      btn.classList.toggle("is-selected", isSel);
      btn.setAttribute("aria-selected", String(isSel));
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown.is-open").forEach(dd => {
      dd.classList.remove("is-open");
      dd.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
    });
  }

  function closeDrawers() {
    indexDrawer.classList.remove("is-open");
    drawerBackdropEl.classList.remove("is-open");
    indexDrawer.setAttribute("aria-hidden", "true");
  }

  function checkLockState() {
    clearInterval(state.lockTimer);
    const lockEl = document.getElementById("lock-screen");
    const rawDate = state.book?.desbloqueo;
    const targetTime = rawDate ? new Date(rawDate).getTime() : 0;

    if (!rawDate || Number.isNaN(targetTime) || Date.now() >= targetTime) {
      lockEl.classList.remove("is-active");
      return;
    }

    document.getElementById("lock-title").textContent = state.book.libro || "Reflexión";
    document.getElementById("lock-msg").textContent =
      state.book.bloqueoMensaje || "Esta reflexión estará disponible muy pronto para el tiempo de meditación.";
    const coverImg = state.book.slides?.[0]?.imagen || "";
    document.getElementById("lock-bg").style.backgroundImage = coverImg ? `url("${coverImg}")` : "none";

    const formattedDate = new Date(targetTime).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
    document.getElementById("lock-date-label").textContent = `Apertura programada: ${formattedDate}`;

    const updateTick = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        clearInterval(state.lockTimer);
        if (!prefersReducedMotion && typeof gsap !== "undefined") {
          gsap.to(lockEl, {
            opacity: 0,
            duration: 0.9,
            ease: "power2.out",
            onComplete: () => {
              lockEl.classList.remove("is-active");
              lockEl.style.opacity = "";
            }
          });
        } else {
          lockEl.classList.remove("is-active");
        }
        return;
      }
      const pad = n => String(Math.max(0, n)).padStart(2, "0");
      document.getElementById("cd-days").textContent = pad(Math.floor(diff / 86400000));
      document.getElementById("cd-hours").textContent = pad(Math.floor((diff % 86400000) / 3600000));
      document.getElementById("cd-mins").textContent = pad(Math.floor((diff % 3600000) / 60000));
      document.getElementById("cd-secs").textContent = pad(Math.floor((diff % 60000) / 1000));
    };

    updateTick();
    lockEl.classList.add("is-active");
    state.lockTimer = setInterval(updateTick, 1000);
  }

  function updateChrome() {
    const total = state.book.slides.length || 1;
    const pad = n => String(n).padStart(2, "0");
    counterEl.textContent = `${pad(state.currentIndex + 1)} / ${pad(total)}`;

    const pct = total > 1 ? (state.currentIndex / (total - 1)) * 100 : 100;
    progressFillEl.style.width = `${pct}%`;
    progressTrackEl.setAttribute("aria-valuenow", Math.round(pct));

    dotsEl.querySelectorAll(".dot-btn").forEach((dot, i) => dot.classList.toggle("is-active", i === state.currentIndex));
    document.querySelectorAll(".thumb-card").forEach((card, i) => card.classList.toggle("is-active", i === state.currentIndex));
  }

  function renderAllSlides() {
    const slides = state.book.slides || [];
    if (state.currentIndex >= slides.length) state.currentIndex = Math.max(0, slides.length - 1);

    stageEl.innerHTML = slides.map((s, i) => buildSlideHTML(s, i, state.book, state.currentIndex)).join("");
    dotsEl.innerHTML = slides.map((_, i) => `
      <button class="dot-btn ${i === state.currentIndex ? "is-active" : ""}" data-goto="${i}" aria-label="Ir a diapositiva ${i + 1}"></button>
    `).join("");

    document.getElementById("index-list").innerHTML = slides.map((s, i) => `
      <button class="thumb-card ${i === state.currentIndex ? "is-active" : ""}" data-goto="${i}">
        <div class="thumb-preview">${s.imagen ? `<img src="${escapeHTML(s.imagen)}" alt="" />` : `<span>${i + 1}</span>`}</div>
        <div class="thumb-info">
          <small>${escapeHTML(s.tipo)} &middot; ${String(i + 1).padStart(2, "0")}</small>
          <strong>${escapeHTML(s.titulo || s.versiculo?.referencia || "Sin título")}</strong>
        </div>
      </button>
    `).join("");

    updateChrome();
    const all = stageEl.querySelectorAll(".slide");
    all.forEach((el, i) => {
      el.classList.toggle("is-active", i === state.currentIndex);
      el.setAttribute("aria-hidden", i !== state.currentIndex);
      if (i === state.currentIndex) {
        gsap.set(el, { opacity: 1, visibility: "visible" });
        animateSlideContent(el, slides[i], prefersReducedMotion);
      } else {
        gsap.set(el, { opacity: 0, visibility: "hidden" });
      }
    });
    preloadImages(slides);
  }

  function goToSlide(nextIdx) {
    const total = state.book?.slides?.length || 0;
    if (total === 0 || nextIdx < 0 || nextIdx >= total || nextIdx === state.currentIndex || state.isTransitioning) return;

    const prevIdx = state.currentIndex;
    const prevEl = stageEl.querySelector(`.slide[data-index="${prevIdx}"]`);
    const nextEl = stageEl.querySelector(`.slide[data-index="${nextIdx}"]`);
    const direction = nextIdx > prevIdx ? 1 : -1;

    state.currentIndex = nextIdx;
    updateChrome();

    if (prefersReducedMotion || typeof gsap === "undefined") {
      prevEl.classList.remove("is-active");
      prevEl.setAttribute("aria-hidden", "true");
      nextEl.classList.add("is-active");
      nextEl.setAttribute("aria-hidden", "false");
      gsap.set(nextEl, { opacity: 1, visibility: "visible" });
      return;
    }

    state.isTransitioning = true;
    nextEl.scrollTop = 0;
    nextEl.classList.add("is-active");
    nextEl.setAttribute("aria-hidden", "false");

    const tl = gsap.timeline({
      onComplete: () => {
        prevEl.classList.remove("is-active");
        prevEl.setAttribute("aria-hidden", "true");
        gsap.set(prevEl, { clearProps: "transform" });
        state.isTransitioning = false;
      }
    });

    tl.to(prevEl, { opacity: 0, y: -18 * direction, duration: 0.72, ease: "power2.inOut" }, 0);
    tl.fromTo(nextEl, { opacity: 0, visibility: "visible", y: 22 * direction }, { opacity: 1, y: 0, duration: 0.92, ease: "power3.out", clearProps: "transform" }, 0.14);
    animateSlideContent(nextEl, state.book.slides[nextIdx], prefersReducedMotion);
  }

  const nextSlide = () => { if (state.currentIndex < state.book.slides.length - 1) goToSlide(state.currentIndex + 1); };
  const prevSlide = () => { if (state.currentIndex > 0) goToSlide(state.currentIndex - 1); };

  async function loadBook(key) {
    const entry = state.catalog.find(b => b.key === key) || state.catalog[0];
    if (!entry) return;
    const res = await fetch(entry.archivo);
    state.book = await res.json();
    state.currentBookKey = entry.key;
    state.currentIndex = 0;

    document.getElementById("book-current-label").textContent = state.book.libro || entry.titulo;
    document.querySelectorAll("[data-book]").forEach(el => {
      const isSel = el.dataset.book === entry.key;
      el.classList.toggle("is-selected", isSel);
      el.setAttribute("aria-selected", String(isSel));
    });

    if (state.book.tema?.modo) setTheme(state.book.tema.modo);
    renderAllSlides();
    checkLockState();
  }

  function renderBookMenu() {
    const menu = document.getElementById("book-dropdown-menu");
    menu.innerHTML = state.catalog.map(b => `
      <button class="dropdown-item ${b.key === state.currentBookKey ? "is-selected" : ""}" role="option" aria-selected="${b.key === state.currentBookKey}" data-book="${escapeHTML(b.key)}">
        <div>
          <span class="dropdown-item-title">${escapeHTML(b.titulo)}</span>
          <span class="dropdown-item-sub">${b.slides} diapositivas &middot; ${escapeHTML(b.version)}</span>
        </div>
        <svg class="dropdown-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    `).join("");

    menu.querySelectorAll("[data-book]").forEach(btn => {
      btn.addEventListener("click", () => {
        loadBook(btn.dataset.book);
        closeAllDropdowns();
      });
    });
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const requestedBook = params.get("libro") || "oseas";

    try {
      const catRes = await fetch("data/libros.json");
      state.catalog = await catRes.json();
      renderBookMenu();
      await loadBook(requestedBook);
    } catch (err) {
      stageEl.innerHTML = `<div style="margin:auto;text-align:center;padding:2rem;"><h2>No se pudo cargar el contenido</h2><p style="opacity:0.7;margin-top:0.5rem;">Abre este sitio mediante un servidor web o GitHub Pages.</p></div>`;
    }

    document.getElementById("btn-prev").addEventListener("click", prevSlide);
    document.getElementById("btn-next").addEventListener("click", nextSlide);
    document.getElementById("btn-fullscreen").addEventListener("click", () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    });

    document.getElementById("btn-index").addEventListener("click", () => {
      closeAllDropdowns();
      indexDrawer.classList.add("is-open");
      drawerBackdropEl.classList.add("is-open");
      indexDrawer.setAttribute("aria-hidden", "false");
    });
    document.getElementById("btn-close-index").addEventListener("click", closeDrawers);
    drawerBackdropEl.addEventListener("click", closeDrawers);

    document.querySelectorAll(".dropdown-trigger").forEach(trigger => {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const dd = trigger.closest(".dropdown");
        const wasOpen = dd.classList.contains("is-open");
        closeAllDropdowns();
        if (!wasOpen) {
          dd.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.querySelectorAll("[data-theme-choice]").forEach(item => {
      item.addEventListener("click", () => {
        setTheme(item.dataset.themeChoice);
        closeAllDropdowns();
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) closeAllDropdowns();
      const gotoBtn = e.target.closest("[data-goto]");
      if (gotoBtn) {
        goToSlide(Number(gotoBtn.dataset.goto));
        if (indexDrawer.classList.contains("is-open")) closeDrawers();
      }
      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        if (actionBtn.dataset.action === "next-slide") nextSlide();
        if (actionBtn.dataset.action === "restart") goToSlide(0);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextSlide(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevSlide(); }
      else if (e.key === "Home") goToSlide(0);
      else if (e.key === "End") goToSlide(state.book.slides.length - 1);
      else if (e.key.toLowerCase() === "f") document.getElementById("btn-fullscreen").click();
      else if (e.key === "Escape") { closeDrawers(); closeAllDropdowns(); }
    });

    let lastWheel = 0;
    stageEl.addEventListener("wheel", (e) => {
      const activeSlide = stageEl.querySelector(".slide.is-active");
      if (activeSlide && activeSlide.scrollHeight > activeSlide.clientHeight + 10) {
        const atTop = activeSlide.scrollTop <= 2;
        const atBottom = activeSlide.scrollTop + activeSlide.clientHeight >= activeSlide.scrollHeight - 2;
        if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
      }
      const now = Date.now();
      if (now - lastWheel < 850 || Math.abs(e.deltaY) < 18) return;
      lastWheel = now;
      if (e.deltaY > 0) nextSlide();
      else prevSlide();
    }, { passive: true });

    let touchStartX = 0, touchStartY = 0;
    stageEl.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    stageEl.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) nextSlide();
        else prevSlide();
      }
    }, { passive: true });
  }

  init();
})();

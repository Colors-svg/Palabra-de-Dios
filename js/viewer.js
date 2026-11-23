/* ==========================================================================
   PALABRA VISUAL — VISOR PÚBLICO INDEPENDIENTE (viewer.js)
   - Sin selector de libros (cada lectura tiene su propia subpágina/URL)
   - Scroll vertical fluido en móvil (<= 860px) y slides cinematográficos en escritorio
   - Ventana modal desplegable al pulsar recuadros con información ampliada
   ========================================================================== */
(function () {
  const { ICONS, escapeHTML, buildSlideHTML, animateSlideContent, preloadImages } = window.PalabraRenderer;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THEMES = ["oscuro", "claro", "sepia"];
  const THEME_NAMES = { oscuro: "Noche", claro: "Amanecer", sepia: "Pergamino" };

  const state = {
    book: null,
    currentBookKey: "oseas",
    currentIndex: 0,
    isTransitioning: false,
    theme: "oscuro",
    lockTimer: null,
    observer: null
  };

  const isMobileScroll = () => window.innerWidth <= 860;

  const stageEl = document.getElementById("slides-stage");
  const counterEl = document.getElementById("slide-counter");
  const dotsEl = document.getElementById("dots-nav");
  const progressFillEl = document.getElementById("progress-fill");
  const progressTrackEl = document.getElementById("progress-track");
  const indexDrawer = document.getElementById("index-drawer");
  const drawerBackdropEl = document.getElementById("drawer-backdrop");
  const detailBackdropEl = document.getElementById("detail-modal-backdrop");

  function setTheme(themeName) {
    state.theme = THEMES.includes(themeName) ? themeName : "oscuro";
    document.documentElement.setAttribute("data-theme", state.theme);
    const lbl = document.getElementById("theme-label");
    if (lbl) lbl.textContent = THEME_NAMES[state.theme];
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

  function openDetailModal(slideIdx, recIdx) {
    const item = state.book?.slides?.[slideIdx]?.recuadros?.[recIdx];
    if (!item || !detailBackdropEl) return;
    document.getElementById("detail-modal-icon").innerHTML = ICONS[item.icono] || ICONS.luz;
    document.getElementById("detail-modal-title").textContent = item.titulo || "";
    document.getElementById("detail-modal-body").textContent = item.detalle || item.texto || "";
    detailBackdropEl.classList.add("is-open");
    detailBackdropEl.setAttribute("aria-hidden", "false");
  }

  function closeDetailModal() {
    if (!detailBackdropEl) return;
    detailBackdropEl.classList.remove("is-open");
    detailBackdropEl.setAttribute("aria-hidden", "true");
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
    if (counterEl) counterEl.textContent = `${pad(state.currentIndex + 1)} / ${pad(total)}`;

    const pct = total > 1 ? (state.currentIndex / (total - 1)) * 100 : 100;
    progressFillEl.style.width = `${pct}%`;
    progressTrackEl.setAttribute("aria-valuenow", Math.round(pct));

    dotsEl.querySelectorAll(".dot-btn").forEach((dot, i) => dot.classList.toggle("is-active", i === state.currentIndex));
    document.querySelectorAll(".thumb-card").forEach((card, i) => card.classList.toggle("is-active", i === state.currentIndex));
  }

  function setupMobileScrollObserver() {
    if (state.observer) state.observer.disconnect();
    if (!isMobileScroll()) return;

    state.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.dataset.index);
          if (!Number.isNaN(idx) && idx !== state.currentIndex) {
            state.currentIndex = idx;
            updateChrome();
          }
        }
      });
    }, { root: stageEl, threshold: 0.45 });

    stageEl.querySelectorAll(".slide").forEach(el => state.observer.observe(el));
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
      if (isMobileScroll()) {
        el.classList.add("is-active");
        el.setAttribute("aria-hidden", "false");
        gsap.set(el, { clearProps: "opacity,visibility,transform" });
      } else {
        el.classList.toggle("is-active", i === state.currentIndex);
        el.setAttribute("aria-hidden", i !== state.currentIndex);
        if (i === state.currentIndex) {
          gsap.set(el, { opacity: 1, visibility: "visible" });
          animateSlideContent(el, slides[i], prefersReducedMotion);
        } else {
          gsap.set(el, { opacity: 0, visibility: "hidden" });
        }
      }
    });
    setupMobileScrollObserver();
    preloadImages(slides);
  }

  function goToSlide(nextIdx) {
    const total = state.book?.slides?.length || 0;
    if (total === 0 || nextIdx < 0 || nextIdx >= total) return;

    const nextEl = stageEl.querySelector(`.slide[data-index="${nextIdx}"]`);
    if (isMobileScroll()) {
      state.currentIndex = nextIdx;
      updateChrome();
      nextEl?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      return;
    }

    if (nextIdx === state.currentIndex || state.isTransitioning) return;

    const prevIdx = state.currentIndex;
    const prevEl = stageEl.querySelector(`.slide[data-index="${prevIdx}"]`);
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

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const key = (window.PALABRA_BOOK || params.get("libro") || "oseas").toLowerCase().replace(/[^a-z0-9-_]/g, "");
    state.currentBookKey = key;

    try {
      const res = await fetch(`data/${key}.json`);
      if (!res.ok) throw new Error("Libro no encontrado");
      state.book = await res.json();
      const labelEl = document.getElementById("book-current-label");
      if (labelEl) labelEl.textContent = state.book.libro || key;
      document.title = `${state.book.libro || key} — Palabra Visual`;
      if (state.book.tema?.modo) setTheme(state.book.tema.modo);
      renderAllSlides();
      checkLockState();
    } catch {
      stageEl.innerHTML = `<div style="margin:auto;text-align:center;padding:2rem;"><h2>No se pudo cargar la lectura</h2><p style="opacity:0.7;margin-top:0.5rem;">Verifica que exista <code>data/${escapeHTML(key)}.json</code>.</p></div>`;
    }

    document.getElementById("btn-prev")?.addEventListener("click", prevSlide);
    document.getElementById("btn-next")?.addEventListener("click", nextSlide);
    document.getElementById("btn-fullscreen")?.addEventListener("click", () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    });

    // Deslizadera interactiva Español <-> Original (Hebreo / Griego)
    let activeCompare = null;
    const updateCompareSplit = (el, clientX) => {
      const rect = el.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      el.style.setProperty("--split", `${pct.toFixed(1)}%`);
      el.querySelector(".compare-handle")?.setAttribute("aria-valuenow", Math.round(pct));
    };
    stageEl.addEventListener("pointerdown", (e) => {
      const comp = e.target.closest(".lexicon-compare");
      if (!comp) return;
      activeCompare = comp;
      comp.setPointerCapture?.(e.pointerId);
      updateCompareSplit(comp, e.clientX);
    });
    stageEl.addEventListener("pointermove", (e) => {
      if (activeCompare) updateCompareSplit(activeCompare, e.clientX);
    });
    stageEl.addEventListener("pointerup", () => { activeCompare = null; });
    stageEl.addEventListener("pointercancel", () => { activeCompare = null; });

    document.getElementById("btn-index").addEventListener("click", () => {
      closeAllDropdowns();
      indexDrawer.classList.add("is-open");
      drawerBackdropEl.classList.add("is-open");
      indexDrawer.setAttribute("aria-hidden", "false");
    });
    document.getElementById("btn-close-index").addEventListener("click", closeDrawers);
    drawerBackdropEl.addEventListener("click", closeDrawers);

    document.getElementById("detail-modal-close")?.addEventListener("click", closeDetailModal);
    detailBackdropEl?.addEventListener("click", (e) => {
      if (e.target === detailBackdropEl) closeDetailModal();
    });

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

      const detailCard = e.target.closest("[data-detail-slide]");
      if (detailCard) {
        openDetailModal(Number(detailCard.dataset.detailSlide), Number(detailCard.dataset.detailRec));
        return;
      }

      const gotoBtn = e.target.closest("[data-goto]");
      if (gotoBtn) {
        goToSlide(Number(gotoBtn.dataset.goto));
        if (indexDrawer.classList.contains("is-open")) closeDrawers();
        return;
      }

      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        if (actionBtn.dataset.action === "next-slide") nextSlide();
        if (actionBtn.dataset.action === "restart") goToSlide(0);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDetailModal(); closeDrawers(); closeAllDropdowns(); return; }
      if (detailBackdropEl?.classList.contains("is-open")) return;

      const activeDetail = document.activeElement?.closest("[data-detail-slide]");
      if (activeDetail && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openDetailModal(Number(activeDetail.dataset.detailSlide), Number(activeDetail.dataset.detailRec));
        return;
      }

      if (isMobileScroll()) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextSlide(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevSlide(); }
      else if (e.key === "Home") goToSlide(0);
      else if (e.key === "End") goToSlide(state.book.slides.length - 1);
      else if (e.key.toLowerCase() === "f") document.getElementById("btn-fullscreen").click();
    });

    let lastWheel = 0;
    stageEl.addEventListener("wheel", (e) => {
      if (isMobileScroll()) return;
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

    window.addEventListener("resize", () => {
      if (state.book) renderAllSlides();
    });
  }

  init();
})();

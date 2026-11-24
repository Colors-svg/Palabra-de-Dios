/* ==========================================================================
   PALABRA VISUAL — ESTUDIO DE EDICIÓN (admin.js)
   ========================================================================== */
(function () {
  const { ICONS, escapeHTML, buildSlideHTML } = window.PalabraRenderer;

  const state = {
    catalog: [],
    currentKey: "oseas",
    book: null,
    currentIndex: 0,
    dragMode: "image", // "image" | "text"
    frameMode: "desktop" // "desktop" | "mobile"
  };

  const stageEl = document.getElementById("studio-stage");
  const deviceFrameEl = document.getElementById("device-frame");
  const deckListEl = document.getElementById("deck-list");
  const toastEl = document.getElementById("toast");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  }

  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode || "oscuro");
  }

  function renderCanvasSlide() {
    if (!state.book || !state.book.slides.length) return;
    const slide = state.book.slides[state.currentIndex];
    stageEl.innerHTML = buildSlideHTML(slide, state.currentIndex, state.book, state.currentIndex);
    const slideEl = stageEl.querySelector(".slide");
    if (slideEl) {
      slideEl.classList.add("is-active");
      slideEl.style.opacity = "1";
      slideEl.style.visibility = "visible";
    }
    document.getElementById("canvas-slide-label").textContent =
      `Diapositiva ${state.currentIndex + 1} de ${state.book.slides.length} · ${slide.tipo}`;
  }

  function renderDeck() {
    const slides = state.book.slides || [];
    deckListEl.innerHTML = slides.map((s, i) => `
      <button class="deck-item ${i === state.currentIndex ? "is-active" : ""}" data-idx="${i}" draggable="true">
        <div class="deck-thumb">${s.imagen ? `<img src="${escapeHTML(s.imagen)}" alt="" />` : `<span>${i + 1}</span>`}</div>
        <div class="deck-meta">
          <small>${escapeHTML(s.tipo)} &middot; ${String(i + 1).padStart(2, "0")}</small>
          <strong>${escapeHTML(s.titulo || s.versiculo?.referencia || "Sin título")}</strong>
        </div>
      </button>
    `).join("");

    let dragSrc = null;
    deckListEl.querySelectorAll(".deck-item").forEach(item => {
      item.addEventListener("click", () => {
        state.currentIndex = Number(item.dataset.idx);
        renderDeck();
        renderCanvasSlide();
        syncInspector();
      });
      item.addEventListener("dragstart", (e) => {
        dragSrc = Number(item.dataset.idx);
        item.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragover", (e) => { e.preventDefault(); item.classList.add("drag-over"); });
      item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const target = Number(item.dataset.idx);
        if (dragSrc === null || dragSrc === target) return;
        const [moved] = state.book.slides.splice(dragSrc, 1);
        state.book.slides.splice(target, 0, moved);
        state.currentIndex = target;
        renderDeck();
        renderCanvasSlide();
        syncInspector();
        showToast("Orden actualizado");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("is-dragging");
        deckListEl.querySelectorAll(".deck-item").forEach(el => el.classList.remove("drag-over"));
      });
    });
  }

  function renderRecuadrosInspector(recuadros = []) {
    const list = document.getElementById("st-recuadros-list");
    if (!recuadros.length) {
      list.innerHTML = `<p style="font-size:0.76rem;color:var(--text-muted);">Sin recuadros en esta diapositiva.</p>`;
      return;
    }
    list.innerHTML = recuadros.map((r, idx) => `
      <div class="studio-card" data-rec-idx="${idx}">
        <div class="field-row">
          <select class="field-select st-rec-icon">
            ${Object.keys(ICONS).map(ic => `<option value="${ic}" ${r.icono === ic ? "selected" : ""}>${ic}</option>`).join("")}
          </select>
          <button class="btn-studio st-rec-del" type="button" style="justify-content:center;">Quitar</button>
        </div>
        <input class="field-input st-rec-title" type="text" placeholder="Título" value="${escapeHTML(r.titulo || "")}" />
        <textarea class="field-textarea st-rec-text" placeholder="Texto breve">${escapeHTML(r.texto || "")}</textarea>
        <textarea class="field-textarea st-rec-detalle" placeholder="Detalle desplegable al hacer clic (opcional)...">${escapeHTML(r.detalle || "")}</textarea>
      </div>
    `).join("");

    list.querySelectorAll("[data-rec-idx]").forEach(card => {
      const idx = Number(card.dataset.recIdx);
      const update = () => {
        const rec = state.book.slides[state.currentIndex].recuadros[idx];
        rec.icono = card.querySelector(".st-rec-icon").value;
        rec.titulo = card.querySelector(".st-rec-title").value;
        rec.texto = card.querySelector(".st-rec-text").value;
        rec.detalle = card.querySelector(".st-rec-detalle").value;
        renderCanvasSlide();
      };
      card.querySelector(".st-rec-icon").addEventListener("change", update);
      card.querySelector(".st-rec-title").addEventListener("input", update);
      card.querySelector(".st-rec-text").addEventListener("input", update);
      card.querySelector(".st-rec-detalle").addEventListener("input", update);
      card.querySelector(".st-rec-del").addEventListener("click", () => {
        state.book.slides[state.currentIndex].recuadros.splice(idx, 1);
        syncInspector();
        renderCanvasSlide();
      });
    });
  }

  function syncInspector() {
    const slide = state.book.slides[state.currentIndex];
    if (!slide) return;
    document.getElementById("st-tipo").value = slide.tipo || "reflexion";
    document.getElementById("st-layout").value = slide.layout || "centrado";
    document.getElementById("st-anim").value = slide.animacion || "fade";
    document.getElementById("st-overlay").value = slide.overlay ?? 0.55;
    document.getElementById("st-overlay-val").textContent = Number(slide.overlay ?? 0.55).toFixed(2);
    document.getElementById("st-imagen").value = slide.imagen || "";

    const enc = slide.encuadre || { x: 50, y: 50, zoom: 1 };
    document.getElementById("st-zoom").value = enc.zoom ?? 1;
    document.getElementById("st-zoom-val").textContent = Number(enc.zoom ?? 1).toFixed(2);
    document.getElementById("st-focal-readout").textContent = `${Math.round(enc.x ?? 50)}%, ${Math.round(enc.y ?? 50)}%`;

    document.getElementById("st-titulo").value = slide.titulo || "";
    document.getElementById("st-subtitulo").value = slide.subtitulo || "";
    document.getElementById("st-font-scale").value = slide.fontScale || 1;
    document.getElementById("st-font-scale-val").textContent = Number(slide.fontScale || 1).toFixed(2);
    document.getElementById("st-versiculo-texto").value = slide.versiculo?.texto || "";
    document.getElementById("st-versiculo-ref").value = slide.versiculo?.referencia || "";
    document.getElementById("st-reflexion").value = slide.reflexion || "";

    document.getElementById("st-book-title").value = state.book.libro || "";
    document.getElementById("st-book-version").value = state.book.version || "Reina-Valera 1960";
    document.getElementById("st-book-theme").value = state.book.tema?.modo || "oscuro";
    document.getElementById("st-desbloqueo").value = state.book.desbloqueo || "";
    document.getElementById("st-bloqueo-msg").value = state.book.bloqueoMensaje || "";

    renderRecuadrosInspector(slide.recuadros || []);
  }

  /* ==========================================================================
     MANIPULACIÓN DIRECTA EN EL CANVAS (ARRASTRAR IMAGEN O TEXTO)
     ========================================================================== */
  function bindCanvasDirectDrag() {
    let dragging = false;
    let startX = 0, startY = 0;
    let initValX = 50, initValY = 50;

    deviceFrameEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      const slide = state.book.slides[state.currentIndex];
      if (!slide) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      deviceFrameEl.setPointerCapture(e.pointerId);

      if (state.dragMode === "image") {
        slide.encuadre = slide.encuadre || { x: 50, y: 50, zoom: 1 };
        initValX = slide.encuadre.x ?? 50;
        initValY = slide.encuadre.y ?? 50;
      } else {
        initValX = slide.offsetX || 0;
        initValY = slide.offsetY || 0;
      }
    });

    deviceFrameEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const slide = state.book.slides[state.currentIndex];
      const rect = deviceFrameEl.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (state.dragMode === "image") {
        const pctX = Math.max(0, Math.min(100, initValX - (dx / rect.width) * 100));
        const pctY = Math.max(0, Math.min(100, initValY - (dy / rect.height) * 100));
        slide.encuadre.x = Math.round(pctX);
        slide.encuadre.y = Math.round(pctY);
        const img = stageEl.querySelector(".slide-bg-img, .split-media img");
        if (img) img.style.objectPosition = `${slide.encuadre.x}% ${slide.encuadre.y}%`;
        document.getElementById("st-focal-readout").textContent = `${slide.encuadre.x}%, ${slide.encuadre.y}%`;
      } else {
        slide.offsetX = Math.round(initValX + dx);
        slide.offsetY = Math.round(initValY + dy);
        const movable = stageEl.querySelector(".slide-content-movable");
        if (movable) {
          movable.style.setProperty("--offset-x", `${slide.offsetX}px`);
          movable.style.setProperty("--offset-y", `${slide.offsetY}px`);
        }
      }
    });

    deviceFrameEl.addEventListener("pointerup", () => { dragging = false; });
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.book.slides[state.currentIndex].imagen = reader.result;
      document.getElementById("st-imagen").value = "(Imagen cargada localmente)";
      renderCanvasSlide();
      renderDeck();
      showToast(`Imagen "${file.name}" aplicada`);
    };
    reader.readAsDataURL(file);
  }

  function bindEvents() {
    // Tabs del inspector
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("is-active", b === btn));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === `tab-${btn.dataset.tab}`));
      });
    });

    // Frame toggle (Desktop 16:9 vs Mobile 9:16)
    document.querySelectorAll("[data-frame]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.frameMode = btn.dataset.frame;
        document.querySelectorAll("[data-frame]").forEach(b => b.classList.toggle("is-active", b === btn));
        deviceFrameEl.classList.toggle("frame-desktop", state.frameMode === "desktop");
        deviceFrameEl.classList.toggle("frame-mobile", state.frameMode === "mobile");
      });
    });

    // Drag mode toggle (Imagen vs Texto)
    document.querySelectorAll("[data-drag-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.dragMode = btn.dataset.dragMode;
        document.querySelectorAll("[data-drag-mode]").forEach(b => b.classList.toggle("is-active", b === btn));
        deviceFrameEl.setAttribute("data-drag-mode", state.dragMode);
      });
    });

    document.getElementById("st-reset-pos").addEventListener("click", () => {
      const s = state.book.slides[state.currentIndex];
      s.encuadre = { x: 50, y: 50, zoom: 1 };
      s.offsetX = 0;
      s.offsetY = 0;
      syncInspector();
      renderCanvasSlide();
      showToast("Posición restablecida");
    });

    // Dropzone rápido de imágenes
    const dropzone = document.getElementById("st-dropzone");
    const fileInput = document.getElementById("st-imagen-file");
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      handleImageFile(e.dataTransfer.files?.[0]);
    });
    fileInput.addEventListener("change", (e) => handleImageFile(e.target.files?.[0]));

    // Campos reactivos
    const bind = (id, fn, refreshDeck = false) => {
      document.getElementById(id).addEventListener("input", (e) => {
        fn(e.target.value);
        renderCanvasSlide();
        if (refreshDeck) renderDeck();
      });
    };

    bind("st-tipo", v => { state.book.slides[state.currentIndex].tipo = v; }, true);
    bind("st-layout", v => { state.book.slides[state.currentIndex].layout = v; });
    bind("st-anim", v => { state.book.slides[state.currentIndex].animacion = v; });
    bind("st-overlay", v => {
      state.book.slides[state.currentIndex].overlay = parseFloat(v);
      document.getElementById("st-overlay-val").textContent = parseFloat(v).toFixed(2);
    });
    bind("st-imagen", v => { state.book.slides[state.currentIndex].imagen = v; }, true);
    bind("st-zoom", v => {
      const s = state.book.slides[state.currentIndex];
      s.encuadre = s.encuadre || { x: 50, y: 50, zoom: 1 };
      s.encuadre.zoom = parseFloat(v);
      document.getElementById("st-zoom-val").textContent = parseFloat(v).toFixed(2);
    });
    bind("st-titulo", v => { state.book.slides[state.currentIndex].titulo = v; }, true);
    bind("st-subtitulo", v => { state.book.slides[state.currentIndex].subtitulo = v; });
    bind("st-font-scale", v => {
      state.book.slides[state.currentIndex].fontScale = parseFloat(v);
      document.getElementById("st-font-scale-val").textContent = parseFloat(v).toFixed(2);
    });
    bind("st-versiculo-texto", v => {
      state.book.slides[state.currentIndex].versiculo = state.book.slides[state.currentIndex].versiculo || {};
      state.book.slides[state.currentIndex].versiculo.texto = v;
    });
    bind("st-versiculo-ref", v => {
      state.book.slides[state.currentIndex].versiculo = state.book.slides[state.currentIndex].versiculo || {};
      state.book.slides[state.currentIndex].versiculo.referencia = v;
    }, true);
    bind("st-reflexion", v => { state.book.slides[state.currentIndex].reflexion = v; });

    document.getElementById("st-add-recuadro").addEventListener("click", () => {
      const s = state.book.slides[state.currentIndex];
      s.recuadros = s.recuadros || [];
      s.recuadros.push({ icono: "luz", titulo: "Nuevo punto", texto: "Reflexión breve." });
      syncInspector();
      renderCanvasSlide();
    });

    // Propiedades del libro y desbloqueo
    document.getElementById("st-book-title").addEventListener("input", (e) => {
      state.book.libro = e.target.value;
      renderCanvasSlide();
    });
    document.getElementById("st-book-version").addEventListener("input", (e) => {
      state.book.version = e.target.value;
      renderCanvasSlide();
    });
    document.getElementById("st-book-theme").addEventListener("change", (e) => {
      state.book.tema = state.book.tema || {};
      state.book.tema.modo = e.target.value;
      setTheme(e.target.value);
    });
    document.getElementById("st-desbloqueo").addEventListener("input", (e) => {
      state.book.desbloqueo = e.target.value;
    });
    document.getElementById("st-bloqueo-msg").addEventListener("input", (e) => {
      state.book.bloqueoMensaje = e.target.value;
    });
    document.getElementById("st-clear-lock").addEventListener("click", () => {
      state.book.desbloqueo = "";
      document.getElementById("st-desbloqueo").value = "";
      showToast("Bloqueo temporal quitado");
    });

    // CRUD de diapositivas
    document.getElementById("st-add-slide").addEventListener("click", () => {
      state.book.slides.splice(state.currentIndex + 1, 0, {
        tipo: "versiculo", imagen: "", overlay: 0.55,
        titulo: "Nueva diapositiva", subtitulo: "Reflexión",
        versiculo: { texto: "Escribe aquí el versículo.", referencia: `${state.book.libro} 1:1` },
        reflexion: "", recuadros: [], animacion: "revelar-palabras", layout: "centrado"
      });
      state.currentIndex += 1;
      renderDeck();
      renderCanvasSlide();
      syncInspector();
    });

    document.getElementById("st-dup-slide").addEventListener("click", () => {
      const clone = structuredClone(state.book.slides[state.currentIndex]);
      clone.titulo = `${clone.titulo || "Copia"} (copia)`;
      state.book.slides.splice(state.currentIndex + 1, 0, clone);
      state.currentIndex += 1;
      renderDeck();
      renderCanvasSlide();
      syncInspector();
    });

    document.getElementById("st-del-slide").addEventListener("click", () => {
      if (state.book.slides.length <= 1) return showToast("Debe haber al menos 1 diapositiva");
      state.book.slides.splice(state.currentIndex, 1);
      state.currentIndex = Math.max(0, state.currentIndex - 1);
      renderDeck();
      renderCanvasSlide();
      syncInspector();
    });

    // Selector de libro
    document.getElementById("st-book-select").addEventListener("change", (e) => loadBook(e.target.value));

    // Exportar / Importar / Abrir Visor
    document.getElementById("st-export-json").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.book, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.currentKey || "libro"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Descargado ${state.currentKey}.json (súbelo a data/)`);
    });

    document.getElementById("st-import-btn").addEventListener("click", () => {
      document.getElementById("st-import-file").click();
    });
    document.getElementById("st-import-file").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed.slides)) throw new Error();
          state.book = parsed;
          state.currentIndex = 0;
          setTheme(state.book.tema?.modo || "oscuro");
          renderDeck();
          renderCanvasSlide();
          syncInspector();
          showToast(`Importado "${file.name}"`);
        } catch {
          showToast("JSON inválido");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("st-open-viewer").addEventListener("click", () => {
      window.open(`${encodeURIComponent(state.currentKey)}.html`, "_blank");
    });

    bindAdminPreview();
    bindCanvasDirectDrag();
  }

  function bindAdminPreview() {
    const overlay = document.getElementById("admin-preview-overlay");
    const pvStage = document.getElementById("pv-slides-stage");
    const pvWrap = document.getElementById("admin-preview-stage");
    const pvCounter = document.getElementById("pv-counter");
    const detailBackdrop = document.getElementById("detail-modal-backdrop");
    let pvIdx = 0;

    const renderPv = () => {
      const slides = state.book?.slides || [];
      if (!slides.length) return;
      pvIdx = Math.max(0, Math.min(slides.length - 1, pvIdx));
      pvCounter.textContent = `${pvIdx + 1} / ${slides.length}`;
      pvStage.innerHTML = buildSlideHTML(slides[pvIdx], pvIdx, state.book, pvIdx);
      const slideEl = pvStage.querySelector(".slide");
      if (slideEl) {
        slideEl.classList.add("is-active");
        slideEl.style.opacity = "1";
        slideEl.style.visibility = "visible";
        window.PalabraRenderer.animateSlideContent(slideEl, slides[pvIdx], false);
      }
    };

    const openPv = () => {
      pvIdx = state.currentIndex;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      renderPv();
    };

    const closePv = () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      detailBackdrop?.classList.remove("is-open");
    };

    document.getElementById("st-preview-btn").addEventListener("click", openPv);
    document.getElementById("pv-close").addEventListener("click", closePv);
    document.getElementById("pv-prev").addEventListener("click", () => { if (pvIdx > 0) { pvIdx--; renderPv(); } });
    document.getElementById("pv-next").addEventListener("click", () => {
      if (pvIdx < state.book.slides.length - 1) { pvIdx++; renderPv(); }
    });

    document.getElementById("pv-mode-desktop").addEventListener("click", (e) => {
      e.target.classList.add("is-active");
      document.getElementById("pv-mode-mobile").classList.remove("is-active");
      pvWrap.classList.remove("is-mobile-sim");
    });
    document.getElementById("pv-mode-mobile").addEventListener("click", (e) => {
      e.target.classList.add("is-active");
      document.getElementById("pv-mode-desktop").classList.remove("is-active");
      pvWrap.classList.add("is-mobile-sim");
    });

    // Comparador y modales dentro de Vista Previa
    let pvCompare = null;
    pvStage.addEventListener("pointerdown", (e) => {
      const comp = e.target.closest(".lexicon-compare");
      if (comp) {
        pvCompare = comp;
        comp.setPointerCapture?.(e.pointerId);
        const r = comp.getBoundingClientRect();
        const pct = Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100));
        comp.style.setProperty("--split", `${pct.toFixed(1)}%`);
        return;
      }
      const det = e.target.closest("[data-detail-slide]");
      if (det) {
        const item = state.book.slides[Number(det.dataset.detailSlide)]?.recuadros?.[Number(det.dataset.detailRec)];
        if (item) {
          document.getElementById("detail-modal-icon").innerHTML = ICONS[item.icono] || ICONS.luz;
          document.getElementById("detail-modal-title").textContent = item.titulo || "";
          document.getElementById("detail-modal-body").textContent = item.detalle || item.texto || "";
          detailBackdrop.classList.add("is-open");
        }
        return;
      }
      const act = e.target.closest("[data-action]");
      if (act?.dataset.action === "next-slide" && pvIdx < state.book.slides.length - 1) { pvIdx++; renderPv(); }
      if (act?.dataset.action === "restart") { pvIdx = 0; renderPv(); }
    });
    pvStage.addEventListener("pointermove", (e) => {
      if (!pvCompare) return;
      const r = pvCompare.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100));
      pvCompare.style.setProperty("--split", `${pct.toFixed(1)}%`);
    });
    pvStage.addEventListener("pointerup", () => { pvCompare = null; });

    document.getElementById("detail-modal-close")?.addEventListener("click", () => detailBackdrop.classList.remove("is-open"));
    detailBackdrop?.addEventListener("click", (e) => { if (e.target === detailBackdrop) detailBackdrop.classList.remove("is-open"); });

    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        if (detailBackdrop.classList.contains("is-open")) detailBackdrop.classList.remove("is-open");
        else closePv();
      } else if (e.key === "ArrowRight") {
        if (pvIdx < state.book.slides.length - 1) { pvIdx++; renderPv(); }
      } else if (e.key === "ArrowLeft") {
        if (pvIdx > 0) { pvIdx--; renderPv(); }
      }
    });
  }

  async function loadBook(key) {
    const entry = state.catalog.find(b => b.key === key) || state.catalog[0];
    if (!entry) return;
    const res = await fetch(entry.archivo);
    state.book = await res.json();
    state.currentKey = entry.key;
    state.currentIndex = 0;
    setTheme(state.book.tema?.modo || "oscuro");
    renderDeck();
    renderCanvasSlide();
    syncInspector();
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("libro");
    try {
      const res = await fetch("data/libros.json");
      state.catalog = await res.json();
      const sel = document.getElementById("st-book-select");
      sel.innerHTML = state.catalog.map(b => `<option value="${escapeHTML(b.key)}">${escapeHTML(b.titulo)}</option>`).join("");
      const initialKey = (requested && state.catalog.some(b => b.key === requested)) ? requested : (state.catalog[0]?.key || "oseas");
      sel.value = initialKey;
      await loadBook(initialKey);
    } catch {
      showToast("Error cargando data/libros.json");
    }
    bindEvents();
  }

  init();
})();

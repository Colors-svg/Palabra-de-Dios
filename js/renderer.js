/* ==========================================================================
   PALABRA VISUAL — MOTOR DE RENDERIZADO COMPARTIDO (renderer.js)
   Usado tanto por index.html (visor público) como por admin.html (estudio)
   ========================================================================== */
(function (global) {
  const ICONS = {
    corazon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    ancla: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
    luz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2"/></svg>',
    camino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    agua: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
    libro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    semilla: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>'
  };

  const QUOTE_SVG = '<svg class="verse-quote-mark" viewBox="0 0 32 24" fill="currentColor" aria-hidden="true"><path d="M10.5 0C4.7 0 0 4.7 0 10.5V24h12V12H5.2c.4-3.6 3-6.4 6.5-6.9L10.5 0zm19 0C23.7 0 19 4.7 19 10.5V24h12V12h-6.8c.4-3.6 3-6.4 6.5-6.9L29.5 0z"/></svg>';

  function escapeHTML(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wrapWordsForReveal(text) {
    return escapeHTML(text)
      .split(/\s+/)
      .filter(Boolean)
      .map(w => `<span class="verse-word">${w}</span>`)
      .join(" ");
  }

  function renderVerseHTML(slide, book, variant = "typographic") {
    if (!slide.versiculo || !slide.versiculo.texto) return "";
    const isWordAnim = slide.animacion === "revelar-palabras";
    const verseContent = isWordAnim
      ? wrapWordsForReveal(slide.versiculo.texto)
      : escapeHTML(slide.versiculo.texto);
    const fontScale = slide.fontScale ? `--font-scale: ${slide.fontScale};` : "";

    return `
      <figure class="verse-block variant-${variant} anim-target" style="${fontScale}">
        ${QUOTE_SVG}
        <blockquote class="verse-text">${verseContent}</blockquote>
        <div class="verse-divider" aria-hidden="true"></div>
        <figcaption class="verse-meta">
          <span>${escapeHTML(slide.versiculo.referencia || "")}</span>
          <span class="verse-version">${escapeHTML(book.version || "")}</span>
        </figcaption>
      </figure>
    `;
  }

  function renderRecuadrosHTML(recuadros = []) {
    if (!recuadros || !recuadros.length) return "";
    return `
      <div class="recuadros-grid">
        ${recuadros.map(item => `
          <article class="recuadro-card anim-stagger">
            <div class="recuadro-icon" aria-hidden="true">${ICONS[item.icono] || ICONS.luz}</div>
            <h3 class="recuadro-title">${escapeHTML(item.titulo || "")}</h3>
            <p class="recuadro-text">${escapeHTML(item.texto || "")}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function buildSlideHTML(slide, index, book, activeIndex = 0) {
    const hasBg = Boolean(slide.imagen);
    const overlayAlpha = typeof slide.overlay === "number" ? slide.overlay : 0.55;
    const layout = slide.layout || "centrado";
    const tipo = slide.tipo || "reflexion";

    let overlayStyle = `background: rgba(var(--overlay-rgb), ${overlayAlpha});`;
    if (layout === "inferior") {
      overlayStyle = `background: linear-gradient(to top, rgba(var(--overlay-rgb), ${Math.min(0.92, overlayAlpha + 0.28)}) 0%, rgba(var(--overlay-rgb), ${overlayAlpha * 0.55}) 55%, rgba(var(--overlay-rgb), ${overlayAlpha * 0.25}) 100%);`;
    } else if (layout === "izquierda") {
      overlayStyle = `background: linear-gradient(to right, rgba(var(--overlay-rgb), ${Math.min(0.9, overlayAlpha + 0.2)}) 0%, rgba(var(--overlay-rgb), ${overlayAlpha * 0.6}) 60%, rgba(var(--overlay-rgb), ${overlayAlpha * 0.3}) 100%);`;
    }

    const enc = slide.encuadre || { x: 50, y: 50, zoom: 1 };
    const focalStyle = `object-position: ${enc.x ?? 50}% ${enc.y ?? 50}%;`;
    const zoomStyle = `--img-zoom: ${enc.zoom ?? 1};`;
    const offsetStyle = `--offset-x: ${slide.offsetX || 0}px; --offset-y: ${slide.offsetY || 0}px;`;

    const bgHTML = (hasBg && tipo !== "dividida") ? `
      <div class="slide-bg" style="${zoomStyle}">
        <img class="slide-bg-img ${hasBg ? "ken-burns" : ""}" style="${focalStyle}" src="${escapeHTML(slide.imagen)}" alt="" loading="lazy" />
      </div>
      <div class="slide-overlay" style="${overlayStyle}"></div>
    ` : "";

    let innerHTML = "";
    if (tipo === "portada") {
      innerHTML = `
        <span class="kicker anim-target">${escapeHTML(book.libro)} &middot; ${escapeHTML(book.version)}</span>
        <h1 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h1>
        ${slide.subtitulo ? `<p class="editorial-subtitle anim-target">${escapeHTML(slide.subtitulo)}</p>` : ""}
        ${slide.versiculo?.texto ? renderVerseHTML(slide, book, "glass") : ""}
        <button class="btn-editorial anim-target" data-action="next-slide">
          <span>Comenzar recorrido</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      `;
    } else if (tipo === "dividida") {
      innerHTML = `
        <div class="split-layout">
          <div class="split-media anim-target">
            <img src="${escapeHTML(slide.imagen || "")}" alt="${escapeHTML(slide.titulo || "")}" style="${focalStyle} transform: scale(${enc.zoom ?? 1});" loading="lazy" />
          </div>
          <div class="split-content">
            ${slide.subtitulo ? `<span class="kicker anim-target">${escapeHTML(slide.subtitulo)}</span>` : ""}
            ${slide.titulo ? `<h2 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h2>` : ""}
            ${renderVerseHTML(slide, book, "typographic")}
            ${slide.reflexion ? `<p class="reflexion-body anim-target">${escapeHTML(slide.reflexion)}</p>` : ""}
          </div>
        </div>
      `;
    } else if (tipo === "lista") {
      innerHTML = `
        ${slide.subtitulo ? `<span class="kicker anim-target">${escapeHTML(slide.subtitulo)}</span>` : ""}
        ${slide.titulo ? `<h2 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h2>` : ""}
        ${slide.reflexion ? `<p class="editorial-subtitle anim-target">${escapeHTML(slide.reflexion)}</p>` : ""}
        <div class="timeline-list">
          ${(slide.recuadros || []).map((item, i) => `
            <article class="timeline-item anim-stagger">
              <div class="timeline-step">0${i + 1}</div>
              <h3 class="recuadro-title">${escapeHTML(item.titulo || "")}</h3>
              <p class="recuadro-text">${escapeHTML(item.texto || "")}</p>
            </article>
          `).join("")}
        </div>
      `;
    } else if (tipo === "versiculo") {
      const variant = (layout === "izquierda" || layout === "derecha") ? "glass" : "typographic";
      innerHTML = `
        ${slide.subtitulo ? `<span class="kicker anim-target">${escapeHTML(slide.subtitulo)}</span>` : ""}
        ${renderVerseHTML(slide, book, variant)}
        ${slide.reflexion ? `<p class="reflexion-body anim-target">${escapeHTML(slide.reflexion)}</p>` : ""}
      `;
    } else if (tipo === "pregunta") {
      innerHTML = `
        <div class="glass-panel" style="max-width: 820px;">
          <span class="kicker anim-target">${escapeHTML(slide.subtitulo || "Meditación")}</span>
          <h2 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h2>
          ${renderVerseHTML(slide, book, "typographic")}
          ${slide.reflexion ? `<p class="reflexion-body anim-target" style="font-size: var(--text-lg);">${escapeHTML(slide.reflexion)}</p>` : ""}
        </div>
      `;
    } else if (tipo === "cierre") {
      innerHTML = `
        <span class="kicker anim-target">${escapeHTML(slide.subtitulo || "Oración final")}</span>
        <h2 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h2>
        ${renderVerseHTML(slide, book, "glass")}
        ${slide.reflexion ? `<p class="reflexion-body anim-target" style="margin-top: var(--space-md);">${escapeHTML(slide.reflexion)}</p>` : ""}
        <button class="btn-editorial-ghost anim-target" data-action="restart">
          <span>Volver al inicio</span>
        </button>
      `;
    } else {
      innerHTML = `
        ${slide.subtitulo ? `<span class="kicker anim-target">${escapeHTML(slide.subtitulo)}</span>` : ""}
        ${slide.titulo ? `<h2 class="editorial-title anim-target">${escapeHTML(slide.titulo)}</h2>` : ""}
        ${renderVerseHTML(slide, book, tipo === "imagen-completa" ? "glass" : "typographic")}
        ${slide.reflexion ? `<p class="reflexion-body anim-target">${escapeHTML(slide.reflexion)}</p>` : ""}
        ${renderRecuadrosHTML(slide.recuadros)}
      `;
    }

    return `
      <section
        class="slide slide-tipo-${tipo} layout-${layout} ${hasBg ? "has-bg-image" : ""}"
        data-index="${index}"
        aria-hidden="${index !== activeIndex}"
        role="region"
        aria-label="Diapositiva ${index + 1}: ${escapeHTML(slide.titulo || slide.tipo)}"
      >
        ${bgHTML}
        <div class="slide-inner">
          <div class="slide-content-movable" style="${offsetStyle}">${innerHTML}</div>
        </div>
      </section>
    `;
  }

  function animateSlideContent(slideEl, slideData, prefersReducedMotion) {
    if (prefersReducedMotion || typeof gsap === "undefined") return;
    const anim = slideData?.animacion || "fade";
    const targets = slideEl.querySelectorAll(".anim-target");
    const staggers = slideEl.querySelectorAll(".anim-stagger");
    const words = slideEl.querySelectorAll(".verse-word");

    gsap.killTweensOf([...targets, ...staggers, ...words]);

    if (targets.length) {
      const yOffset = anim === "slide-up" ? 28 : 12;
      gsap.fromTo(targets, { opacity: 0, y: yOffset }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.09, ease: "power3.out", clearProps: "transform" });
    }
    if (words.length && anim === "revelar-palabras") {
      gsap.fromTo(words, { opacity: 0.08, y: 8 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.032, ease: "power2.out", delay: 0.15, clearProps: "transform" });
    }
    if (staggers.length) {
      gsap.fromTo(staggers, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.75, stagger: 0.12, ease: "power3.out", delay: 0.25, clearProps: "transform" });
    }
  }

  function preloadImages(slides) {
    (slides || []).forEach(s => {
      if (s.imagen) {
        const img = new Image();
        img.src = s.imagen;
      }
    });
  }

  global.PalabraRenderer = {
    ICONS,
    escapeHTML,
    buildSlideHTML,
    animateSlideContent,
    preloadImages
  };
})(window);

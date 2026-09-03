(function () {
  /*
   * <hidden> — contenido oculto (soluciones, respuestas, spoilers de una demo).
   *
   * Tres modos, en el orden en que rota Ctrl+Alt+H:
   *   locked    (por defecto) → oculto y sin pistas: es lo que ve quien abre el link
   *   presenter                → oculto, pero revelable con el teclado; muestra la ayuda
   *   open                     → mecanismo desactivado, todo visible
   *
   * Atajos (siempre con Ctrl+Alt para no chocar con bespoke ni con el navegador):
   *   Ctrl+Alt+H  rota el modo y lo recuerda en este navegador (localStorage)
   *   Ctrl+Alt+S  revela/oculta los <hidden> de la diapositiva actual (modo presenter)
   *   Ctrl+Alt+A  revela/oculta todos los <hidden> del mazo (modo presenter)
   *
   * También se puede fijar el modo por URL, sin tocar el localStorage de quien abre:
   *   index.html?hidden=open      → compartir el mazo con las soluciones a la vista
   *   index.html?hidden=presenter → abrir la copia de clase ya lista para revelar
   *
   * OJO: esto oculta a la vista, no protege. El contenido sigue en el HTML y las
   * imágenes siguen siendo accesibles por su URL en /assets. Si algo no debe poder
   * verse, no lo publiques.
   */

  const MODES = ['locked', 'presenter', 'open'];
  const DEFAULT_MODE = 'locked';
  const STORE_KEY = 'ads-slides-hidden-mode';
  const ACCENT = '#fe704d';

  const MODE_LABEL = {
    locked: '🔒 Oculto (sin revelar)',
    presenter: '👁️ Modo presentador · Ctrl+Alt+S revela la diapositiva, Ctrl+Alt+A todo',
    open: '🔓 Todo visible',
  };

  /* ── Estado ──────────────────────────────────────────────────────── */
  const stored = (() => {
    try { return localStorage.getItem(STORE_KEY); } catch { return null; }
  })();
  const fromUrl = new URLSearchParams(location.search).get('hidden');

  let mode = MODES.includes(fromUrl) ? fromUrl
    : MODES.includes(stored) ? stored
      : DEFAULT_MODE;

  const persist = () => {
    try { localStorage.setItem(STORE_KEY, mode); } catch { /* modo privado */ }
  };

  /* ── Estilos ─────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    hidden {
      display: block;
      position: relative;
      width: fit-content;
      max-width: 100%;
    }
    hidden > :not(.hidden-veil) {
      transition: filter 0.35s ease, opacity 0.35s ease;
    }
    hidden[data-state="hidden"] > :not(.hidden-veil) {
      filter: blur(24px) saturate(0.25);
      opacity: 0.45;
      pointer-events: none;
      user-select: none;
    }
    .hidden-veil {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4em;
      text-align: center;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      color: ${ACCENT};
      text-shadow: 0 0 0.6em #181818, 0 0 0.3em #181818;
      pointer-events: none;
      z-index: 10;
    }
    hidden[data-state="hidden"] > .hidden-veil { display: flex; }
    .hidden-veil-icon { font-size: 2.2rem; line-height: 1; }
    .hidden-veil-hint {
      font-size: 0.7rem;
      background: #181818e6;
      border: 1px solid ${ACCENT}55;
      border-radius: 0.4rem;
      padding: 0.2em 0.7em;
    }
    #hidden-toast {
      position: fixed;
      left: 50%;
      bottom: 1.5rem;
      transform: translateX(-50%) translateY(0.6rem);
      background: #181818f2;
      color: ${ACCENT};
      border: 1px solid ${ACCENT}66;
      border-radius: 0.5rem;
      padding: 0.55rem 1.1rem;
      font-family: "Outfit", sans-serif;
      font-size: 0.85rem;
      letter-spacing: 0.03em;
      z-index: 10001;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #hidden-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);

  /* ── Velos ───────────────────────────────────────────────────────── */
  const blocks = [...document.querySelectorAll('hidden')];

  blocks.forEach(block => {
    const veil = document.createElement('div');
    veil.className = 'hidden-veil';
    veil.innerHTML = `
      <span class="hidden-veil-icon">🔒</span>
      <span class="hidden-veil-label"></span>
      <span class="hidden-veil-hint">Ctrl+Alt+S</span>
    `;
    veil.querySelector('.hidden-veil-label').textContent =
      block.getAttribute('label') || 'Contenido oculto';
    block.appendChild(veil);
  });

  /* ── Aplicar modo ────────────────────────────────────────────────── */
  const apply = () => {
    document.documentElement.dataset.hiddenMode = mode;
    blocks.forEach(block => {
      block.dataset.state = mode === 'open' ? 'shown' : 'hidden';
      block.querySelector('.hidden-veil-hint').style.display =
        mode === 'presenter' ? '' : 'none';
    });
  };

  /* ── Toast ───────────────────────────────────────────────────────── */
  const toast = document.createElement('div');
  toast.id = 'hidden-toast';
  document.body.appendChild(toast);
  let toastTimer;

  const notify = (text) => {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ── Revelar / ocultar ───────────────────────────────────────────── */
  const activeSection = () => {
    const active = document.querySelector('.bespoke-marp-active');
    if (!active) return document.body;
    return active.matches('section') ? active
      : active.querySelector('section') || active.closest('section') || active;
  };

  const toggle = (targets) => {
    if (mode !== 'presenter' || !targets.length) return;
    const anyHidden = targets.some(b => b.dataset.state === 'hidden');
    targets.forEach(b => { b.dataset.state = anyHidden ? 'shown' : 'hidden'; });
  };

  /* ── Teclado ─────────────────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return;

    if (e.code === 'KeyH') {
      e.preventDefault();
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      persist();
      apply();
      notify(MODE_LABEL[mode]);
      return;
    }

    if (mode !== 'presenter') return;

    if (e.code === 'KeyS') {
      e.preventDefault();
      toggle([...activeSection().querySelectorAll('hidden')]);
    } else if (e.code === 'KeyA') {
      e.preventDefault();
      toggle(blocks);
    }
  });

  apply();
})();

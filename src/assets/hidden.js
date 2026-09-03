(function () {
  /*
   * <hidden> — contenido oculto (soluciones de un ejercicio, spoilers de una demo).
   *
   * Qué decide si un bloque se ve, en orden de precedencia:
   *
   *   1. El atributo del bloque, en el Markdown:
   *        <hidden reveal="always">  siempre visible (lo republicas y ya está)
   *        <hidden reveal="key">     cualquiera lo revela con Ctrl+Alt+S; el velo lo dice
   *        <hidden>                  oculto: solo lo revela quien haya desbloqueado
   *   2. El atributo del <script> del mazo:
   *        <script src="../assets/hidden.js" data-mode="open"></script>
   *      deja visible TODO el mazo sin tocar cada bloque.
   *   3. El desbloqueo del presentador: teclear la frase secreta (ver SECRET) en
   *      cualquier momento. Queda guardado en el localStorage de ESE navegador, así
   *      que no viaja en el link ni se puede reenviar. Se teclea otra vez para salir.
   *
   * Con el desbloqueo activo:
   *   Ctrl+Alt+S   revela/oculta los <hidden> de la diapositiva actual
   *   Ctrl+Alt+A   revela/oculta todos los del mazo
   *   clic         sobre un bloque oculto, lo revela
   *
   * La frase secreta no está en claro: SECRET guarda solo su longitud y un hash.
   * Para cambiarla:  pnpm hidden:secret "tu nueva frase"  y pega la línea que imprime.
   *
   * OJO: esto oculta a la vista, no protege. El contenido sigue en el HTML publicado
   * y las imágenes siguen siendo accesibles por su URL en /assets. Si algo no debe
   * poder verse, no lo publiques.
   */

  // Frase por defecto: "clase". Cámbiala con: pnpm hidden:secret "tu frase"
  // (evita las teclas que usa bespoke: p abre la vista de presentador, f pantalla completa)
  const SECRET = { len: 5, hash: '1fec5qh1323dvs' };

  const STORE_KEY = 'ads-slides-presenter';
  const ACCENT = '#fe704d';

  /* ── Hash (no criptográfico: solo evita que la frase se lea en el código) ── */
  const hash = (text) => {
    let a = 0x811c9dc5, b = 0x01000193;
    for (const ch of text.toLowerCase()) {
      const c = ch.codePointAt(0);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b ^ (c + 0x9e3779b9), 0x85ebca6b) >>> 0;
    }
    return a.toString(36).padStart(7, '0') + b.toString(36).padStart(7, '0');
  };

  /* ── Configuración del mazo ──────────────────────────────────────── */
  const script = document.currentScript;
  const deckOpen = !!script && script.dataset.mode === 'open';

  let unlocked = (() => {
    try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
  })();

  const persist = () => {
    try {
      if (unlocked) localStorage.setItem(STORE_KEY, '1');
      else localStorage.removeItem(STORE_KEY);
    } catch { /* modo privado */ }
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
    hidden[data-can-reveal] > .hidden-veil { pointer-events: auto; cursor: pointer; }
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
  if (!blocks.length) return;

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

  const alwaysVisible = (b) => deckOpen || b.getAttribute('reveal') === 'always';
  const canReveal = (b) => !alwaysVisible(b) && (unlocked || b.getAttribute('reveal') === 'key');

  /* ── Aplicar configuración ───────────────────────────────────────── */
  const apply = () => {
    blocks.forEach(block => {
      block.dataset.state = alwaysVisible(block) ? 'shown' : 'hidden';
      if (canReveal(block)) block.dataset.canReveal = '';
      else delete block.dataset.canReveal;
      block.querySelector('.hidden-veil-hint').style.display =
        canReveal(block) ? '' : 'none';
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
    if (!active) return document;
    return active.matches('section') ? active
      : active.querySelector('section') || active.closest('section') || active;
  };

  const toggle = (targets) => {
    const usable = targets.filter(canReveal);
    if (!usable.length) return;
    const anyHidden = usable.some(b => b.dataset.state === 'hidden');
    usable.forEach(b => { b.dataset.state = anyHidden ? 'shown' : 'hidden'; });
  };

  document.addEventListener('click', (e) => {
    const veil = e.target.closest('.hidden-veil');
    if (veil) toggle([veil.parentElement]);
  });

  /* ── Teclado ─────────────────────────────────────────────────────── */
  let buffer = '';

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
      if (e.code === 'KeyS') {
        e.preventDefault();
        toggle([...activeSection().querySelectorAll('hidden')]);
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        toggle(blocks);
      }
      return;
    }

    // Frase secreta: se teclea sin modificadores, en cualquier diapositiva
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
    buffer = (buffer + e.key).slice(-SECRET.len);
    if (buffer.length !== SECRET.len || hash(buffer) !== SECRET.hash) return;

    buffer = '';
    unlocked = !unlocked;
    persist();
    apply();
    notify(unlocked
      ? '🔓 Presentador · Ctrl+Alt+S revela la diapositiva, Ctrl+Alt+A todo'
      : '🔒 Bloqueado');
  });

  apply();
})();

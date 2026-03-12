import { useEffect } from "react";

export function useProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Não ativar proteção em desenvolvimento para evitar remoção de ferramentas/refresh loops.
      return;
    }
    // ── 1. Bloquear clique direito ──────────────────────────────────
    const blockContext = (e) => e.preventDefault();
    document.addEventListener("contextmenu", blockContext);

    // ── 2. Bloquear atalhos de teclado ──────────────────────────────
    const blockKeys = (e) => {
      const { key, ctrlKey, shiftKey, metaKey } = e;

      // F12 → DevTools
      if (key === "F12") { e.preventDefault(); return; }

      // Ctrl+Shift+I → Inspect / DevTools
      if ((ctrlKey || metaKey) && shiftKey && (key === "I" || key === "i")) {
        e.preventDefault(); return;
      }
      // Ctrl+Shift+J → Console
      if ((ctrlKey || metaKey) && shiftKey && (key === "J" || key === "j")) {
        e.preventDefault(); return;
      }
      // Ctrl+Shift+C → Element picker
      if ((ctrlKey || metaKey) && shiftKey && (key === "C" || key === "c")) {
        e.preventDefault(); return;
      }
      // Ctrl+U → Ver código fonte
      if ((ctrlKey || metaKey) && (key === "u" || key === "U")) {
        e.preventDefault(); return;
      }
      // Ctrl+S → Salvar página
      if ((ctrlKey || metaKey) && (key === "s" || key === "S")) {
        e.preventDefault(); return;
      }
      // Ctrl+A → Selecionar tudo (evita copiar HTML)
      if ((ctrlKey || metaKey) && (key === "a" || key === "A")) {
        e.preventDefault(); return;
      }
      // Ctrl+P → Imprimir (evita salvar como PDF)
      if ((ctrlKey || metaKey) && (key === "p" || key === "P")) {
        e.preventDefault(); return;
      }
    };
    document.addEventListener("keydown", blockKeys);

    // ── 3. Bloquear seleção de texto ────────────────────────────────
    document.onselectstart = () => false;

    // ── 4. Silenciar console ────────────────────────────────────────
    const noop = () => {};
    const originals = {};
    ["log", "debug", "info", "warn", "error", "table", "dir", "trace"].forEach((m) => {
      originals[m] = console[m];
      try { console[m] = noop; } catch (_) {}
    });

    // ── 5. Detecção de DevTools — desativada (causa falsos positivos no Chrome/Windows)
    const detectDevTools = null;

    // ── 6. Anti-debugger contínuo ───────────────────────────────────
    //    Quando o DevTools está aberto e usa breakpoints, o debugger
    //    statement para a execução aqui, tornando o site inutilizável
    //    para quem tenta inspecionar em tempo real
    function antiDebug() {
      // eslint-disable-next-line no-debugger
      (function () { return false; }
        ["constructor"]("debugger")
        ["call"]()
      );
    }
    const debugInterval = setInterval(antiDebug, 3000);

    // ── 7. Bloquear drag (arrastar elementos para copiar) ───────────
    const blockDrag = (e) => e.preventDefault();
    document.addEventListener("dragstart", blockDrag);

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("dragstart", blockDrag);
      document.onselectstart = null;
      if (detectDevTools) clearInterval(detectDevTools);
      clearInterval(debugInterval);
      // Restaura console apenas em dev
      if (process.env.NODE_ENV === "development") {
        Object.entries(originals).forEach(([m, fn]) => { console[m] = fn; });
      }
    };
  }, []);
}

// Run before rendering the page to avoid flashing the wrong theme.
(() => {
  const storageKey = "calculator-theme-mode";
  const validModes = ["auto", "light", "dark"];
  let mode = "auto";
  try {
    const saved = localStorage.getItem(storageKey);
    if (validModes.includes(saved)) mode = saved;
  } catch { /* Theme switching still works when browser storage is unavailable. */ }

  function apply() {
    const hour = new Date().getHours();
    const theme = mode === "auto" ? (hour >= 7 && hour < 19 ? "light" : "dark") : mode;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#191d23" : "#f5f3ed");
  }

  window.CALCULATOR_THEME = {
    get mode() { return mode; },
    setMode(value) {
      if (!validModes.includes(value)) return;
      mode = value;
      try { localStorage.setItem(storageKey, mode); } catch { /* Optional preference persistence. */ }
      apply();
    },
  };
  apply();
  function schedule() {
    // Align checks to the next clock minute, including the 07:00/19:00 boundary.
    setTimeout(() => { apply(); schedule(); }, 60000 - (Date.now() % 60000));
  }
  schedule();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });
  window.addEventListener("focus", apply);
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      mode = validModes.includes(event.newValue) ? event.newValue : "auto";
      apply();
      const select = document.querySelector("#theme-mode");
      if (select) select.value = mode;
    }
  });
})();

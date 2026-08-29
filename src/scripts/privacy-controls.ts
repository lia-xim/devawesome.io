export {};

const analyticsStatus = document.querySelector<HTMLElement>("[data-analytics-status]");
const disable = document.querySelector<HTMLButtonElement>("[data-analytics-disable]");
const enable = document.querySelector<HTMLButtonElement>("[data-analytics-enable]");

if (analyticsStatus && disable && enable) {
  const render = () => {
    const disabled = localStorage.getItem("umami.disabled") === "1";
    analyticsStatus.textContent = disabled
      ? "Analytics ist in diesem Browser deaktiviert."
      : "Analytics ist aktiv, sofern Ihr Browser kein Do-Not-Track-Signal sendet.";
    disable.hidden = disabled;
    enable.hidden = !disabled;
  };

  disable.addEventListener("click", () => {
    localStorage.setItem("umami.disabled", "1");
    render();
  });

  enable.addEventListener("click", () => {
    localStorage.removeItem("umami.disabled");
    render();
  });

  render();
}

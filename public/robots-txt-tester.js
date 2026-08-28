import { resolveRobotsPath, testRobots } from "./workbench-core.js";

const examples = {
  blocked: { agent: "Googlebot", target: "https://example.com/preview/article?draft=1" },
  allowed: { agent: "Bingbot", target: "https://example.com/private/public-page" },
};

for (const root of document.querySelectorAll("[data-robots-tester]")) {
  const input = root.querySelector("[data-robots-input]");
  const agentSelect = root.querySelector("[data-robots-agent]");
  const customWrap = root.querySelector("[data-robots-custom-wrap]");
  const customAgent = root.querySelector("[data-robots-custom]");
  const target = root.querySelector("[data-robots-path]");
  const verdict = root.querySelector("[data-robots-verdict]");
  const explanation = root.querySelector("[data-robots-explanation]");
  const testedPath = root.querySelector("[data-robots-tested-path]");
  const group = root.querySelector("[data-robots-group]");
  const rule = root.querySelector("[data-robots-rule]");
  const button = root.querySelector("[data-robots-test]");
  const clear = root.querySelector("[data-robots-clear]");
  const exampleButtons = [...root.querySelectorAll("[data-robots-example]")];
  if (!input || !agentSelect || !customWrap || !customAgent || !target || !verdict || !explanation || !testedPath || !group || !rule || !button || !clear) continue;

  const selectedAgent = () => agentSelect.value === "custom" ? customAgent.value.trim() || "*" : agentSelect.value;
  const updateCustom = () => { customWrap.hidden = agentSelect.value !== "custom"; };
  const run = () => {
    try {
      const path = resolveRobotsPath(target.value);
      const agent = selectedAgent();
      const result = testRobots(input.value, agent, path);
      verdict.textContent = result.allowed ? "Allowed by robots.txt" : "Blocked by robots.txt";
      verdict.dataset.state = result.allowed ? "valid" : "error";
      explanation.textContent = result.rule === "No matching rule"
        ? `${agent} has no matching rule for ${path}, so crawling is allowed by default.`
        : `${agent} matches ${result.rule}. It is the longest applicable rule for ${path}.`;
      testedPath.textContent = path;
      group.textContent = result.group;
      rule.textContent = result.rule;
    } catch {
      verdict.textContent = "Check the URL or path";
      verdict.dataset.state = "error";
      explanation.textContent = "Enter a valid HTTP(S) URL or a path that starts with /.";
      testedPath.textContent = "—"; group.textContent = "—"; rule.textContent = "—";
    }
  };
  button.addEventListener("click", run);
  agentSelect.addEventListener("change", () => { updateCustom(); run(); });
  customAgent.addEventListener("input", run);
  target.addEventListener("input", run);
  input.addEventListener("input", run);
  for (const exampleButton of exampleButtons) exampleButton.addEventListener("click", () => {
    const example = examples[exampleButton.dataset.robotsExample];
    agentSelect.value = example.agent;
    target.value = example.target;
    updateCustom();
    run();
  });
  clear.addEventListener("click", () => {
    input.value = "";
    verdict.textContent = "Paste robots.txt rules";
    explanation.textContent = "The tester does not download a live file.";
    testedPath.textContent = "—"; group.textContent = "—"; rule.textContent = "—";
    input.focus();
  });
  updateCustom();
  run();
}

(function () {
  const examples = {
    blocked: { agent: "Googlebot", target: "https://example.com/preview/article?draft=1" },
    allowed: { agent: "Bingbot", target: "https://example.com/private/public-page" },
  };

  function parse(content) {
    const groups = [];
    let agents = [];
    let rules = [];
    let rulesStarted = false;
    const flush = () => {
      if (agents.length) groups.push({ agents: [...agents], rules: [...rules] });
      agents = []; rules = []; rulesStarted = false;
    };
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.replace(/\s*#.*$/, "").trim();
      if (!line) continue;
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const field = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (field === "user-agent") {
        if (rulesStarted) flush();
        agents.push(value.toLowerCase());
      } else if ((field === "allow" || field === "disallow") && agents.length) {
        rulesStarted = true;
        if (value) rules.push({ type: field, pattern: value });
      }
    }
    flush();
    return groups;
  }

  function agentScore(token, agent) {
    if (token === "*") return 0;
    return agent.toLowerCase().includes(token) ? token.length : -1;
  }
  function ruleRegex(pattern) {
    const anchored = pattern.endsWith("$");
    const source = anchored ? pattern.slice(0, -1) : pattern;
    const escaped = source.replace(/[.+?^$(){}|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp("^" + escaped + (anchored ? "$" : ""));
  }
  function resolvePath(value) {
    const target = value.trim();
    if (!target) return "/";
    if (/^https?:\/\//i.test(target)) {
      const url = new URL(target);
      return url.pathname + url.search;
    }
    return target.startsWith("/") ? target : "/" + target;
  }
  function test(content, agent, path) {
    const groups = parse(content);
    let best = -1;
    const selected = [];
    for (const group of groups) {
      const score = Math.max(...group.agents.map((token) => agentScore(token, agent)));
      if (score > best) { best = score; selected.length = 0; if (score >= 0) selected.push(group); }
      else if (score === best && score >= 0) selected.push(group);
    }
    if (best < 0) return { allowed: true, group: "No matching user-agent group", rule: "No matching rule" };
    const matches = selected.flatMap((group) => group.rules).filter((rule) => ruleRegex(rule.pattern).test(path));
    matches.sort((a, b) => b.pattern.replaceAll("*", "").replace(/\$$/, "").length - a.pattern.replaceAll("*", "").replace(/\$$/, "").length || (a.type === "allow" ? -1 : 1));
    const winner = matches[0];
    return {
      allowed: !winner || winner.type === "allow",
      group: selected.flatMap((group) => group.agents).join(", "),
      rule: winner ? `${winner.type[0].toUpperCase() + winner.type.slice(1)}: ${winner.pattern}` : "No matching rule",
    };
  }

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
        const path = resolvePath(target.value);
        const agent = selectedAgent();
        const result = test(input.value, agent, path);
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
})();

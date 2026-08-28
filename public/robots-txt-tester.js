(function () {
  function parse(content) {
    const groups = [];
    let agents = [];
    let rules = [];
    let rulesStarted = false;
    const flush = () => { if (agents.length) groups.push({ agents: [...agents], rules: [...rules] }); agents = []; rules = []; rulesStarted = false; };
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
    const escaped = source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp("^" + escaped + (anchored ? "$" : ""));
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
    if (best < 0) return { allowed: true, group: "No matching group", rule: "No rule", explanation: "No user-agent group matched, so the path is allowed by default." };
    const matches = selected.flatMap((group) => group.rules).filter((rule) => ruleRegex(rule.pattern).test(path));
    matches.sort((a, b) => b.pattern.replaceAll("*", "").replace(/\$$/, "").length - a.pattern.replaceAll("*", "").replace(/\$$/, "").length || (a.type === "allow" ? -1 : 1));
    const winner = matches[0];
    return {
      allowed: !winner || winner.type === "allow",
      group: selected.flatMap((group) => group.agents).join(", "),
      rule: winner ? `${winner.type[0].toUpperCase() + winner.type.slice(1)}: ${winner.pattern}` : "No matching rule",
      explanation: winner ? `The longest matching rule is ${winner.type}.` : "The group matched, but no Allow or Disallow pattern matched this path.",
    };
  }

  for (const root of document.querySelectorAll("[data-robots-tester]")) {
    const input = root.querySelector("[data-robots-input]");
    const agent = root.querySelector("[data-robots-agent]");
    const path = root.querySelector("[data-robots-path]");
    const verdict = root.querySelector("[data-robots-verdict]");
    const explanation = root.querySelector("[data-robots-explanation]");
    const group = root.querySelector("[data-robots-group]");
    const rule = root.querySelector("[data-robots-rule]");
    const button = root.querySelector("[data-robots-test]");
    const clear = root.querySelector("[data-robots-clear]");
    if (!input || !agent || !path || !verdict || !explanation || !group || !rule || !button || !clear) continue;
    const run = () => {
      const normalizedPath = path.value.trim().startsWith("/") ? path.value.trim() : "/" + path.value.trim();
      const result = test(input.value, agent.value.trim() || "*", normalizedPath || "/");
      verdict.textContent = result.allowed ? "Allowed to crawl" : "Disallowed from crawling";
      verdict.dataset.state = result.allowed ? "valid" : "error";
      explanation.textContent = result.explanation;
      group.textContent = result.group;
      rule.textContent = result.rule;
    };
    button.addEventListener("click", run);
    clear.addEventListener("click", () => { input.value = ""; verdict.textContent = "Rules cleared"; explanation.textContent = "Paste a robots.txt file to run another test."; group.textContent = "—"; rule.textContent = "—"; input.focus(); });
    run();
  }
})();

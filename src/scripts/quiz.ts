import { quizQuestions } from "../data/quiz";

const root = document.querySelector<HTMLElement>("[data-quiz]");

if (root) {
  const quizRoot = root;

  function requireElement<T extends Element>(selector: string): T {
    const element = quizRoot.querySelector<T>(selector);
    if (!element) throw new Error("Missing quiz control: " + selector);
    return element;
  }

  const count = requireElement<HTMLElement>("[data-question-count]");
  const code = requireElement<HTMLElement>("[data-code]");
  const answers = requireElement<HTMLElement>("[data-answers]");
  const feedback = requireElement<HTMLElement>("[data-feedback]");
  const scoreLabel = requireElement<HTMLElement>("[data-score]");
  const next = requireElement<HTMLButtonElement>("[data-next]");
  let index = 0;
  let score = 0;
  let answered = false;
  const pad = (value: number) => String(value).padStart(2, "0");

  function buildAnswer(choice: string, choiceIndex: number) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.answer = "";
    const number = document.createElement("span");
    number.textContent = pad(choiceIndex + 1);
    const label = document.createElement("span");
    label.textContent = choice;
    button.append(number, label);
    return button;
  }

  function renderQuestion() {
    const question = quizQuestions[index];
    count.textContent = "Question " + pad(index + 1) + " / " + pad(quizQuestions.length);
    code.textContent = question.code;
    answers.replaceChildren(...question.choices.map(buildAnswer));
    feedback.innerHTML = "<p>Select one answer. The explanation appears here.</p>";
    next.disabled = true;
    next.innerHTML = index === quizQuestions.length - 1
      ? 'See result <span aria-hidden="true">&rarr;</span>'
      : 'Next question <span aria-hidden="true">&rarr;</span>';
    answered = false;
  }

  function finishQuiz() {
    count.textContent = "Run complete";
    code.textContent = "Result: " + pad(score) + " correct from " + pad(quizQuestions.length) + " samples.";
    answers.replaceChildren();
    feedback.innerHTML = "<strong>Run logged locally.</strong><p>The score was not stored or transmitted. Restart to try the same eight samples again.</p>";
    next.disabled = false;
    next.innerHTML = 'Run again <span aria-hidden="true">&#8635;</span>';
    next.dataset.restart = "";
  }

  answers.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("[data-answer]");
    if (!button || answered) return;
    answered = true;
    const question = quizQuestions[index];
    const selected = button.querySelector("span:nth-child(2)")?.textContent;
    const correct = selected === question.language;
    if (correct) score += 1;
    answers.querySelectorAll<HTMLButtonElement>("button").forEach((candidate) => {
      candidate.disabled = true;
      if (candidate.querySelector("span:nth-child(2)")?.textContent === question.language) candidate.dataset.state = "correct";
    });
    if (!correct) button.dataset.state = "incorrect";
    const heading = document.createElement("strong");
    heading.textContent = correct ? "Correct." : "The answer is " + question.language + ".";
    const explanation = document.createElement("p");
    explanation.textContent = question.explanation;
    feedback.replaceChildren(heading, explanation);
    scoreLabel.textContent = "Score " + pad(score) + " / " + pad(quizQuestions.length);
    next.disabled = false;
    next.focus();
  });

  next.addEventListener("click", () => {
    if (next.hasAttribute("data-restart")) {
      index = 0;
      score = 0;
      next.removeAttribute("data-restart");
      scoreLabel.textContent = "Score 00 / " + pad(quizQuestions.length);
      renderQuestion();
      return;
    }
    if (!answered) return;
    if (index === quizQuestions.length - 1) {
      finishQuiz();
      return;
    }
    index += 1;
    renderQuestion();
    answers.querySelector<HTMLButtonElement>("button")?.focus();
  });
}

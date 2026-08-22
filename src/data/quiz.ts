export type QuizQuestion = {
  language: string;
  code: string;
  choices: string[];
  explanation: string;
};

export const quizQuestions: QuizQuestion[] = [
  {
    language: "Rust",
    code: `fn double(items: &[i32]) -> Vec<i32> {
    items.iter().map(|n| n * 2).collect()
}`,
    choices: ["Rust", "Go", "Swift", "Kotlin"],
    explanation: "The borrowed slice &[i32], closure syntax, and collection into Vec<i32> identify Rust.",
  },
  {
    language: "Go",
    code: `func active(ids []int) []int {
    result := make([]int, 0, len(ids))
    return append(result, ids...)
}`,
    choices: ["C#", "Go", "Zig", "Java"],
    explanation: "The func keyword, slice type []int, short declaration :=, and variadic ids... are characteristic Go syntax.",
  },
  {
    language: "Python",
    code: `def slugs(titles: list[str]) -> list[str]:
    return [title.lower().replace(" ", "-") for title in titles]`,
    choices: ["Ruby", "Python", "Elixir", "Julia"],
    explanation: "The def block, indentation, list type hints, and list comprehension point to Python.",
  },
  {
    language: "Elixir",
    code: `def normalize({:ok, value}) do
  value
  |> String.trim()
  |> String.downcase()
end`,
    choices: ["Erlang", "Elixir", "F#", "Clojure"],
    explanation: "Pattern matching in the argument plus the |> pipeline and do/end block identify Elixir.",
  },
  {
    language: "Kotlin",
    code: `fun labels(items: List<String>): List<String> =
    items.filter { it.isNotBlank() }.map { it.trim() }`,
    choices: ["Scala", "Kotlin", "Swift", "TypeScript"],
    explanation: "fun, the List<String> type, expression-body equals sign, and implicit it parameter identify Kotlin.",
  },
  {
    language: "Ruby",
    code: `def index_by_id(records)
  records.each_with_object({}) do |record, index|
    index[record.id] = record
  end
end`,
    choices: ["Ruby", "Crystal", "Lua", "Perl"],
    explanation: "The each_with_object call, |block parameters|, symbol-free hash literal, and end-delimited methods point to Ruby.",
  },
  {
    language: "Swift",
    code: `func displayName(for user: User?) -> String {
    guard let user else { return "Guest" }
    return user.name
}`,
    choices: ["Swift", "Kotlin", "Dart", "Objective-C"],
    explanation: "The external parameter label, optional User?, and guard let binding identify Swift.",
  },
  {
    language: "TypeScript",
    code: `function first<T>(items: readonly T[]): T | undefined {
  return items.at(0)
}`,
    choices: ["JavaScript", "TypeScript", "Flow", "C#"],
    explanation: "The generic <T>, readonly array type, return union, and undefined type make this TypeScript rather than plain JavaScript.",
  },
];

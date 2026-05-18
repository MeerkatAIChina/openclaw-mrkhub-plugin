export type MrkhubIntent =
  | { kind: "search"; query: string }
  | { kind: "install"; skillName: string /* empty => resolve from session */ }
  | { kind: "help" };

export function toolTextResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    details: { ok: true as const },
  };
}

/** Title-case muscle / anatomy labels for consistent UI display. */
export function formatMuscleLabel(label: string): string {
  return label
    .split(/(\s+|[&:/(),-]+)/)
    .map((part) => {
      if (!/[A-Za-z]/.test(part)) return part;
      return part
        .split(/(['’])/)
        .map((chunk) => {
          if (chunk === "'" || chunk === '’') return chunk;
          if (!/[A-Za-z]/.test(chunk)) return chunk;
          return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
        })
        .join('');
    })
    .join('');
}

export function nextSentenceIndex(total: number, previousIndex = -1, random: () => number = Math.random): number {
  if (total <= 0) return -1;
  if (total === 1) return 0;
  const eligible = Array.from({ length: total }, (_, index) => index).filter((index) => index !== previousIndex);
  const sample = random();
  const normalized = Number.isFinite(sample) ? Math.max(0, Math.min(0.9999999999999999, sample)) : 0;
  return eligible[Math.floor(normalized * eligible.length)] ?? eligible[0] ?? 0;
}

export class SentencePool<T extends { id: string }> {
  private previousId: string | undefined;

  constructor(private readonly random: () => number = Math.random) {}

  get selectedId(): string | undefined { return this.previousId; }

  choose(items: readonly T[]): T | undefined {
    const previousIndex = items.findIndex((item) => item.id === this.previousId);
    const item = items[nextSentenceIndex(items.length, previousIndex, this.random)];
    if (item) this.previousId = item.id;
    return item;
  }
}

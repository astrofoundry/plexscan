export class ScanDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private readonly windowMs: number;
  private readonly onFire: (path: string, sectionId: string) => void;

  constructor(windowMs: number, onFire: (path: string, sectionId: string) => void) {
    this.windowMs = windowMs;
    this.onFire = onFire;
  }

  schedule(path: string, sectionId: string): void {
    const existing = this.timers.get(path);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(path);
      this.onFire(path, sectionId);
    }, this.windowMs);

    this.timers.set(path, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  get pending(): number {
    return this.timers.size;
  }
}

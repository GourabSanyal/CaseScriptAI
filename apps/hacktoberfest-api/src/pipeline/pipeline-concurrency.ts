/** In-process cap for concurrent demo pipelines (Render free web). */
export class PipelineConcurrencyGate {
  private active = 0;

  constructor(private readonly max: number = 2) {}

  tryAcquire(): boolean {
    if (this.active >= this.max) return false;
    this.active += 1;
    return true;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
  }

  get activeCount(): number {
    return this.active;
  }
}

export class BusyError extends Error {}

type Waiter = { start: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout; signal?: AbortSignal; abort: () => void };

export class ExecutionQueue {
    private active = 0;
    private waiting: Waiter[] = [];
    private stopping = false;
    private idleResolvers: (() => void)[] = [];

    constructor(private readonly limit: number, private readonly maxQueue: number, private readonly waitMs: number) {}

    stats() { return { active: this.active, queued: this.waiting.length, capacity: this.limit, stopping: this.stopping }; }

    async run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
        if (this.stopping || signal?.aborted) throw new BusyError("Runner unavailable");
        if (this.active < this.limit) {
            this.active++;
        } else {
            if (this.waiting.length >= this.maxQueue) throw new BusyError("Execution queue full");
            await new Promise<void>((resolve, reject) => {
                const remove = () => {
                    this.waiting = this.waiting.filter(item => item !== waiter);
                    clearTimeout(waiter.timer);
                    signal?.removeEventListener("abort", waiter.abort);
                };
                const waiter: Waiter = {
                    start: () => { remove(); this.active++; resolve(); },
                    reject: error => { remove(); reject(error); },
                    timer: setTimeout(() => waiter.reject(new BusyError("Execution queue wait expired")), this.waitMs),
                    signal,
                    abort: () => waiter.reject(new BusyError("Request disconnected")),
                };
                this.waiting.push(waiter);
                signal?.addEventListener("abort", waiter.abort, { once: true });
            });
        }
        try { return await task(); }
        finally {
            this.active--;
            if (!this.stopping) this.waiting[0]?.start();
            if (this.active === 0) this.idleResolvers.splice(0).forEach(resolve => resolve());
        }
    }

    stop() {
        this.stopping = true;
        [...this.waiting].forEach(item => item.reject(new BusyError("Runner shutting down")));
    }

    idle(): Promise<void> {
        return this.active === 0 ? Promise.resolve() : new Promise(resolve => this.idleResolvers.push(resolve));
    }
}

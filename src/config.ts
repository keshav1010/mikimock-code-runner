export function integerSetting(name: string, fallback: number, min = 1, max = 1_000_000): number {
    const raw = process.env[name];
    const value = raw === undefined ? fallback : Number(raw);
    if (!raw?.trim() && raw !== undefined || !Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`Invalid ${name}`);
    }
    return value;
}

export function serverConfig() {
    const secret = process.env.RUNNER_SECRET;
    if (!secret?.trim()) throw new Error("RUNNER_SECRET must be set and non-empty");
    return {
        secret,
        port: integerSetting("PORT", 9090, 1, 65535),
        concurrency: integerSetting("MAX_CONCURRENT_EXECUTIONS", 4, 1, 32),
        queueSize: integerSetting("MAX_QUEUE_SIZE", 32, 0, 1000),
        queueTimeoutMs: integerSetting("QUEUE_TIMEOUT_MS", 30_000, 1, 120_000),
        maxCodeBytes: integerSetting("MAX_CODE_BYTES", 100_000),
        maxInputBytes: integerSetting("MAX_INPUT_BYTES", 50_000),
        maxTestCases: integerSetting("MAX_TEST_CASES", 1000, 1, 10_000),
    };
}

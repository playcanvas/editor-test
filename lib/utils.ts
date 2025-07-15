/**
 * Poll a function until it returns a value.
 *
 * @param fn - The function to poll.
 * @param interval - The interval to poll the function.
 * @returns The result of the function.
 */
export const poll = (fn: (...args: any[]) => any, interval: number = 500) => {
    return new Promise<ReturnType<typeof fn>>((resolve, reject) => {
        const int = setInterval(async () => {
            try {
                const res = await fn();
                if (res) {
                    clearInterval(int);
                    resolve(res);
                }
            } catch (e) {
                clearInterval(int);
                reject(e);
            }
        }, interval);
    });
};

/**
 * Wait for a period of time.
 *
 * @param ms - The time to wait.
 * @returns A promise that resolves after the time.
 */
export const wait = (ms: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
};

const map = new Map<string, number>();
/**
 * Generate a unique name.
 *
 * @returns A unique name.
 */
export const uniqueName = (name: string) => {
    const id = map.get(name) || 0;
    const next = id + 1;
    map.set(name, next);
    return `${name}-${next}`;
};

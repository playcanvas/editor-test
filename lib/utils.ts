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

/**
 * Generate a new id.
 *
 * @returns A function that returns a new id.
 */
export const id = () => {
    let id = 0;
    return () => id++;
};

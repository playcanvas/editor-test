/**
 * Poll a function until it returns a value.
 *
 * @param {function(any): any} fn - The function to poll.
 * @param {*} interval - The interval to poll the function.
 * @returns {Promise<any>} - The result of the function.
 */
export const poll = (fn, interval = 500) => {
    return new Promise((resolve, reject) => {
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
 * @param {number} ms - The time to wait.
 * @returns {Promise<void>} - A promise that resolves after the time.
 */
export const wait = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/**
 * Generate a new id.
 *
 * @returns {() => number} A function that returns a new id.
 */
export const idGenerator = () => {
    let id = 0;
    return () => id++;
};

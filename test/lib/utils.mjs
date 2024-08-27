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

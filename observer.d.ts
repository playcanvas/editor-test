export type Observer = {
    get(name: string): any;
    set(name: string, value: any): void;
};

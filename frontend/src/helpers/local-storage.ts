export class LocalStorage {
    static getObject<T extends object>(key: string): T | null {
        const json = window.localStorage.getItem(key);
        return json != null ? JSON.parse(json) : null;
    }

    static setObject<T extends object>(key: string, obj: T): void {
        const json = JSON.stringify(obj);
        window.localStorage.setItem(key, json);
    }
}

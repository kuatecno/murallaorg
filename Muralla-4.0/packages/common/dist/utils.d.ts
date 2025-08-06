export declare function generateCursor(data: any): string;
export declare function parseCursor(cursor: string): any;
export declare function slugify(text: string): string;
export declare function formatCurrency(amount: number, currency?: string): string;
export declare function truncateText(text: string, maxLength: number): string;
export declare function isValidEmail(email: string): boolean;
export declare function generateRandomString(length: number): string;
export declare function deepClone<T>(obj: T): T;
export declare function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=utils.d.ts.map
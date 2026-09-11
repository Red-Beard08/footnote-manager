export function normalizeFolder(value: string): string { return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/"); }

export const isBrowser = typeof window !== 'undefined';

export function getLocalStorageUsage(): { used: number; total: number; percentage: number } {
    let totalBytes = 0;
    const totalStorage = 5 * 1024 * 1024; // Assuming 5MB limit (common in most browsers)

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            // Count bytes for both key and value
            totalBytes += new Blob([key]).size;
            totalBytes += new Blob([localStorage.getItem(key) || '']).size;
        }
    }

    return {
        used: totalBytes,
        total: totalStorage,
        percentage: (totalBytes / totalStorage) * 100
    };
}

export function clearLocalStorage() {
    localStorage.clear();
}

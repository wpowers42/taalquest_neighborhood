/**
 * TaalQuest - IndexedDB Cache Module
 * Handles pre-caching of scenarios for instant playback
 */

const DB_NAME = 'taalquest-cache';
const DB_VERSION = 1;
const STORE_NAME = 'scenarios';

let db = null;

/**
 * Open the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function openDatabase() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create object store for cached scenarios
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log('Created scenarios object store');
            }
        };
    });
}

/**
 * Save a complete scenario to the cache
 * @param {Object} scenario - The scenario to cache
 * @param {Object} scenario.script - The dialogue script
 * @param {ArrayBuffer[]} scenario.audioBlobs - Audio data for each line
 * @param {ArrayBuffer|null} scenario.imageBlob - Scene image data
 * @param {string[]} scenario.characters - Character names
 * @returns {Promise<void>}
 */
export async function saveCachedScenario(scenario) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const record = {
            id: 1,  // Always use same ID - only cache one scenario
            script: scenario.script,
            audioBlobs: scenario.audioBlobs,
            imageBlob: scenario.imageBlob,
            characters: scenario.characters,
            createdAt: Date.now()
        };

        const request = store.put(record);

        request.onsuccess = () => {
            console.log('Scenario cached successfully');
            resolve();
        };

        request.onerror = () => {
            console.error('Failed to cache scenario:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Get the cached scenario (and remove it from cache)
 * @returns {Promise<Object|null>}
 */
export async function getCachedScenario() {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const getRequest = store.get(1);

        getRequest.onsuccess = () => {
            const scenario = getRequest.result;

            if (scenario) {
                // Delete the cached scenario after retrieving
                const deleteRequest = store.delete(1);
                deleteRequest.onsuccess = () => {
                    console.log('Retrieved and cleared cached scenario');
                    resolve(scenario);
                };
                deleteRequest.onerror = () => {
                    // Still return the scenario even if delete fails
                    console.warn('Failed to clear cache, but returning scenario');
                    resolve(scenario);
                };
            } else {
                resolve(null);
            }
        };

        getRequest.onerror = () => {
            console.error('Failed to get cached scenario:', getRequest.error);
            reject(getRequest.error);
        };
    });
}

/**
 * Check if there's a cached scenario ready
 * @returns {Promise<boolean>}
 */
export async function hasCachedScenario() {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.count();

        request.onsuccess = () => {
            resolve(request.result > 0);
        };

        request.onerror = () => {
            console.error('Failed to check cache:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Clear all cached scenarios
 * @returns {Promise<void>}
 */
export async function clearCache() {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.clear();

        request.onsuccess = () => {
            console.log('Cache cleared');
            resolve();
        };

        request.onerror = () => {
            console.error('Failed to clear cache:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Convert a blob URL to ArrayBuffer for storage
 * @param {string} blobUrl - The blob URL to convert
 * @returns {Promise<ArrayBuffer>}
 */
export async function blobUrlToArrayBuffer(blobUrl) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return blob.arrayBuffer();
}

/**
 * Convert an ArrayBuffer back to a blob URL
 * @param {ArrayBuffer} arrayBuffer - The array buffer
 * @param {string} mimeType - The MIME type (e.g., 'audio/mpeg', 'image/png')
 * @returns {string} - Blob URL
 */
export function arrayBufferToBlobUrl(arrayBuffer, mimeType) {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
}

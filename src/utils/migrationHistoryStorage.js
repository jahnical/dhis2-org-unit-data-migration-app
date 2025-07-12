// src/utils/migrationHistoryStorage.js
// Utility functions for migration history storage in localStorage and DHIS2 DataStore

const LOCAL_STORAGE_KEY = 'migration_history'
const DATASTORE_NAMESPACE = 'migration_history'

// --- Local Storage ---
export function getLocalHistory() {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch (e) {
        return []
    }
}

export function setLocalHistory(history) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history))
}

// --- DHIS2 DataStore ---
// These functions require a dataEngine instance from @dhis2/app-runtime
export async function getDataStoreHistory(dataEngine) {
    try {
        const res = await dataEngine.query({
            history: {
                resource: `dataStore/${DATASTORE_NAMESPACE}/${LOCAL_STORAGE_KEY}`,
            },
        })
        return res.history || []
    } catch (e) {
        // If not found, return empty array
        return []
    }
}

export async function setDataStoreHistory(dataEngine, history) {
    await dataEngine.mutate({
        resource: `dataStore/${DATASTORE_NAMESPACE}/${LOCAL_STORAGE_KEY}`,
        type: 'create',
        data: history,
        params: { mergeMode: 'REPLACE' },
    })
}

// --- Cleanup ---
export function filterHistoryByAge(history, days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return history.filter(h => new Date(h.timestamp).getTime() >= cutoff)
}

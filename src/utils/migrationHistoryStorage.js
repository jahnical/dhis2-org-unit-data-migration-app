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
        if (!dataEngine || typeof dataEngine.query !== 'function') {
            throw new Error('dataEngine is not defined or not a DHIS2 data engine');
        }
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
    try {
        await dataEngine.mutate({
            resource: `dataStore/${DATASTORE_NAMESPACE}/${LOCAL_STORAGE_KEY}`,
            type: 'create',
            data: history,
            params: { mergeMode: 'REPLACE' },
        });
    } catch (error) {
        // If key exists, retry with update
        if (error && error.message && error.message.includes("already exists")) {
            await dataEngine.mutate({
                resource: `dataStore/${DATASTORE_NAMESPACE}/${LOCAL_STORAGE_KEY}`,
                type: 'update',
                data: history,
                params: { mergeMode: 'REPLACE' },
            });
        } else {
            throw error;
        }
    }
}

// Always clear DataStore history using update to avoid 409
export async function clearDataStoreHistory(dataEngine) {
    await dataEngine.mutate({
        resource: `dataStore/${DATASTORE_NAMESPACE}/${LOCAL_STORAGE_KEY}`,
        type: 'update',
        data: [],
        params: { mergeMode: 'REPLACE' },
    });
}

// --- Cleanup ---
export function filterHistoryByAge(history, days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return history.filter(h => new Date(h.timestamp).getTime() >= cutoff)
}

// --- Update history entry by id ---
export function updateHistoryEntryById(history, id, updateFields) {
    return history.map(entry => {
        if (entry.id === id) {
            return { ...entry, ...updateFields };
        }
        return entry;
    });
}

// --- Cleanup after undo ---
// Removes all entries except the updated original (with action 'undone' and originalId)
export function cleanUpAfterUndo(history, originalId) {
    return history.filter(entry => {
        // Keep only the updated original entry (with action 'undone' and originalId)
        if (entry.id === originalId && entry.action === 'undone') return true;
        // Remove the original 'migrated' entry and any reverse migration/undo entries
        if (entry.id === originalId && entry.action === 'migrated') return false;
        if (entry.action === 'migrated' && entry.id !== originalId) return false;
        return true; // Keep all other entries
    });
}

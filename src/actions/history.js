// src/actions/history.js
// Redux actions for migration history

// Action types (for reducer imports)
export const LOG_HISTORY_BATCH = 'LOG_HISTORY_BATCH'
export const LOAD_HISTORY = 'LOAD_HISTORY'
export const CLEANUP_OLD_HISTORY = 'CLEANUP_OLD_HISTORY'

// Action creators
export const logHistoryBatch = (batch) => ({
    type: LOG_HISTORY_BATCH,
    payload: batch,
})

export const loadHistory = (history) => ({
    type: LOAD_HISTORY,
    payload: history,
})

export const cleanupOldHistory = () => ({
    type: CLEANUP_OLD_HISTORY,
})

// Thunk actions
import { getLocalHistory, setLocalHistory, getDataStoreHistory, setDataStoreHistory, filterHistoryByAge } from '../utils/migrationHistoryStorage'

// Load history from both localStorage and DataStore, merge, and dispatch
export const loadMigrationHistory = (dataEngine) => async (dispatch) => {
    const local = getLocalHistory()
    const remote = await getDataStoreHistory(dataEngine)
    // Merge and deduplicate by id (prefer remote if conflict)
    const merged = [...remote, ...local.filter(l => !remote.some(r => r.id === l.id))]
    dispatch(loadHistory(merged))
}

// Log a new batch to both storages
export const logHistoryBatchThunk = (batch, dataEngine) => async (dispatch) => {
    // Add to Redux
    dispatch(logHistoryBatch(batch))
    // Save to localStorage
    const local = getLocalHistory()
    setLocalHistory([batch, ...local])
    // Save to DataStore
    const remote = await getDataStoreHistory(dataEngine)
    await setDataStoreHistory(dataEngine, [batch, ...remote])
}

// Cleanup old history (older than 30 days) in both storages
export const cleanupOldHistoryThunk = (dataEngine) => async (dispatch) => {
    const local = getLocalHistory()
    const cleanedLocal = filterHistoryByAge(local)
    setLocalHistory(cleanedLocal)
    const remote = await getDataStoreHistory(dataEngine)
    const cleanedRemote = filterHistoryByAge(remote)
    await setDataStoreHistory(dataEngine, cleanedRemote)
    // Optionally reload Redux state
    dispatch(loadHistory(cleanedRemote))
}

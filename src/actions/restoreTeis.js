// src/actions/restoreTeis.js
// Async action creator for restoring TEIs
import { DELETION_TYPES } from '../reducers/deletion'
import { restoreTEI } from '../api/teis'
import { setHistoryTeis, setHistoryTeisError, setHistoryTeisLoading } from './historyTeis'
import { APP_SOFT_DELETED_ATTR_ID } from '../constants/appSoftDeletedAttrId.js'
import { logHistoryBatchThunk } from './history'

/**
 * Restore selected TEIs and refresh history list
 * @param {object} engine - DHIS2 app-runtime data engine
 * @param {Array} teis - Array of TEI objects to restore
 * @param {Function} fetchHistoryTeis - Function to fetch and update history TEIs (should dispatch setHistoryTeis)
 */

export const restoreTeis = (engine, teis, fetchHistoryTeis) => async (dispatch) => {
    dispatch({ type: DELETION_TYPES.RESTORE_TEIS_START })
    try {
        await Promise.all(
            teis.map(tei => restoreTEI(engine, tei.trackedEntityInstance || tei.id, APP_SOFT_DELETED_ATTR_ID))
        )
        dispatch({ type: DELETION_TYPES.RESTORE_TEIS_SUCCESS })
        if (fetchHistoryTeis) {
            dispatch(setHistoryTeisLoading(true))
            try {
                const historyTeis = await fetchHistoryTeis()
                dispatch(setHistoryTeis(historyTeis))
            } catch (err) {
                dispatch(setHistoryTeisError(err))
            }
            dispatch(setHistoryTeisLoading(false))
        }
    } catch (error) {
        dispatch({ type: DELETION_TYPES.RESTORE_TEIS_ERROR, payload: error })
    }
}

// Thunk for restoring soft-deleted TEIs in selected batches
export const restoreTeisBatchesThunk = (batchIds, engine) => async (dispatch, getState) => {
    const { histories } = getState().history
    const batchesToRestore = histories.filter(b => batchIds.includes(b.id) && b.action === 'soft-deleted')
    try {
        for (const batch of batchesToRestore) {
            // Call actual restoreTeis logic here
            await dispatch(restoreTeis(engine, batch.teis))
            // Log restore to history
            const restoredBatch = {
                ...batch,
                action: 'restored',
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString(),
            }
            await require('./history').logHistoryBatchThunk(restoredBatch, engine)(dispatch, getState)
        }
    } catch (error) {
        // Optionally handle error
        console.error('Restore failed:', error)
    }
}

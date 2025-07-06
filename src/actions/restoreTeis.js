// src/actions/restoreTeis.js
// Async action creator for restoring TEIs
import { DELETION_TYPES } from '../reducers/deletion'
import { restoreTEI } from '../api/teis'
import { setHistoryTeis, setHistoryTeisError, setHistoryTeisLoading } from './historyTeis'
import { APP_SOFT_DELETED_ATTR_ID } from '../constants/appSoftDeletedAttrId.js'

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

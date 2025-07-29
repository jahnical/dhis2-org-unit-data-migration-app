import { deleteTEI, restoreTEI, newRestoreTEI } from '../api/teis'
import { DELETION_TYPES } from '../reducers/deletion'
import { logHistoryBatchThunk } from './history'
import { buildSoftDeleteHistoryRecord } from '../utils/buildSoftDeleteHistoryRecord'

/**
 * Native soft delete multiple TEIs using the DELETE endpoint.
 *
 * @param {Array<string>} teiUids - UIDs of the TEIs to delete
 * @param {object} engine - DHIS2 app-runtime data engine
 */
export const deleteTeis = ({ teiUids, engine, allTeis }) => async (dispatch) => {
    if (!teiUids?.length || !engine) {
        console.error('[deleteTeis] Missing TEI UIDs or engine.', { teiUids, engine });
        throw new Error('Missing TEI UIDs or engine.')
    }

    console.log('[deleteTeis] Dispatching DELETE_TEIS_START', teiUids);
    dispatch({ type: DELETION_TYPES.DELETE_TEIS_START })

    const errors = [];
    const deletedTeis = [];
    const allTeisList = allTeis || [];
    for (const teiId of teiUids) {
        try {
            // Find full TEI object
            const fullTei = allTeisList.find(t => t.trackedEntityInstance === teiId || t.id === teiId) || { id: teiId };
            await deleteTEI(engine, teiId, fullTei);
            deletedTeis.push(fullTei);
        } catch (error) {
            // If 404 or already deleted, skip and collect error
            if (error.message && error.message.includes('404')) {
                errors.push(`${teiId}: Not found or already deleted`);
            } else {
                errors.push(`${teiId}: ${error.message}`);
            }
        }
    }

    if (deletedTeis.length) {
        const deletedIds = deletedTeis.map(t => t.trackedEntityInstance || t.id);
        console.log('[deleteTeis] Dispatching SOFT_DELETE_TEIS', deletedIds);
        dispatch({
            type: DELETION_TYPES.SOFT_DELETE_TEIS,
            payload: deletedIds,
        });

        // Build and log soft-delete history batch so it appears in history tab
        const historyBatch = buildSoftDeleteHistoryRecord({
            programId: null, // Fill if available
            programName: null, // Fill if available
            orgUnitId: null, // Fill if available
            orgUnitName: null, // Fill if available
            user: null, // Fill if available
            teis: deletedTeis,
        });
        await dispatch(logHistoryBatchThunk(historyBatch, engine));

        // Store the batch in DataStore as a batch (array of TEIs)
        if (engine && deletedTeis.length) {
            const { trackDeletedTeiBatch } = await import('../utils/datastoreActions');
            await trackDeletedTeiBatch(engine, deletedTeis);
        }
    }
    if (errors.length) {
        console.error('[deleteTeis] Dispatching DELETE_TEIS_ERROR', errors);
        dispatch({
            type: DELETION_TYPES.DELETE_TEIS_ERROR,
            payload: errors.join('; '),
        });
        // Do not throw, allow UI to show partial success
    }
}


/**
 * Restore multiple TEIs via the native `/restore` endpoint.
 *
 * @param {Array<string>} teiUids - UIDs of the TEIs to restore
 * @param {object} engine - DHIS2 app-runtime data engine
 * @param {Function} fetchAfterRestore - Optional callback to refresh TEIs
 */
export const restoreTeis = ({ teiUids, teis, engine, orgUnitId, programId, fetchAfterRestore }) =>
    async (dispatch) => {
        if (!teiUids?.length) {
            dispatch({
                type: DELETION_TYPES.RESTORE_TEIS_ERROR,
                payload: 'No TEIs selected for restoration'
            });
            return;
        }

        console.log('Restoring TEIs:', teis, 'for UIDs:', teiUids);

        dispatch({ type: DELETION_TYPES.RESTORE_TEIS_START });

        try {
            // Process TEIs one at a time to ensure reliable restoration
            const results = [];

            for (const teiUid of teiUids) {
                try {
                    const result = await newRestoreTEI(engine, teis);
                    results.push({
                        status: 'fulfilled',
                        value: result,
                        teiUid: teiUid
                    });

                    // Small delay between operations
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                    results.push({
                        status: 'rejected',
                        reason: error,
                        teiUid: teiUid
                    });
                }
            }

            // Process results
            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');

            // Get successfully restored TEI IDs
            const restoredTeis = successes.map(s => s.value.trackedEntity || s.teiUid);

            // Dispatch success for completed restorations
            if (successes.length > 0) {
                dispatch({
                    type: DELETION_TYPES.RESTORE_TEIS_COMPLETE,
                    payload: {
                        restoredTeis,
                        count: successes.length,
                        message: `Successfully restored ${successes.length} TEI${successes.length > 1 ? 's' : ''}`
                    }
                });
            }

            // Handle any failures
            if (failures.length > 0) {
                const errorMessages = failures.map(f =>
                    `TEI ${f.teiUid}: ${f.reason?.message || 'Unknown error'}`
                );

                dispatch({
                    type: DELETION_TYPES.RESTORE_TEIS_ERROR,
                    payload: `Failed to restore ${failures.length} TEI${failures.length > 1 ? 's' : ''}:\n${errorMessages.join('\n')}`
                });
            }

            // Refresh data if callback provided
            if (typeof fetchAfterRestore === 'function') {
                try {
                    await fetchAfterRestore();
                } catch (fetchError) {
                    console.error('Failed to refresh data after restoration:', fetchError);
                }
            }

            return restoredTeis;

        } catch (error) {
            console.error('Restoration process failed:', error);
            dispatch({
                type: DELETION_TYPES.RESTORE_TEIS_ERROR,
                payload: error.message
            });
            throw error;
        }
    };

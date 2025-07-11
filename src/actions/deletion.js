import { DELETION_TYPES } from '../reducers/deletion'
import { deleteTEI, restoreTEI } from '../api/teis'

/**
 * Native soft delete multiple TEIs using the DELETE endpoint.
 *
 * @param {Array<string>} teiUids - UIDs of the TEIs to delete
 * @param {object} engine - DHIS2 app-runtime data engine
 */
export const deleteTeis = ({ teiUids, engine }) => async (dispatch) => {
    if (!teiUids?.length || !engine) {
        throw new Error('Missing TEI UIDs or engine.')
    }

    dispatch({ type: DELETION_TYPES.DELETE_TEIS_START })

    const errors = []
    const deleted = []
    for (const teiId of teiUids) {
        try {
            await deleteTEI(engine, teiId)
            deleted.push(teiId)
        } catch (error) {
            // If 404 or already deleted, skip and collect error
            if (error.message && error.message.includes('404')) {
                errors.push(`${teiId}: Not found or already deleted`)
            } else {
                errors.push(`${teiId}: ${error.message}`)
            }
        }
    }

    if (deleted.length) {
        dispatch({
            type: DELETION_TYPES.DELETE_TEIS_SUCCESS,
            payload: deleted,
        })
    }
    if (errors.length) {
        dispatch({
            type: DELETION_TYPES.DELETE_TEIS_ERROR,
            payload: errors.join('; '),
        })
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
export const restoreTeis = ({ teiUids, engine, orgUnitId, programId, fetchAfterRestore }) => 
    async (dispatch) => {
        if (!teiUids?.length) {
            dispatch({
                type: DELETION_TYPES.RESTORE_TEIS_ERROR,
                payload: 'No TEIs selected for restoration'
            });
            return;
        }

        dispatch({ type: DELETION_TYPES.RESTORE_TEIS_START });
        
        try {
            // Process TEIs one at a time to ensure reliable restoration
            const results = [];
            
            for (const teiUid of teiUids) {
                try {
                    const result = await restoreTEI(engine, teiUid, orgUnitId, programId);
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
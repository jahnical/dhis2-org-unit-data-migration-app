
import { restoreTeis } from './deletion'

/**
 * Thunk to restore all TEIs in the selected soft-deleted batches from migration history.
 * @param {Array<string>} batchIds - IDs of the selected history batches
 * @param {object} engine - DHIS2 app-runtime data engine
 */
export const restoreTeisBatchesThunk = (batchIds, engine) => async (dispatch, getState) => {
    if (!batchIds?.length) return;
    const histories = getState().history.histories;
    // Find all selected batches
    const selectedBatches = histories.filter(b => batchIds.includes(b.id) && b.action === 'soft-deleted');
    // Collect all TEIs from these batches
    const allTeis = selectedBatches.flatMap(b => b.teis || []);
    const teiUids = allTeis.map(tei => tei.id).filter(Boolean);
    if (!teiUids.length) return;
    // Call restoreTeis action
    await dispatch(restoreTeis({ teiUids, teis: allTeis, engine }));
    // Optionally, reload migration history (if needed)
    // dispatch(loadMigrationHistory(engine));
};

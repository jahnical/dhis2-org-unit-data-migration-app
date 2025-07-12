// src/actions/undoMigration.js
// Redux actions for undo migration

// Action types
export const UNDO_MIGRATION_BATCH = 'UNDO_MIGRATION_BATCH'
export const UNDO_MIGRATION_SUCCESS = 'UNDO_MIGRATION_SUCCESS'
export const UNDO_MIGRATION_FAILURE = 'UNDO_MIGRATION_FAILURE'

// Action creators
export const undoMigrationBatch = (batch) => ({
    type: UNDO_MIGRATION_BATCH,
    payload: batch,
})

export const undoMigrationSuccess = (result) => ({
    type: UNDO_MIGRATION_SUCCESS,
    payload: result,
})

export const undoMigrationFailure = (error) => ({
    type: UNDO_MIGRATION_FAILURE,
    payload: error,
})

import { logHistoryBatchThunk } from './history'
import { migrationActions } from './migration'

// Helper to swap source/target org units in a batch
function swapOrgUnits(batch) {
    return {
        ...batch,
        action: 'undone',
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString(),
        sourceOrgUnit: batch.targetOrgUnit,
        targetOrgUnit: batch.sourceOrgUnit,
    }
}

// Main thunk
export const undoMigrationBatchesThunk = (batchIds, engine) => async (dispatch, getState) => {
    const { histories } = getState().history
    const batchesToUndo = histories.filter(b => batchIds.includes(b.id) && b.action === 'migrated')
    try {
        dispatch(undoMigrationBatch(batchIds))
        for (const batch of batchesToUndo) {
            // Prepare TEIs and swap org units
            const teis = batch.teis
            const selectedTeis = teis.map(tei => tei.id)
            const sourceOrgUnit = batch.targetOrgUnit.id
            const targetOrgUnit = batch.sourceOrgUnit.id
            const targetOrgUnitName = batch.sourceOrgUnit.name
            // Call migration logic with swapped org units
            await dispatch(migrationActions.migrateTEIs({
                teis,
                selectedTeis,
                targetOrgUnit,
                targetOrgUnitName,
                engine,
                onProgress: () => {},
            }))
            // Log undo to history
            const undoneBatch = swapOrgUnits(batch)
            await dispatch(logHistoryBatchThunk(undoneBatch, engine))
        }
        dispatch(undoMigrationSuccess(batchIds))
    } catch (error) {
        dispatch(undoMigrationFailure(error.message))
    }
}

// src/components/MigrationHistory/History.js
// Main component for the Migration History tab
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useDataEngine } from '@dhis2/app-runtime'
import MigrationHistoryTable from './MigrationHistoryTable'
import UndoMigrationButton from './UndoMigrationButton'
import UndoMigrationModal from './UndoMigrationModal'
import HistoryFilter from './HistoryFilter'
import RestoreButton from './RestoreButton'
import RestoreConfirmationModal from './RestoreConfirmationModal'
import { undoMigrationBatchesThunk } from '../../actions/undoMigration'
import { restoreTeisBatchesThunk } from '../../actions/restoreTeis'

const History = () => {
    const [selectedBatches, setSelectedBatches] = useState([])
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [filter, setFilter] = useState('all')
    const dispatch = useDispatch()
    const engine = useDataEngine()
    const histories = useSelector(state => state.history.histories)

    const handleUndoConfirm = (batchIds) => {
        // Dispatch the undo thunk
        dispatch(undoMigrationBatchesThunk(batchIds, engine))
    }
    const handleRestoreConfirm = (batchIds) => {
        dispatch(restoreTeisBatchesThunk(batchIds, engine))
    }

    // Filter histories by action type
    const filteredHistories = filter === 'all' ? histories : histories.filter(h => h.action === filter)

    // Batch selection safety logic
    function isBatchUndoable(batch) {
        return batch.action === 'migrated'
    }
    function isBatchRestorable(batch) {
        return batch.action === 'soft-deleted'
    }
    const selectedBatchObjs = filteredHistories.filter(b => selectedBatches.includes(b.id))
    const canUndo = selectedBatchObjs.length > 0 && selectedBatchObjs.every(isBatchUndoable)
    const canRestore = selectedBatchObjs.length > 0 && selectedBatchObjs.every(isBatchRestorable)

    return (
        <div>
            <div style={{ marginTop: 10, marginBottom: 10, fontWeight: 600, fontSize: 18, color: '#333' }}>
                {filteredHistories.length} migration batch{filteredHistories.length !== 1 ? 'es' : ''} in history
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <UndoMigrationButton selectedBatches={selectedBatches} onClick={() => setShowUndoModal(true)} disabled={!canUndo} />
                <RestoreButton selectedBatches={selectedBatches} onClick={() => setShowRestoreModal(true)} disabled={!canRestore} />
                <HistoryFilter value={filter} onFilterChange={setFilter} />
            </div>
            <MigrationHistoryTable onSelectionChange={setSelectedBatches} histories={filteredHistories} />
            <UndoMigrationModal open={showUndoModal} onClose={() => setShowUndoModal(false)} selectedBatches={selectedBatches} onConfirm={handleUndoConfirm} />
            <RestoreConfirmationModal open={showRestoreModal} onClose={() => setShowRestoreModal(false)} selectedBatches={selectedBatches} onConfirm={handleRestoreConfirm} />
        </div>
    )
}

export default History

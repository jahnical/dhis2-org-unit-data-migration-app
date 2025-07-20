// src/components/MigrationHistory/History.js
// Main component for the Migration History tab
import React, { useState } from 'react'
import { useAlert } from '@dhis2/app-runtime'
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
import { restoreTeis } from '../../actions/deletion'

const History = () => {
    const [selectedBatches, setSelectedBatches] = useState([])
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [filter, setFilter] = useState('all')
    const dispatch = useDispatch()
    const engine = useDataEngine()
    const histories = useSelector(state => state.history.histories)

    // Select all inactive (deleted) TEIs for the 'Deleted (Current)' filter
    const [selectedDeletedTeis, setSelectedDeletedTeis] = useState([])
    const [restoring, setRestoring] = useState(false)
    const [showRestoreDeletedModal, setShowRestoreDeletedModal] = useState(false)
    const alert = useAlert()
    const deletedTeis = useSelector(state =>
        state.dataControl && state.dataControl.teis
            ? state.dataControl.teis.filter(tei => tei.deleted)
            : (state.deleteTeis.teis || []).filter(tei => tei.deleted)
    )

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

    // For deleted-current: enable restore if at least one deleted TEI is selected
    const canRestoreDeletedTeis = filter === 'deleted-current' && selectedDeletedTeis.length > 0;
    const canRestore = filter === 'deleted-current' ? canRestoreDeletedTeis : (selectedBatchObjs.length > 0 && selectedBatchObjs.every(isBatchRestorable));

    // Restore handler for current deleted TEIs

    const handleRestoreDeletedTeis = async () => {
        if (!selectedDeletedTeis.length) return;
        setShowRestoreDeletedModal(true);
    };

    const confirmRestoreDeletedTeis = async () => {
        setRestoring(true);
        try {
            // Find the full TEI objects
            const teisToRestore = deletedTeis.filter(tei => selectedDeletedTeis.includes(tei.id));
            const teiUids = teisToRestore.map(tei => tei.id);
            // Call the actual restore logic (which clones the TEI as in teis.js)
            await dispatch(restoreTeis({ teiUids, teis: teisToRestore, engine }));
            alert.show('Successfully restored TEI(s).', { success: true });
        } catch (e) {
            alert.show('Failed to restore TEI(s).', { critical: true });
        } finally {
            setRestoring(false);
            setSelectedDeletedTeis([]);
            setShowRestoreDeletedModal(false);
        }
    };

    const handleUndoConfirm = (batchIds) => {
        // Dispatch the undo thunk
        dispatch(undoMigrationBatchesThunk(batchIds, engine))
    }
    const handleRestoreConfirm = (batchIds) => {
        dispatch(restoreTeisBatchesThunk(batchIds, engine))
    }

    return (
        <div>
            <div style={{ marginTop: 10, marginBottom: 10, fontWeight: 600, fontSize: 18, color: '#333' }}>
                {filter === 'deleted-current'
                    ? `${deletedTeis.length} currently deleted TEI${deletedTeis.length !== 1 ? 's' : ''}`
                    : `${filteredHistories.length} migration batch${filteredHistories.length !== 1 ? 'es' : ''} in history`}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <UndoMigrationButton selectedBatches={selectedBatches} onClick={() => setShowUndoModal(true)} disabled={!canUndo} />
                <RestoreButton selectedBatches={selectedBatches} onClick={() => setShowRestoreModal(true)} disabled={!canRestore} />
                <HistoryFilter value={filter} onFilterChange={setFilter} />
            </div>
            {filter === 'deleted-current' ? (
                deletedTeis.length === 0 ? (
                    <div style={{ color: '#888', textAlign: 'center', margin: '32px 0' }}>
                        No deleted TEIs found. Only inactive (deleted) TEIs are shown here.
                    </div>
                ) : (
                    <MigrationHistoryTable
                        histories={deletedTeis.map(tei => ({
                            id: tei.id,
                            timestamp: tei.lastUpdated || tei.created || '',
                            teiUid: tei.id,
                            program: { name: tei.program?.name || tei.programName || tei.enrollmentProgramName || '' },
                            sourceOrgUnit: { name: tei.orgUnitName || tei.orgUnit?.name || tei.enrollmentOrgUnitName || tei.orgUnitNameFromLookup || '' },
                            targetOrgUnit: { name: tei.targetOrgUnitName || tei.targetOrgUnit?.name || tei.targetOrgUnit || '' },
                            user: { name: tei.storedBy || (tei.lastUpdatedBy && tei.lastUpdatedBy.username) || tei.createdBy || tei.user || '' },
                            action: selectedDeletedTeis.includes(tei.id) ? 'restored' : 'deleted',
                            teis: [tei],
                        }))}
                        onSelectionChange={setSelectedDeletedTeis}
                        customColumns={['timestamp', 'program', 'sourceOrgUnit', 'targetOrgUnit', 'user', 'action']}
                        selectedBatches={selectedDeletedTeis}
                        onRestore={handleRestoreDeletedTeis}
                        canRestore={canRestore && !restoring}
                    />
                )
            ) : (
                <>
                    <MigrationHistoryTable
                        histories={filteredHistories.map(batch => ({
                            ...batch,
                            program: batch.program || { name: batch.programName || batch.enrollmentProgramName || '' },
                            sourceOrgUnit: batch.sourceOrgUnit || { name: batch.orgUnitName || (batch.orgUnit && batch.orgUnit.name) || batch.enrollmentOrgUnitName || batch.orgUnitNameFromLookup || '' },
                            targetOrgUnit: batch.targetOrgUnit || { name: batch.targetOrgUnitName || (batch.targetOrgUnit && batch.targetOrgUnit.name) || batch.targetOrgUnit || '' },
                            user: batch.user || { name: batch.storedBy || (batch.lastUpdatedBy && batch.lastUpdatedBy.username) || batch.createdBy || batch.user || '' },
                        }))}
                        onSelectionChange={setSelectedBatches}
                        customColumns={['timestamp', 'program', 'sourceOrgUnit', 'targetOrgUnit', 'user', 'action']}
                        selectedBatches={selectedBatches}
                    />
                    <UndoMigrationModal open={showUndoModal} onClose={() => setShowUndoModal(false)} selectedBatches={selectedBatches} onConfirm={handleUndoConfirm} />
                    <RestoreConfirmationModal open={showRestoreModal} onClose={() => setShowRestoreModal(false)} selectedBatches={selectedBatches} onConfirm={handleRestoreConfirm} />
                </>
            )}
            {/* Restore confirmation modal for deleted TEIs */}
            {showRestoreDeletedModal && selectedDeletedTeis.length > 0 && (
                <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 8, maxWidth: 400, margin: '120px auto', padding: 24, boxShadow: '0 2px 16px #0002', textAlign: 'center' }}>
                        <h3>Confirm Restore</h3>
                        <p>Are you sure you want to restore the selected TEI(s)?</p>
                        <div style={{ margin: '16px 0' }}>
                            {selectedDeletedTeis.map(id => (
                                <div key={id} style={{ fontFamily: 'monospace', fontSize: 14 }}>{id}</div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                            <button onClick={() => setShowRestoreDeletedModal(false)} disabled={restoring} style={{ padding: '6px 18px' }}>Cancel</button>
                            <button onClick={confirmRestoreDeletedTeis} disabled={restoring} style={{ padding: '6px 18px', background: '#00796b', color: '#fff', border: 'none', borderRadius: 4 }}>Restore</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default History

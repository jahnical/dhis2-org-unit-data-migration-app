// src/components/MigrationHistory/History.js
import React, { useState } from 'react'
import { useAlert } from '@dhis2/app-runtime'
import { useDispatch, useSelector } from 'react-redux'
import { useDataEngine } from '@dhis2/app-runtime'
import MigrationHistoryTable from './MigrationHistoryTable';
import { useDeletionHistoryLogic } from '../DeletionHistory/DeletionHistory';
import RestoreDeletedButton from '../DeletionHistory/RestoreDeletedButton';
import RestoreDeletedModal from '../DeletionHistory/RestoreDeletedModal';
import UndoMigrationButton from './UndoMigrationButton';
import UndoMigrationModal from './UndoMigrationModal';
import HistoryFilter from './HistoryFilter';
import RestoreButton from './RestoreButton';
import RestoreConfirmationModal from './RestoreConfirmationModal';
import { undoMigrationBatchesThunk } from '../../actions/undoMigration';
import { restoreTeisBatchesThunk } from '../../actions/restoreTeis';
import { newRestoreTEI } from '../../api/teis';
import { acAddMetadata } from '../../actions/metadata';

const History = () => {
    // Add missing handlers for undo and restore
    const handleUndoConfirm = (batchIds) => {
        dispatch(undoMigrationBatchesThunk(batchIds, engine));
    };

    const handleRestoreConfirm = (batchIds) => {
        dispatch(restoreTeisBatchesThunk(batchIds, engine));
    };
    const [selectedBatches, setSelectedBatches] = useState([])
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [filter, setFilter] = useState('all')
    const dispatch = useDispatch()
    const engine = useDataEngine()
    const histories = useSelector(state => state.history.histories)

    const deletion = useDeletionHistoryLogic();

    function isBatchUndoable(batch) {
        return batch.action === 'migrated';
    }
    function isBatchRestorable(batch) {
        return batch.action === 'soft-deleted';

    }
    const selectedBatchObjs = histories
        .filter(h => filter === 'all' || h.action === filter)
        .filter(b => selectedBatches.includes(b.id));
    const canUndo = selectedBatchObjs.length > 0 && selectedBatchObjs.every(isBatchUndoable);

    return (
        <div>
            <div style={{ marginTop: 10, marginBottom: 10, fontWeight: 600, fontSize: 18, color: '#333' }}>
                {filter === 'deleted'
                    ? `${deletion?.deletedTeis.length || 0} deleted TEI${deletion?.deletedTeis.length !== 1 ? 's' : ''}`
                    : `${histories.filter(h => filter === 'all' || h.action === filter).length} migration batch${histories.length !== 1 ? 'es' : ''} in history`}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                {filter === 'deleted' ? (
                    <>
                        <UndoMigrationButton selectedBatches={deletion.selectedDeletedTeis} onClick={() => {}} disabled={!deletion.canUndo} />
                        <RestoreDeletedButton
                            selectedTeis={deletion.selectedDeletedTeis}
                            onClick={deletion.handleRestoreDeletedTeis}
                            disabled={!deletion.canRestoreDeletedTeis || deletion.restoring}
                        />
                        <HistoryFilter value={filter} onFilterChange={setFilter} />
                    </>
                ) : (
                    <>
                        <UndoMigrationButton selectedBatches={selectedBatches} onClick={() => setShowUndoModal(true)} disabled={!canUndo} />
                        <HistoryFilter value={filter} onFilterChange={setFilter} />
                    </>
                )}
            </div>
            {filter === 'deleted' ? (
                deletion.deletedTeis.length === 0 ? (
                    <div style={{ color: '#888', textAlign: 'center', margin: '32px 0' }}>
                        No deleted TEIs found. Only inactive (deleted) TEIs are shown here.
                    </div>
                ) : (
                    <MigrationHistoryTable
                        histories={deletion.histories}
                        onSelectionChange={ids => {
                            const validIds = ids.filter(id => deletion.deletedTeis.some(tei => tei.id === id));
                            deletion.setSelectedDeletedTeis(validIds);
                        }}
                        customColumns={['timestamp', 'teiUid', 'program', 'orgUnit', 'user', 'action']}
                        selectedBatches={deletion.selectedDeletedTeis}
                        onRestore={deletion.handleRestoreDeletedTeis}
                        canRestore={deletion.canRestoreDeletedTeis && !deletion.restoring}
                    />
                )
            ) : (
                <>
                    <MigrationHistoryTable
                        histories={histories
                            .filter(h => filter === 'all' || h.action === filter)
                            .map(batch => ({
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
            {filter === 'deleted' && deletion.showRestoreDeletedModal && deletion.selectedDeletedTeis.length > 0 && (
                <RestoreDeletedModal
                    open={deletion.showRestoreDeletedModal}
                    onClose={() => deletion.setShowRestoreDeletedModal(false)}
                    selectedTeis={deletion.selectedDeletedTeis}
                    onConfirm={deletion.confirmRestoreDeletedTeis}
                    restoring={deletion.restoring}
                />
            )}
        </div>
    );

    return (
        <div>
            <div style={{ marginTop: 10, marginBottom: 10, fontWeight: 600, fontSize: 18, color: '#333' }}>
                {filter === 'deleted'
                    ? `${deletion?.deletedTeis.length || 0} deleted TEI${deletion?.deletedTeis.length !== 1 ? 's' : ''}`
                    : `${histories.filter(h => filter === 'all' || h.action === filter).length} migration batch${histories.length !== 1 ? 'es' : ''} in history`}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                {filter === 'deleted' ? (
                    <>
                        <UndoMigrationButton selectedBatches={deletion.selectedDeletedTeis} onClick={() => {}} disabled={!deletion.canUndo} />
                        <RestoreButton
                            selectedBatches={deletion.selectedDeletedTeis}
                            onClick={deletion.handleRestoreDeletedTeis}
                            disabled={!deletion.canRestoreDeletedTeis || deletion.restoring}
                        />
                        <HistoryFilter value={filter} onFilterChange={setFilter} />
                    </>
                ) : (
                    <>
                        <UndoMigrationButton selectedBatches={selectedBatches} onClick={() => setShowUndoModal(true)} disabled={!canUndo} />
                        <HistoryFilter value={filter} onFilterChange={setFilter} />
                    </>
                )}
            </div>
            {filter === 'deleted' ? (
                deletion.deletedTeis.length === 0 ? (
                    <div style={{ color: '#888', textAlign: 'center', margin: '32px 0' }}>
                        No deleted TEIs found. Only inactive (deleted) TEIs are shown here.
                    </div>
                ) : (
                    <MigrationHistoryTable
                        histories={deletion.histories}
                        onSelectionChange={ids => {
                            const validIds = ids.filter(id => deletion.deletedTeis.some(tei => tei.id === id));
                            deletion.setSelectedDeletedTeis(validIds);
                        }}
                        customColumns={['timestamp', 'teiUid', 'program', 'orgUnit', 'user', 'action']}
                        selectedBatches={deletion.selectedDeletedTeis}
                        onRestore={deletion.handleRestoreDeletedTeis}
                        canRestore={deletion.canRestoreDeletedTeis && !deletion.restoring}
                    />
                )
            ) : (
                <>
                    <MigrationHistoryTable
                        histories={histories
                            .filter(h => filter === 'all' || h.action === filter)
                            .map(batch => ({
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
            {filter === 'deleted' && deletion.showRestoreDeletedModal && deletion.selectedDeletedTeis.length > 0 && (
                <RestoreDeletedModal
                    open={deletion.showRestoreDeletedModal}
                    onClose={() => deletion.setShowRestoreDeletedModal(false)}
                    selectedTeis={deletion.selectedDeletedTeis}
                    onConfirm={deletion.confirmRestoreDeletedTeis}
                    restoring={deletion.restoring}
                />
            )}
        </div>
    );
}
export default History;
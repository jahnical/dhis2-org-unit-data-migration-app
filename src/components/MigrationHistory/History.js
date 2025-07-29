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
import RestoreConfirmationModal from './RestoreConfirmationModal';
import { undoMigrationBatchesThunk } from '../../actions/undoMigration';
import { restoreTeisBatchesThunk } from '../../actions/restoreTeis';
import { fetchAndStoreMetadataThunk } from '../../actions/fetchAndStoreMetadataThunk';

const History = () => {
    const { show: showAlert } = useAlert();
    const engine = useDataEngine();
    const dispatch = useDispatch();
    const deletion = useDeletionHistoryLogic();
    const histories = useSelector(state => state.history.histories)
    const metadata = useSelector(state => state.metadata)

    // Fetch and store program/orgUnit names after deleted TEIs are loaded
    React.useEffect(() => {
        if (deletion.deletedTeis && deletion.deletedTeis.length > 0) {
            dispatch(fetchAndStoreMetadataThunk(deletion.deletedTeis, engine));
        }
    }, [deletion.deletedTeis, dispatch, engine]);

    const handleUndoConfirm = (batchIds) => {
        dispatch(undoMigrationBatchesThunk(batchIds, engine));
    };
    const handleRestoreConfirm = async (batchIds) => {
        try {
            await dispatch(restoreTeisBatchesThunk(batchIds, engine));
            showAlert({ message: 'Successfully restored deleted TEIs.', type: 'success' });
        } catch (error) {
            showAlert({ message: 'Failed to restore deleted TEIs.', type: 'critical' });
        }
    };
    const [selectedBatches, setSelectedBatches] = useState([])
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [filter, setFilter] = useState('all')

    const [currentUser, setCurrentUser] = useState({});
    React.useEffect(() => {
        async function fetchUser() {
            try {
                const { me } = await engine.query({ me: { resource: 'me' } });
                setCurrentUser(me);
            } catch (e) {
                setCurrentUser({});
            }
        }
        if (engine) fetchUser();
    }, [engine]);

    function handleUndoConfirm(batchIds) {
        dispatch(undoMigrationBatchesThunk(batchIds, engine, currentUser));
    };
    function handleRestoreConfirm(batchIds) {
        dispatch(restoreTeisBatchesThunk(batchIds, engine));
    };

    // Filter histories by action type
    const filteredHistories = filter === 'all' ? histories : histories.filter(h => h.action === filter)
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

    // Memoize mapped histories for deleted TEIs for performance
    const mappedDeletedTeis = React.useMemo(() => {
        return deletion.deletedTeis.map(tei => {
            const programIds = [];
            const orgUnitIds = [];
            if (tei.enrollments && tei.enrollments.length > 0) {
                tei.enrollments.forEach(enr => {
                    if (enr.program) programIds.push(enr.program);
                    if (enr.orgUnit) orgUnitIds.push(enr.orgUnit);
                });
            }
            if (tei.program) programIds.push(tei.program);
            if (tei.orgUnit) orgUnitIds.push(tei.orgUnit);
            if (tei.orgUnitId) orgUnitIds.push(tei.orgUnitId);

            // Remove duplicates
            const uniqueProgramIds = Array.from(new Set(programIds));
            const uniqueOrgUnitIds = Array.from(new Set(orgUnitIds));

            // Map all program and orgUnit names (or IDs if missing)
            const programNames = uniqueProgramIds.map(pid => {
                const name = metadata.programs && metadata.programs[pid]?.name;
                if (typeof name === 'string' && name.trim() !== '') {
                    return name;
                }
                if (pid) {
                    return pid;
                }
                return 'Unknown';
            });
            const orgUnitNames = uniqueOrgUnitIds.map(oid => {
                const name = metadata.orgUnits && metadata.orgUnits[oid]?.name;
                if (typeof name === 'string' && name.trim() !== '') {
                    return name;
                }
                if (oid) {
                    return oid;
                }
                return 'Unknown';
            });
            const userName = tei.createdBy || tei.storedBy || (tei.lastUpdatedBy && tei.lastUpdatedBy.username) || tei.user || (tei.lastUpdatedByUserInfo && tei.lastUpdatedByUserInfo.username) || 'Unknown';

            return {
                id: tei.id,
                timestamp: tei.lastUpdated || tei.created || '',
                teiUid: tei.id,
                program: { name: programNames.join(', ') },
                orgUnit: { name: orgUnitNames.join(', ') },
                user: { name: userName || 'Unknown' },
                action: 'deleted',
                teis: [tei],
            };
        });
    }, [deletion.deletedTeis, metadata]);

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
                        histories={mappedDeletedTeis}
                        showDeleted={true}
                        onSelectionChange={ids => {
                            if (ids.length === mappedDeletedTeis.length) {
                                deletion.setSelectedDeletedTeis(mappedDeletedTeis.map(tei => tei.id));
                            } else {
                                deletion.setSelectedDeletedTeis(ids);
                            }
                        }}
                        customColumns={['timestamp', 'teiUid', 'program', 'orgUnit', 'user', 'action']}
                        selectedBatches={deletion.selectedDeletedTeis}
                        canRestore={deletion.canRestoreDeletedTeis && !deletion.restoring}
                        metadata={metadata}
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
                        showDeleted={false}
                        onSelectionChange={setSelectedBatches}
                        customColumns={['timestamp', 'program', 'sourceOrgUnit', 'targetOrgUnit', 'user', 'action']}
                        selectedBatches={selectedBatches}
                    />
                    <UndoMigrationModal
                        open={showUndoModal}
                        onClose={() => setShowUndoModal(false)}
                        selectedBatches={selectedBatches}
                        engine={engine}
                        currentUser={currentUser}
                        histories={histories}
                        onConfirm={handleUndoConfirm}
                    />
                    <RestoreConfirmationModal open={showRestoreModal} onClose={() => setShowRestoreModal(false)} selectedBatches={selectedBatches} onConfirm={handleRestoreConfirm} />
                </>
            )}
            {/* Restore confirmation modal for deleted TEIs */}
            {filter === 'deleted' && deletion.showRestoreDeletedModal && (
                <RestoreDeletedModal
                    open={deletion.showRestoreDeletedModal}
                    onClose={() => {
                        deletion.setShowRestoreDeletedModal(false);
                        deletion.setRestoreComplete(false);
                        deletion.setRestoreError(null);
                    }}
                    selectedTeis={deletion.selectedDeletedTeis}
                    onConfirm={deletion.confirmRestoreDeletedTeis}
                    restoring={deletion.restoring}
                    restoreComplete={deletion.restoreComplete}
                    restoreProgress={deletion.restoreProgress}
                    restoreError={deletion.restoreError}
                />
            )}
        </div>
    );
}
export default History;

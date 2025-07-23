// src/components/DeletionHistory/DeletionHistory.js
import { useState } from 'react';
import { useAlert } from '@dhis2/app-runtime';
import { useDispatch, useSelector } from 'react-redux';
import { useDataEngine } from '@dhis2/app-runtime';
import MigrationHistoryTable from '../MigrationHistory/MigrationHistoryTable';
import { dataControlSelectors } from '../../reducers/data_controls';
import UndoMigrationButton from '../MigrationHistory/UndoMigrationButton';
import RestoreButton from '../MigrationHistory/RestoreButton';
import HistoryFilter from '../MigrationHistory/HistoryFilter';
import { newRestoreTEI } from '../../api/teis';

// Modular hook for deleted TEI restore logic
export function useDeletionHistoryLogic() {
    const [selectedDeletedTeis, setSelectedDeletedTeis] = useState([]);
    const [restoring, setRestoring] = useState(false);
    const [showRestoreDeletedModal, setShowRestoreDeletedModal] = useState(false);
    const dispatch = useDispatch();
    const engine = useDataEngine();
    const alert = useAlert();
    const deletedTeis = useSelector(dataControlSelectors.getDeletedTEIs);

    // Show org unit name, not ID
    const histories = deletedTeis.map(tei => ({
        id: tei.id,
        timestamp: tei.lastUpdated || tei.created || '',
        teiUid: tei.id,
        program: { name: tei.program?.name || tei.programName || tei.enrollmentProgramName || tei.programNameFromLookup || '' },
        orgUnit: { name: tei.orgUnitName || tei.orgUnitNameFromLookup || tei.orgUnit?.name || tei.enrollmentOrgUnitName || tei.orgUnit || '' },
        user: { name: tei.createdBy || tei.storedBy || (tei.lastUpdatedBy && tei.lastUpdatedBy.username) || tei.user || (tei.lastUpdatedByUserInfo && tei.lastUpdatedByUserInfo.username) || '' },
        action: 'deleted',
        teis: [tei],
    }));

    const canRestoreDeletedTeis = selectedDeletedTeis.length > 0;
    const canUndo = false; // Undo logic for deleted TEIs can be implemented if needed

    const handleRestoreDeletedTeis = async () => {
        if (!selectedDeletedTeis.length) return;
        setShowRestoreDeletedModal(true);
    };

    const confirmRestoreDeletedTeis = async () => {
        setRestoring(true);
        try {
            const teisToRestore = deletedTeis.filter(tei => selectedDeletedTeis.includes(tei.id));
            await newRestoreTEI(engine, teisToRestore);
            dispatch({ type: 'TEIS_MARK_RESTORED', payload: selectedDeletedTeis });
            alert.show('Successfully restored TEI(s).', { success: true });
        } catch (e) {
            alert.show('Failed to restore TEI(s).', { critical: true });
        } finally {
            setRestoring(false);
            setSelectedDeletedTeis([]);
            setShowRestoreDeletedModal(false);
        }
    };

    return {
        histories,
        selectedDeletedTeis,
        setSelectedDeletedTeis,
        restoring,
        showRestoreDeletedModal,
        setShowRestoreDeletedModal,
        canRestoreDeletedTeis,
        canUndo,
        handleRestoreDeletedTeis,
        confirmRestoreDeletedTeis,
        deletedTeis,
    };
}


import { useState } from 'react';
import { useEffect } from 'react';
import { useAlert } from '@dhis2/app-runtime';
import { useDispatch } from 'react-redux';
import { useDataEngine } from '@dhis2/app-runtime';
import { newRestoreTEI } from '../../api/teis';
import { getDataStoreDeletedTeis } from '../../utils/datastoreActions';

export function useDeletionHistoryLogic() {
    const [selectedDeletedTeis, setSelectedDeletedTeis] = useState([]);
    const [restoring, setRestoring] = useState(false);
    const [showRestoreDeletedModal, setShowRestoreDeletedModal] = useState(false);
    const [deletedTeis, setDeletedTeis] = useState([]);
    const dispatch = useDispatch();
    const engine = useDataEngine();
    const alert = useAlert();
    useEffect(() => {
        (async () => {
            try {
                const teis = await getDataStoreDeletedTeis(engine);
                setDeletedTeis(teis);
            } catch (e) {
                setDeletedTeis([]);
            }
        })();
    }, [engine]);

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

    const handleRestoreDeletedTeis = async () => {
        if (!selectedDeletedTeis.length) return;
        setShowRestoreDeletedModal(true);
    };

    const confirmRestoreDeletedTeis = async () => {
        setRestoring(true);
        let success = false;
        try {
            const teisToRestore = deletedTeis.filter(tei => selectedDeletedTeis.includes(tei.id));
            await newRestoreTEI(engine, teisToRestore);
            dispatch({ type: 'TEIS_MARK_RESTORED', payload: selectedDeletedTeis });
            alert.show({ message: 'Successfully restored TEI(s).', type: 'success' });
            success = true;
        } catch (e) {
            alert.show({ message: 'Failed to restore TEI(s).', type: 'critical' });
            success = false;
        }
        setRestoring(false);
        // Only reset after alert is shown and restore completes
        if (success) {
            setSelectedDeletedTeis([]);
            setShowRestoreDeletedModal(false);
        }
        return success;
    };

    return {
        histories,
        selectedDeletedTeis,
        setSelectedDeletedTeis,
        restoring,
        showRestoreDeletedModal,
        setShowRestoreDeletedModal,
        canRestoreDeletedTeis,
        handleRestoreDeletedTeis,
        confirmRestoreDeletedTeis,
        deletedTeis,
    };
}

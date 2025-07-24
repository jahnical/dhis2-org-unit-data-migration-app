
import { useState, useRef, useEffect } from 'react';
import { useAlert } from '@dhis2/app-runtime';
import { useDispatch } from 'react-redux';
import { useDataEngine } from '@dhis2/app-runtime';
import { newRestoreTEI } from '../../api/teis';
import { getDataStoreDeletedTeis } from '../../utils/datastoreActions';

export function useDeletionHistoryLogic() {
    const [selectedDeletedTeis, setSelectedDeletedTeis] = useState([]);
    const [restoring, setRestoring] = useState(false);
    const [showRestoreDeletedModal, setShowRestoreDeletedModal] = useState(false);
    const [restoreComplete, setRestoreComplete] = useState(false);
    const [restoreError, setRestoreError] = useState(null);
    const [deletedTeis, setDeletedTeis] = useState([]);
    const dispatch = useDispatch();
    const engine = useDataEngine();
    const alert = useAlert();
    const [restoreProgress, setRestoreProgress] = useState(null);
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);
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
        setRestoreComplete(false);
        setRestoreError(null);
        setShowRestoreDeletedModal(true);
    };

    const confirmRestoreDeletedTeis = async () => {
        setRestoring(true);
        setRestoreError(null);
        setRestoreProgress({ batch: 0, totalBatches: 1, restored: 0, total: selectedDeletedTeis.length });
        let success = false;
        try {
            const teisToRestore = deletedTeis.filter(tei => selectedDeletedTeis.includes(tei.id));
            const onProgress = ({ batch, totalBatches, restored, total }) => {
                if (isMounted.current) setRestoreProgress({ batch, totalBatches, restored, total });
            };
            await newRestoreTEI(engine, teisToRestore, 20, onProgress);
            dispatch({ type: 'TEIS_MARK_RESTORED', payload: selectedDeletedTeis });
            if (isMounted.current) setDeletedTeis(prev => prev.filter(tei => !selectedDeletedTeis.includes(tei.id)));
            //alert.show({ message: 'Successfully restored TEI(s).', type: 'success' });
            success = true;
        } catch (e) {
            let errorMsg = e && e.message ? e.message : 'Failed to restore TEI(s).';
            setRestoreError(errorMsg);
            //alert.show({ message: 'Failed to restore TEI(s).', type: 'critical' });
            success = false;
        }
        if (isMounted.current) setRestoring(false);
        if (success && isMounted.current) {
            setRestoreComplete(true);
            setSelectedDeletedTeis([]);
            setRestoreProgress(null);
            getDataStoreDeletedTeis(engine).then(teis => { if (isMounted.current) setDeletedTeis(teis); }).catch(() => {});
            getDataStoreDeletedTeis(engine).then(teis => { if (isMounted.current) setDeletedTeis(teis); }).catch(() => {});
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
        restoreComplete,
        setRestoreComplete,
        restoreError,
        setRestoreError,
        canRestoreDeletedTeis,
        handleRestoreDeletedTeis,
        confirmRestoreDeletedTeis,
        deletedTeis,
        restoreProgress,
    };
}

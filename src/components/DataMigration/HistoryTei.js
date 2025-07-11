import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Modal, ModalTitle, ModalContent, ModalActions,
    ButtonStrip, Button, Table, TableBody, TableCell,
    TableHead, TableRow, TableCellHead, TableRowHead,
    Checkbox, DropdownButton, Menu, MenuItem,
    CircularLoader, NoticeBox, AlertBar
} from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useDataEngine } from '@dhis2/app-runtime';

import {
    sGetHistoryTeis, sGetHistoryTeisIsLoading, sGetHistoryTeisError,
    sGetHistorySelectedTeis, sGetHistoryTeisAttributesToDisplay
} from '../../reducers/historyTeis';

import {
    setHistoryTeis, setHistoryTeisLoading, setHistoryTeisError,
    setHistorySelectedTeis
} from '../../actions/historyTeis';

import { restoreTeis } from '../../actions/deletion';
import { dataActionCreators } from '../../actions/data_controls';
import { deletionSelectors } from '../../reducers/deletion';
import { dataControlSelectors } from '../../reducers/data_controls';
import classes from './styles/Common.module.css';

const MAX_SAFE_HISTORY_ROWS = 500;
const MAX_DISPLAY_ROWS = 100;

const HistoryTei = () => {
    const dispatch = useDispatch();
    const engine = useDataEngine();

    // Redux state selectors
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit);
    const programId = useSelector(dataControlSelectors.getDataControlProgram);
    const teis = useSelector(sGetHistoryTeis);
    const loading = useSelector(sGetHistoryTeisIsLoading);
    const error = useSelector(sGetHistoryTeisError);
    const selectedTeis = useSelector(sGetHistorySelectedTeis);
    const attributesToDisplay = useSelector(sGetHistoryTeisAttributesToDisplay);
    const restoreLoading = useSelector(deletionSelectors.getDeletionIsLoading);

    // Local state
    const [status, setStatus] = useState('deleted');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreSummary, setRestoreSummary] = useState(null);

    // Memoized data
    const deletedTeis = useMemo(() => 
        (teis || []).filter(tei => tei.deleted === true && tei.trackedEntityInstance), 
        [teis]
    );
    const displayTeis = useMemo(() => 
        status === 'deleted' ? deletedTeis.slice(0, MAX_DISPLAY_ROWS) : [], 
        [status, deletedTeis]
    );

    // Fetch TEIs when orgUnit or program changes
    useEffect(() => {
        if (!orgUnitId || !programId) {
            dispatch(setHistoryTeis([]));
            return;
        }

        const fetchTEIs = async () => {
            dispatch(setHistoryTeisLoading(true));
            try {
                const result = await dispatch(dataActionCreators.fetchTEIs(orgUnitId, programId, engine));
                dispatch(setHistoryTeis(result));
            } catch (e) {
                dispatch(setHistoryTeisError(e));
            } finally {
                dispatch(setHistoryTeisLoading(false));
            }
        };

        fetchTEIs();
    }, [dispatch, engine, orgUnitId, programId]);

    // Handle TEI selection
    const handleSelectTei = (teiId) => {
        const updated = selectedTeis.includes(teiId)
            ? selectedTeis.filter(id => id !== teiId)
            : [...selectedTeis, teiId];
        dispatch(setHistorySelectedTeis(updated));
    };

    // Handle select all
    const handleSelectAll = (checked) => {
        dispatch(setHistorySelectedTeis(
            checked ? displayTeis.map(tei => tei.trackedEntityInstance) : []
        ));
    };

 const handleRestore = async () => {
    setRestoreSummary(null);
    
    const restorableTeis = displayTeis.filter(
        tei => selectedTeis.includes(tei.trackedEntityInstance) && tei.deleted
    );
    
    if (restorableTeis.length === 0) {
        setRestoreSummary({
            success: [],
            error: i18n.t('No restorable TEIs selected')
        });
        return;
    }

    try {
        setRestoreSummary({
            success: [],
            error: null,
            loading: true
        });

        const results = await Promise.allSettled(
            restorableTeis.map(tei => 
                dispatch(restoreTeis({
                    teiUids: [tei.trackedEntityInstance],
                    engine,
                    orgUnitId,
                    programId,
                    fetchAfterRestore: () => dispatch(
                        dataActionCreators.fetchTEIs(orgUnitId, programId, engine)
                    )
                }))
            )
        );

        const success = [];
        const errors = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                success.push(restorableTeis[index].trackedEntityInstance);
            } else {
                errors.push(
                    `${restorableTeis[index].trackedEntityInstance}: ${result.reason.message}`
                );
            }
        });

        setRestoreSummary({
            success,
            error: errors.length ? errors.join(', ') : null
        });

        dispatch(setHistorySelectedTeis([]));
        setShowRestoreModal(false);
    } catch (error) {
        setRestoreSummary({
            success: [],
            error: error.message || i18n.t('Restore failed')
        });
    }
};

    // Loading state
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <CircularLoader />
            </div>
        );
    }

    // Validation states
    if (!orgUnitId || !programId) {
        return (
            <NoticeBox warning title={i18n.t('No filters selected')}>
                {i18n.t('Please select an organisation unit and program to view deleted TEIs.')}
            </NoticeBox>
        );
    }

    if (deletedTeis.length > MAX_SAFE_HISTORY_ROWS) {
        return (
            <NoticeBox error title={i18n.t('Too many deleted TEIs to display')}>
                {i18n.t('Please narrow your filters to view deleted TEIs.')}
            </NoticeBox>
        );
    }

    if (!loading && deletedTeis.length === 0) {
        return (
            <NoticeBox title={i18n.t('No deleted TEIs found')}>
                {i18n.t('There are no deleted TEIs for the selected filters.')}
            </NoticeBox>
        );
    }

    return (
        <div className={classes.container}>
            {/* Fixed AlertBar implementation */}
            {restoreSummary && (
                <AlertBar 
                    duration={8000}
                    {...(restoreSummary.error ? { critical: true } : { success: true })}
                >
                    {restoreSummary.success.length > 0 && restoreSummary.error ? (
                        `${i18n.t('Successfully restored {{count}} TEIs', { count: restoreSummary.success.length })}. ${restoreSummary.error}`
                    ) : restoreSummary.success.length > 0 ? (
                        i18n.t('Successfully restored {{count}} TEIs', { count: restoreSummary.success.length })
                    ) : (
                        restoreSummary.error
                    )}
                </AlertBar>
            )}

            {/* Main Table */}
            <div className={classes.tableWrapper}>
                <div className={classes.tableHeader}>
                    <h4>{i18n.t('{{count}} Selected of Deleted TEIs', { count: selectedTeis.length })}</h4>

                    <DropdownButton
                        open={dropdownOpen}
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        button="Status"
                    >
                        <Menu>
                            <MenuItem
                                label="Deleted"
                                onClick={() => {
                                    setStatus('deleted');
                                    setDropdownOpen(false);
                                }}
                            />
                        </Menu>
                    </DropdownButton>
                </div>

                <Button 
                    disabled={!selectedTeis.length || restoreLoading}
                    onClick={() => setShowRestoreModal(true)}
                    className={classes.restoreButton}
                >
                    {restoreLoading ? (
                        <>
                            <CircularLoader small />
                            {i18n.t('Restoring...')}
                        </>
                    ) : i18n.t('Restore')}
                </Button>

                <Table>
                    <TableHead>
                        <TableRowHead>
                            <TableCellHead>
                                <Checkbox
                                    checked={selectedTeis.length === displayTeis.length && displayTeis.length > 0}
                                    indeterminate={selectedTeis.length > 0 && selectedTeis.length < displayTeis.length}
                                    onChange={({ checked }) => handleSelectAll(checked)}
                                />
                            </TableCellHead>
                            <TableCellHead>{i18n.t('Instance ID')}</TableCellHead>
                            <TableCellHead>{i18n.t('Created')}</TableCellHead>
                            <TableCellHead>{i18n.t('Last Updated')}</TableCellHead>
                            {attributesToDisplay.map(attr => (
                                <TableCellHead key={attr}>{attr}</TableCellHead>
                            ))}
                        </TableRowHead>
                    </TableHead>
                    <TableBody>
                        {displayTeis.map(tei => {
                            const teiId = tei.trackedEntityInstance;
                            return (
                                <TableRow key={teiId}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedTeis.includes(teiId)}
                                            onChange={() => handleSelectTei(teiId)}
                                        />
                                    </TableCell>
                                    <TableCell>{teiId}</TableCell>
                                    <TableCell>{new Date(tei.created).toLocaleString()}</TableCell>
                                    <TableCell>{new Date(tei.lastUpdated).toLocaleString()}</TableCell>
                                    {attributesToDisplay.map(attr => {
                                        const attribute = tei.attributes?.find(a => a.name === attr);
                                        return <TableCell key={attr}>{attribute?.value || ''}</TableCell>;
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Restore Confirmation Modal */}
            {showRestoreModal && (
                <Modal onClose={() => setShowRestoreModal(false)}>
                    <ModalTitle>{i18n.t('Confirm Restoration')}</ModalTitle>
                    <ModalContent>
                        {i18n.t('You are about to restore {{count}} TEIs. This will make them active again.', {
                            count: selectedTeis.length
                        })}
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button 
                                secondary 
                                onClick={() => setShowRestoreModal(false)}
                                disabled={restoreLoading}
                            >
                                {i18n.t('Cancel')}
                            </Button>
                            <Button 
                                primary 
                                onClick={handleRestore}
                                disabled={restoreLoading}
                            >
                                {restoreLoading ? (
                                    <>
                                        <CircularLoader small />
                                        {i18n.t('Restoring...')}
                                    </>
                                ) : i18n.t('Confirm Restore')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </div>
    );
};

export default HistoryTei;
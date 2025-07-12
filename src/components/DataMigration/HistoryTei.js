import { VALUE_TYPE_DATE, VALUE_TYPE_DATETIME } from '@dhis2/analytics';
import { Modal, ModalTitle, ModalContent, ModalActions, ButtonStrip, Button } from '@dhis2/ui';
import { useDataEngine } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableCellHead,
    CircularLoader,
    NoticeBox,
    TableRowHead,
    Checkbox,
    DropdownButton,
    Menu,
    MenuItem,
    AlertBar,
} from '@dhis2/ui';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deletionSelectors } from '../../reducers/deletion.js';
import { restoreTeis } from '../../actions/restoreTeis.js';
import {
    sGetHistoryTeisIsLoading,
    sGetHistoryTeisError,
    sGetHistoryTeis,
    sGetHistorySelectedTeis,
    sGetHistoryTeisAttributesToDisplay,
    sGetHistoryTeisFilters,
} from '../../reducers/historyTeis.js';
import {
    setHistoryTeisLoading,
    setHistoryTeisError,
    setHistoryTeis,
    setHistorySelectedTeis, 
    setHistoryTeisFilters,
} from '../../actions/historyTeis.js';
import { dataControlSelectors } from '../../reducers/data_controls.js';
import { dataActionCreators } from '../../actions/data_controls.js';
import { sGetMetadata } from '../../reducers/metadata.js';
import classes from './styles/Common.module.css';
import { APP_SOFT_DELETED_ATTR_ID } from '../../constants/appSoftDeletedAttrId.js';

const MAX_SAFE_HISTORY_ROWS = 500;
const MAX_DISPLAY_ROWS = 100;

const HistoryTei = () => {
    const loading = useSelector(sGetHistoryTeisIsLoading);
    const error = useSelector(sGetHistoryTeisError);
    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs);
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit);
    const programId = useSelector(dataControlSelectors.getDataControlProgram);
    const dispatch = useDispatch();
    const [status, setStatus] = useState('deleted');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreInProgress, setRestoreInProgress] = useState(false);
    const [restoreSuccess, setRestoreSuccess] = useState(false);
    const [restoreError, setRestoreError] = useState(null);
    const [selectedTeiDetails, setSelectedTeiDetails] = useState([]);
    const engine = useDataEngine();
    // Track mount status to avoid state update on unmounted
    const isMountedRef = React.useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Helper to check if a TEI is soft deleted by app attribute
    const isAppSoftDeleted = (tei) =>
        tei.attributes?.find(a => a.attribute === APP_SOFT_DELETED_ATTR_ID && a.value === 'true');

    // Only show soft-deleted TEIs by app attribute
    const deletedTeis = React.useMemo(() =>
        (allTeis || [])
            .filter(tei =>
                isAppSoftDeleted(tei) &&
                tei.deleted !== true &&
                (tei.orgUnit === orgUnitId || tei.ou === orgUnitId)
            )
            .map(tei => ({
                ...tei,
                id: tei.trackedEntityInstance || tei.id,
                storedBy: tei.storedBy || tei.createdByUserInfo?.username || '',
                createdBy: tei.createdByUserInfo || {},
                lastUpdatedBy: tei.lastUpdatedByUserInfo || {},
                owner: tei.owner || tei.programOwners?.[0]?.ownerOrgUnit || '',
            })),
        [allTeis, orgUnitId]
    );

    const selectedTeis = useSelector(sGetHistorySelectedTeis);
    const metadata = useSelector(sGetMetadata);
    const attributesToDisplay = useSelector(sGetHistoryTeisAttributesToDisplay);

    // Handle individual TEI selection
    const handleSelectTei = (teiId) => {
        const updatedSelection = selectedTeis.includes(teiId)
            ? selectedTeis.filter(id => id !== teiId)
            : [...selectedTeis, teiId];
        dispatch(setHistorySelectedTeis(updatedSelection));
    };

    // Handle select all checkbox
    const handleSelectAll = (checked) => {
        if (checked) {
            const allTeiIds = teis.map(tei => tei.id);
            dispatch(setHistorySelectedTeis(allTeiIds));
        } else {
            dispatch(setHistorySelectedTeis([]));
        }
    };

    // Show restore confirmation modal
    const handleShowRestoreModal = () => {
        const details = teis.filter(tei => selectedTeis.includes(tei.trackedEntityInstance || tei.id));
        setSelectedTeiDetails(details);
        setShowRestoreModal(true);
    };

    // Close restore modal and clear any alerts
    const handleCloseRestoreModal = () => {
        setShowRestoreModal(false);
    };

    // Restore handler
    const handleRestore = async () => {
        if (!engine) {
            console.error('Engine not available');
            setRestoreError(i18n.t('Engine not available. Please try again later.'));
            setTimeout(() => {
                setRestoreError(null);
            }, 5000);
            return;
        }
        setRestoreInProgress(true);
        try {
            const selectedTeiObjects = teis.filter(tei => selectedTeis.includes(tei.trackedEntityInstance || tei.id));
            // Use new restoreTeis action
            await dispatch(restoreTeis(
                engine,
                selectedTeiObjects,
                async () => {
                    // Optionally, fetch updated history TEIs here
                    // If you have a fetchHistoryTeis function, use it; otherwise, return an empty array or refetch logic
                    if (orgUnitId && programId) {
                        await dispatch(dataActionCreators.fetchTEIs(orgUnitId, programId, engine));
                    }
                    return [];
                }
            ));
            if (isMountedRef.current) {
                setRestoreSuccess(true);
                setTimeout(() => isMountedRef.current && setRestoreSuccess(false), 5000);
                dispatch(setHistorySelectedTeis([]));
                setShowRestoreModal(false);
            }
        } catch (error) {
            const errorMessage = error.message || i18n.t('Failed to restore TEIs. Please try again.');
            if (isMountedRef.current) setRestoreError(errorMessage);
        } finally {
            if (isMountedRef.current) setRestoreInProgress(false);
        }
    };

    const labelText = status === 'deleted'
        ? `${selectedTeis.length} Selected of Deleted Tracked Entity Instances`
        : `${selectedTeis.length} Selected of Migrated Tracked Entity Instances`;

    // Only show up to MAX_DISPLAY_ROWS, and if more than MAX_SAFE_HISTORY_ROWS, show warning and do not render table
    const teis = status === 'deleted' ? deletedTeis.slice(0, MAX_DISPLAY_ROWS) : [];

    // Always fetch TEIs (with includeDeleted) when orgUnit or program changes, even in History tab
    React.useEffect(() => {
        if (orgUnitId && programId) {
            if (engine) {
                dispatch(dataActionCreators.fetchTEIs(orgUnitId, programId, engine));
            }
        }
    }, [orgUnitId, programId, dispatch]);

    if (loading) {
        return <CircularLoader>{i18n.t('Loading TEI history...')}</CircularLoader>;
    }

    if (deletedTeis.length > MAX_SAFE_HISTORY_ROWS) {
        return (
            <NoticeBox error title={i18n.t('Too many deleted TEIs to display!')}>
                {i18n.t('There are too many deleted Tracked Entity Instances to display in the History tab. Please filter your org unit or program to reduce the number of deleted TEIs.')}
            </NoticeBox>
        );
    }

    return (
        <div style={{ height: '100%' }}>
            {restoreSuccess && (
                <AlertBar success onHidden={() => setRestoreSuccess(false)}>{i18n.t('Successfully restored TEIs.')}</AlertBar>
            )}
            {restoreError && (
                <AlertBar critical onHidden={() => setRestoreError(null)}>{restoreError}</AlertBar>
            )}
            {error ? (
                <NoticeBox error title={i18n.t('Could not load History TEIs')}>
                    {error?.message ||
                        i18n.t(
                            "The History TEIs couldn't be retrieved. Try again or contact your system administrator."
                        )}
                </NoticeBox>
            ) : (
                <div className={classes.tableWrapper}>
                    {/* Table label at the top */}
                    <div style={{ color: 'grey', display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                        <h4 style={{ marginLeft: '16px', marginBottom: 0 }}>{i18n.t(labelText)}</h4>
                    </div>
                    {/* Controls below the label */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <DropdownButton
                            onClick={() => setDropdownOpen((open) => !open)}
                            button={status === 'deleted' ? 'Deleted' : 'Migrated'}
                            style={{ minWidth: 48, maxWidth: 70, height: 26, fontSize: '0.85rem', padding: '0 6px', border: 'none', boxShadow: 'none', background: '#fff' }}
                            data-test="dhis2-uicore-dropdownbutton"
                        >
                            <Menu>
                                <MenuItem label="Deleted" onClick={() => setStatus('deleted')} />
                                <MenuItem label="Migrated" onClick={() => setStatus('migrated')} />
                            </Menu>
                        </DropdownButton>
                        <Button 
                            style={{ 
                                height: 36, 
                                minWidth: 100, 
                                fontSize: '1rem', 
                                padding: '0 22px', 
                                background: '#1976d2', 
                                color: '#fff', 
                                border: 'none', 
                                boxShadow: 'none', 
                                fontWeight: 400,
                                transition: 'background 0.15s',
                                cursor: 'pointer',
                                outline: 'none',
                                userSelect: 'none',
                            }} 
                            onMouseDown={e => e.currentTarget.style.background = '#115293'}
                            onMouseUp={e => e.currentTarget.style.background = '#1976d2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#1976d2'}
                            onClick={handleShowRestoreModal}
                            disabled={selectedTeis.length === 0}
                        >
                            Restore
                        </Button>
                    </div>
                    {/* Table */}
                    <Table>
                        <TableHead className={classes.headerTable}>
                            <TableRowHead>
                                <TableCellHead className={classes.checkbox}>
                                    <Checkbox
                                        checked={selectedTeis.length === teis.length && teis.length > 0}
                                        indeterminate={selectedTeis.length > 0 && selectedTeis.length < teis.length}
                                        onChange={({ checked }) => handleSelectAll(checked)}
                                    />
                                </TableCellHead>
                                <TableCellHead className={classes.columnInstanceId}>
                                    {i18n.t('Instance ID')}
                                </TableCellHead>
                                <TableCellHead className={classes.column}>
                                    {i18n.t('Created At')}
                                </TableCellHead>
                                <TableCellHead className={classes.column}>
                                    {i18n.t('Last Updated At')}
                                </TableCellHead>
                                <TableCellHead className={classes.column}>
                                    {i18n.t('Stored By')}
                                </TableCellHead>
                                <TableCellHead className={classes.column}>
                                    {i18n.t('Last Updated By')}
                                </TableCellHead>
                                {attributesToDisplay.map((attr) => (
                                    <TableCellHead
                                        key={attr}
                                        className={classes.column}
                                    >
                                        {attr}
                                    </TableCellHead>
                                ))}
                            </TableRowHead>
                        </TableHead>
                        <TableBody className={classes.bodyTable}>
                            {teis.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={`${6 + attributesToDisplay.length}`} style={{ textAlign: 'center', color: '#888' }}>
                                        {i18n.t('No deleted TEIs found for this org unit and program.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teis.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell className={classes.checkbox}>
                                            <Checkbox
                                                checked={selectedTeis.includes(instance.id)}
                                                onChange={() => handleSelectTei(instance.id)}
                                            />
                                        </TableCell>
                                        <TableCell className={classes.columnInstanceId}>
                                            {instance.id}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(instance.created).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(instance.lastUpdated).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.storedBy}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.lastUpdatedBy?.username || ''}
                                        </TableCell>
                                        {attributesToDisplay.map((attr) => {
                                            const attribute = instance.attributes?.find(
                                                (a) => a.name === attr
                                            ) || { value: '', valueType: '' };
                                            return (
                                                <TableCell key={attr} className={classes.column}>
                                                    {attribute.valueType === VALUE_TYPE_DATE ||
                                                    attribute.valueType === VALUE_TYPE_DATETIME
                                                        ? (attribute.value ? new Date(attribute.value).toLocaleString() : '')
                                                        : attribute.value}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
                 {/* Restore Confirmation Modal */}
            {showRestoreModal && (
                <Modal open={showRestoreModal} onClose={handleCloseRestoreModal}>
                    <ModalTitle>
                        {i18n.t('Restore Tracked Entity Instances')}
                    </ModalTitle>
                    <ModalContent>
                        <NoticeBox title={i18n.t('Confirm Restore')} info>
                            <p style={{ marginBottom: '16px' }}>
                                {i18n.t('Are you sure you want to restore the following {{count}} Tracked Entity Instance(s)?', { 
                                    count: selectedTeis.length 
                                })}
                            </p>
                            <p style={{ fontSize: '0.9em', color: '#666' }}>
                                {i18n.t('This will change their status from deleted to active, making them visible in the main tab.')}
                            </p>
                            <div style={{marginTop: '16px'}}>
                                <strong>{i18n.t('TEIs to be restored:')}</strong>
                                <ul style={{maxHeight: 150, overflowY: 'auto', margin: 0, paddingLeft: 18, listStyleType: 'none'}}>
                                    {selectedTeiDetails.map((tei) => (
                                        <li key={tei.id} style={{marginBottom: '8px'}}>
                                            <div><strong>{i18n.t('ID:')} </strong>{tei.id}</div>
                                            <div><strong>{i18n.t('Org Unit:')} </strong>{metadata[tei.owner]?.name || tei.owner || tei.orgUnit || orgUnitId}</div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </NoticeBox>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button 
                                secondary 
                                onClick={handleCloseRestoreModal}
                                disabled={restoreInProgress}
                            >
                                {i18n.t('Cancel')}
                            </Button>
                            <Button 
                                primary 
                                onClick={handleRestore}
                                disabled={restoreInProgress}
                            >
                                {restoreInProgress ? i18n.t('Restoring...') : i18n.t('Restore')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </div>
    );
};

export default HistoryTei;

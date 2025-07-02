import { VALUE_TYPE_DATE, VALUE_TYPE_DATETIME } from '@dhis2/analytics';
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
    Button,
} from '@dhis2/ui';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import classes from './styles/Common.module.css';

const HistoryTei = () => {
    const loading = useSelector(sGetHistoryTeisIsLoading);
    const error = useSelector(sGetHistoryTeisError);
    const teis = useSelector(sGetHistoryTeis);
    const selectedTeis = useSelector(sGetHistorySelectedTeis);
    const attributesToDisplay = useSelector(sGetHistoryTeisAttributesToDisplay);
    const filters = useSelector(sGetHistoryTeisFilters);
    const dispatch = useDispatch();

    // Dropdown state: 'deleted' or 'migrated'
    const [status, setStatus] = useState('deleted');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Example filter state (e.g., sex)
    const [localFilters, setLocalFilters] = useState({ sex: '' });

    // Always show filters UI, even if no TEIs match
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setLocalFilters((prev) => ({ ...prev, [name]: value }));
        dispatch(setHistoryTeisFilters({ ...filters, [name]: value }));
    };

    // fetch or set TEIs for history here
    useEffect(() => {
        // You can fetch history TEIs here or set them from props/context
        // For now, just set empty array
        dispatch(setHistoryTeis([]));
    }, [dispatch]);

    const handleSelectAll = (checked) => {
        if (checked) {
            dispatch(setHistorySelectedTeis(teis.map(tei => tei.id)));
        } else {
            dispatch(setHistorySelectedTeis([]));
        }
    };

    const handleSelectTei = (teiId) => {
        const isSelected = selectedTeis.includes(teiId);
        if (isSelected) {
            dispatch(setHistorySelectedTeis(selectedTeis.filter(id => id !== teiId)));
        } else {
            dispatch(setHistorySelectedTeis([...selectedTeis, teiId]));
        }
    };

    // Dropdown menu for status
    const handleDropdownSelect = (value) => {
        setStatus(value);
        setDropdownOpen(false);
    };

    // Label text based on status
    const labelText = status === 'deleted'
        ? `${selectedTeis.length} Selected of Deleted Tracked Entity Instances`
        : `${selectedTeis.length} Selected of Migrated Tracked Entity Instances`;

    if (loading) {
        return <CircularLoader />;
    }

    return (
        <div style={{ height: '100%' }}>
            {loading ? (
                <CircularLoader />
            ) : error ? (
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
                                <MenuItem label="Deleted" onClick={() => handleDropdownSelect('deleted')} />
                                <MenuItem label="Migrated" onClick={() => handleDropdownSelect('migrated')} />
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
                            onClick={() => { /* Restore logic here */ }}
                        >
                            Restore
                        </Button>
                    </div>
                    {/* Table */}
                    <Table>
                        <div className={classes.headerTable}>
                            <TableHead>
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
                        </div>
                        <div className={classes.bodyTable}>
                            <TableBody>
                                {teis.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell className={classes.checkbox}>
                                            <Checkbox
                                                checked={selectedTeis.includes(instance.id)}
                                                onChange={() => handleSelectTei(instance.id)}
                                            />
                                        </TableCell>
                                        <TableCell
                                            className={classes.columnInstanceId}
                                        >
                                            {instance.id}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(
                                                instance.created
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(
                                                instance.lastUpdated
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.storedBy || ''}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.lastUpdatedBy?.username || ''}
                                        </TableCell>
                                        {attributesToDisplay.map((attr) => {
                                            const attribute = instance.attributes?.find(
                                                (a) => a.name === attr
                                            ) || { value: '', valueType: '' };
                                            return (
                                                <TableCell
                                                    key={attr}
                                                    className={classes.column}
                                                >
                                                    {attribute.valueType === VALUE_TYPE_DATE ||
                                                    attribute.valueType === VALUE_TYPE_DATETIME
                                                        ? new Date(attribute.value).toLocaleString()
                                                        : attribute.value}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </div>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default HistoryTei;

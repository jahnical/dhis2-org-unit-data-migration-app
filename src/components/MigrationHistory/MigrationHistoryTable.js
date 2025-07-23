// Renders the DataTable UI for displaying migration history
import React, { useState, useEffect, memo } from 'react'
import { useSelector } from 'react-redux'
import { DataTable, DataTableHead, DataTableRow, DataTableCell, DataTableColumnHeader, DataTableBody, Checkbox } from '@dhis2/ui'

const ALL_COLUMN_DEFS = [
    { key: 'timestamp', label: 'Timestamp', width: '200px' },
    { key: 'teiUid', label: 'TEI UID', width: '220px' },
    { key: 'program', label: 'Program', width: '300px' },
    { key: 'sourceOrgUnit', label: 'Source Org Unit', width: '300px' },
    { key: 'targetOrgUnit', label: 'Target Org Unit', width: '300px' },
    { key: 'orgUnit', label: 'Org Unit', width: '300px' },
    { key: 'user', label: 'User', width: '200px' },
    { key: 'action', label: 'Action', width: '160px' },
]

const MigrationHistoryTable = ({ onSelectionChange, histories: historiesProp, customColumns, selectedBatches = [], onRestore, metadata = {} }) => {
    // Memoized row for performance
    const MemoRow = memo(({ batch, idx, expandedBatchId, selected, handleExpandToggle, handleSelectBatch, COLUMN_DEFS, attributeNames, metadata }) => (
        <React.Fragment key={`${batch.id}-${idx}`}>
            <DataTableRow
                onExpandToggle={() => handleExpandToggle(batch.id)}
                expanded={expandedBatchId === batch.id}
                selected={selected.includes(batch.id)}
                onClick={e => {
                    if (e.target.type !== 'checkbox') handleExpandToggle(batch.id)
                }}
                style={{ cursor: 'pointer' }}
            >
                <DataTableCell width="48px">
                    <Checkbox
                        value={batch.id}
                        checked={selected.includes(batch.id)}
                        onChange={() => handleSelectBatch(batch.id)}
                        disabled={false}
                    />
                </DataTableCell>
                {COLUMN_DEFS.map((col, idx2) => {
                    if (col.key === 'timestamp') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.timestamp}</DataTableCell>;
                    }
                    if (col.key === 'teiUid') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.teiUid}</DataTableCell>;
                    }
                    if (col.key === 'program') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.program?.name}</DataTableCell>;
                    }
                    if (col.key === 'sourceOrgUnit') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.sourceOrgUnit?.name}</DataTableCell>;
                    }
                    if (col.key === 'targetOrgUnit') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.targetOrgUnit?.name}</DataTableCell>;
                    }
                    if (col.key === 'orgUnit') {
                        // Show human-readable org unit name if available, fallback to metadata, then ID
                        let orgUnitName = '';
                        // Prefer batch.orgUnitName or batch.orgUnitNameFromLookup if present
                        if (batch.orgUnitName) {
                            orgUnitName = batch.orgUnitName;
                        } else if (batch.orgUnitNameFromLookup) {
                            orgUnitName = batch.orgUnitNameFromLookup;
                        } else if (batch.orgUnit) {
                            if (typeof batch.orgUnit === 'object') {
                                orgUnitName = batch.orgUnit.name || metadata[batch.orgUnit.id]?.name || metadata[batch.orgUnit.id]?.displayName || batch.orgUnit.id;
                            } else {
                                // batch.orgUnit is likely an ID string
                                orgUnitName = metadata[batch.orgUnit]?.name || metadata[batch.orgUnit]?.displayName || batch.orgUnit;
                            }
                        }
                        return <DataTableCell key={col.key} width={col.width}>{orgUnitName}</DataTableCell>;
                    }
                    if (col.key === 'user') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.user?.name}</DataTableCell>;
                    }
                    if (col.key === 'action') {
                        return <DataTableCell key={col.key} width={col.width}>{batch.action}</DataTableCell>;
                    }
                    return null;
                })}
            </DataTableRow>
            {/* Only show expandable details for history batches */}
            {expandedBatchId === batch.id && batch.action !== 'deleted' && (
                <DataTableRow>
                    <DataTableCell colSpan={COLUMN_DEFS.length + 1} style={{ background: '#f0f8ff', padding: 0 }}>
                        <div style={{ margin: '4px 0', padding: '6px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                            <h5 style={{ marginBottom: '8px', color: '#333' }}>TEIs in this batch:</h5>
                            <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader fixed top="0" left="0">Instance ID</DataTableColumnHeader>
                                        <DataTableColumnHeader fixed top="0">Created At</DataTableColumnHeader>
                                        <DataTableColumnHeader fixed top="0">Last Updated At</DataTableColumnHeader>
                                        <DataTableColumnHeader fixed top="0">Stored By</DataTableColumnHeader>
                                        <DataTableColumnHeader fixed top="0">Last Updated By</DataTableColumnHeader>
                                        {attributeNames.map(attrName => (
                                            <DataTableColumnHeader key={attrName} fixed top="0">{attrName}</DataTableColumnHeader>
                                        ))}
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {batch.teis?.map(tei => (
                                        <DataTableRow key={tei.id}>
                                            <DataTableCell fixed left="0">{tei.id}</DataTableCell>
                                            <DataTableCell>{tei.created}</DataTableCell>
                                            <DataTableCell>{tei.lastUpdated}</DataTableCell>
                                            <DataTableCell>{tei.storedBy}</DataTableCell>
                                            <DataTableCell>{tei.lastUpdatedBy?.username}</DataTableCell>
                                            {attributeNames.map(attrName => {
                                                const attr = tei.attributes?.find(a => a.displayName === attrName)
                                                return <DataTableCell key={attrName}>{attr ? attr.value : ''}</DataTableCell>
                                            })}
                                        </DataTableRow>
                                    ))}
                                </DataTableBody>
                            </DataTable>
                        </div>
                    </DataTableCell>
                </DataTableRow>
            )}
        </React.Fragment>
    ));
    const histories = historiesProp || []
    const COLUMN_DEFS = customColumns
        ? ALL_COLUMN_DEFS.filter(col => customColumns.includes(col.key))
        : ALL_COLUMN_DEFS
    const [expandedBatchId, setExpandedBatchId] = useState(null)
    const [selected, setSelected] = useState(selectedBatches)
    // Only update local selected state if prop changes and is different
    useEffect(() => {
        if (selectedBatches.length !== selected.length || !selectedBatches.every((id, i) => id === selected[i])) {
            setSelected(selectedBatches)
        }
    }, [selectedBatches])
    const [sortCol, setSortCol] = useState('timestamp')
    const [sortDir, setSortDir] = useState('desc')

    // Debounce selection updates to prevent UI lag
    useEffect(() => {
        if (!onSelectionChange) return;
        const handler = setTimeout(() => {
            onSelectionChange(selected);
        }, 100); // 100ms debounce
        return () => clearTimeout(handler);
    }, [selected, onSelectionChange]);

    const handleExpandToggle = (batchId) => {
        setExpandedBatchId(expandedBatchId === batchId ? null : batchId)
    }

    const handleSelectBatch = (batchId) => {
        setSelected(prevSelected => {
            if (prevSelected.includes(batchId)) {
                return prevSelected.filter(id => id !== batchId)
            } else {
                return [...prevSelected, batchId]
            }
        })
    }

    const handleSelectAll = () => {
        if (selected.length === histories.length) {
            setSelected([])
        } else {
            setSelected(histories.map(batch => batch.id))
        }
    }

    const areAllBatchesSelected = selected.length === histories.length && histories.length > 0
    const isPartiallySelected = selected.length > 0 && selected.length < histories.length

    // Sorting logic
    function getSortValue(batch, col) {
        if (col === 'timestamp') return batch.timestamp
        if (col === 'program') return batch.program?.name || ''
        if (col === 'sourceOrgUnit') return batch.sourceOrgUnit?.name || ''
        if (col === 'targetOrgUnit') return batch.targetOrgUnit?.name || ''
        if (col === 'user') return batch.user?.name || ''
        if (col === 'action') return batch.action
        return ''
    }
    const sortedHistories = [...histories].sort((a, b) => {
        const aVal = getSortValue(a, sortCol)
        const bVal = getSortValue(b, sortCol)
        if (aVal === bVal) return 0
        if (sortDir === 'asc') return aVal > bVal ? 1 : -1
        return aVal < bVal ? 1 : -1
    })

    // Batch selection safety helpers
    function isBatchUndoable(batch) {
        return batch.action === 'migrated'
    }
    function isBatchRestorable(batch) {
        return batch.action === 'soft-deleted'
    }

    // Get all attribute display names from the first batch with TEIs
    const attributeNames = (histories.find(b => b.teis && b.teis.length > 0)?.teis[0]?.attributes || []).map(a => a.displayName)

    const showRestoreHeaderButton = typeof onRestore === 'function' && typeof selectedBatches !== 'undefined' && Array.isArray(selectedBatches);

    return (
        <div>
            {histories.length === 0 ? (
                <p>No migration history found.</p>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader width="48px">
                                <Checkbox
                                    onChange={handleSelectAll}
                                    checked={areAllBatchesSelected}
                                    indeterminate={isPartiallySelected}
                                />
                            </DataTableColumnHeader>
                            <DataTableColumnHeader name="timestamp" width={COLUMN_DEFS[0].width}>Timestamp</DataTableColumnHeader>
                            {COLUMN_DEFS.filter(col => col.key !== 'timestamp').map(col => (
                                <DataTableColumnHeader
                                    key={col.key}
                                    name={col.key}
                                    width={col.width}
                                    sortDirection={sortCol === col.key ? sortDir : 'default'}
                                    onSortIconClick={() => {
                                        if (sortCol === col.key) {
                                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                                        } else {
                                            setSortCol(col.key)
                                            setSortDir('asc')
                                        }
                                    }}
                                    sortIconTitle={`Sort by ${col.label}`}
                                >
                                    {col.label}
                                </DataTableColumnHeader>
                            ))}
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {sortedHistories.map((batch, idx) => (
                            <MemoRow
                                batch={batch}
                                idx={idx}
                                expandedBatchId={expandedBatchId}
                                selected={selected}
                                handleExpandToggle={handleExpandToggle}
                                handleSelectBatch={handleSelectBatch}
                                COLUMN_DEFS={COLUMN_DEFS}
                                attributeNames={attributeNames}
                                metadata={metadata}
                            />
                        ))}
                    </DataTableBody>
                </DataTable>
            )}
        </div>
    )
}

export default MigrationHistoryTable

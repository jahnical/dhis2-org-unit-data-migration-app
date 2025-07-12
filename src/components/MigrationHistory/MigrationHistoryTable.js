// MigrationHistoryTable.js
// Renders the DataTable UI for displaying migration history
import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { DataTable, DataTableHead, DataTableRow, DataTableCell, DataTableColumnHeader, DataTableBody, Checkbox } from '@dhis2/ui'

const COLUMN_DEFS = [
    { key: 'timestamp', label: 'Timestamp', width: '200px' },
    { key: 'program', label: 'Program', width: '300px' },
    { key: 'sourceOrgUnit', label: 'Source Org Unit', width: '300px' },
    { key: 'targetOrgUnit', label: 'Target Org Unit', width: '300px' },
    { key: 'user', label: 'User', width: '200px' },
    { key: 'action', label: 'Action', width: '160px' },
]

const MigrationHistoryTable = ({ onSelectionChange, histories: historiesProp }) => {
    const histories = historiesProp || []
    const [expandedBatchId, setExpandedBatchId] = useState(null)
    const [selectedBatches, setSelectedBatches] = useState([])
    const [sortCol, setSortCol] = useState('timestamp')
    const [sortDir, setSortDir] = useState('desc')

    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedBatches)
        }
    }, [selectedBatches, onSelectionChange])

    const handleExpandToggle = (batchId) => {
        setExpandedBatchId(expandedBatchId === batchId ? null : batchId)
    }

    const handleSelectBatch = (batchId) => {
        setSelectedBatches(selectedBatches.includes(batchId)
            ? selectedBatches.filter(id => id !== batchId)
            : [...selectedBatches, batchId])
    }

    const handleSelectAll = () => {
        if (selectedBatches.length === histories.length) {
            setSelectedBatches([])
        } else {
            setSelectedBatches(histories.map(batch => batch.id))
        }
    }

    const areAllBatchesSelected = selectedBatches.length === histories.length && histories.length > 0
    const isPartiallySelected = selectedBatches.length > 0 && selectedBatches.length < histories.length

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
                        {sortedHistories.map(batch => (
                            <React.Fragment key={batch.id}>
                                <DataTableRow
                                    onExpandToggle={() => handleExpandToggle(batch.id)}
                                    expanded={expandedBatchId === batch.id}
                                    selected={selectedBatches.includes(batch.id)}
                                    onClick={e => {
                                        if (e.target.type !== 'checkbox') handleExpandToggle(batch.id)
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <DataTableCell width="48px">
                                        <Checkbox
                                            value={batch.id}
                                            checked={selectedBatches.includes(batch.id)}
                                            onChange={() => handleSelectBatch(batch.id)}
                                            disabled={!(isBatchUndoable(batch) || isBatchRestorable(batch))}
                                        />
                                    </DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[0].width}>{batch.date} {batch.time}</DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[1].width}>{batch.program?.name}</DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[2].width}>{batch.sourceOrgUnit?.name}</DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[3].width}>{batch.targetOrgUnit?.name}</DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[4].width}>{batch.user?.name}</DataTableCell>
                                    <DataTableCell width={COLUMN_DEFS[5].width}>{batch.action}</DataTableCell>
                                </DataTableRow>
                                {expandedBatchId === batch.id && (
                                    <DataTableRow>
                                        <DataTableCell colSpan="8" style={{ background: '#f0f8ff', padding: 0 }}>
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
                        ))}
                    </DataTableBody>
                </DataTable>
            )}
        </div>
    )
}

export default MigrationHistoryTable

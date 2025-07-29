// HistoryFilter.js
// Component for filtering history records by action type
import React from 'react'
import { SingleSelect, SingleSelectOption } from '@dhis2/ui'

const ACTION_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Migrated', value: 'migrated' },
    { label: 'Deleted', value: 'soft-deleted' },
    { label: 'Undone', value: 'undone' },
    { label: 'Restored', value: 'restored' },
]

const HistoryFilter = ({ value = 'all', onFilterChange }) => {
    return (
        <div style={{ width: '100px' }}>
            <SingleSelect
                className="select"
                selected={value}
                onChange={({ selected }) => onFilterChange && onFilterChange(selected)}
                dataTest="history-filter-select"
                style={{ width: '100px' }}
            >
                {ACTION_OPTIONS.map(opt => (
                    <SingleSelectOption key={opt.value} label={opt.label} value={opt.value} />
                ))}
            </SingleSelect>
        </div>
    )
}

export default HistoryFilter

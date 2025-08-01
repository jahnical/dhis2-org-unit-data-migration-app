import React from 'react'
import { Button } from '@dhis2/ui'

const RestoreIcon = (
    <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-restore"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3.06 13a9 9 0 1 0 .49 -4.087" /><path d="M3 4.001v5h5" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
)

const RestoreButton = ({ selectedBatches, onClick, disabled }) => {
    return (
        <Button
            ariaLabel="Restore"
            name="Restore"
            destructive
            onClick={onClick}
            title="Restore"
            value="restore"
            disabled={disabled}
            dataTest="restore-btn"
            style={{ minWidth: 120 }}
            icon={RestoreIcon}
            >
            Restore
        </Button>
    )
}

export default RestoreButton

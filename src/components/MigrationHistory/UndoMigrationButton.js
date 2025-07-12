// UndoMigrationButton.js
// Button to trigger the UndoMigrationModal
import React from 'react'
import { Button } from '@dhis2/ui'

const UndoIcon = (
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-back-up"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 14l-4 -4l4 -4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" /></svg>
)

const UndoMigrationButton = ({ selectedBatches, onClick, disabled }) => {
    return (
        <Button
            ariaLabel="Undo Migration"
            name="Undo Migration"
            onClick={onClick}
            primary
            title="Undo Migration"
            value="undo"
            disabled={disabled}
            dataTest="undo-migration-btn"
            style={{ minWidth: '150px' }}
            icon={UndoIcon}
        >
            Undo Migration
        </Button>
    )
}

export default UndoMigrationButton

import React from 'react';
import { Button } from '@dhis2/ui';

const RestoreDeletedIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6"/><path d="M9 17l3 3 3-3"/><path d="M20 12a8 8 0 1 0-16 0"/></svg>
);

const RestoreDeletedButton = ({ selectedTeis, onClick, disabled }) => (
    <Button
        ariaLabel="Restore Deleted"
        name="Restore Deleted"
        destructive
        onClick={onClick}
        title="Restore Deleted"
        value="restore-deleted"
        disabled={disabled}
        dataTest="restore-deleted-btn"
        style={{ minWidth: 120 }}
        icon={RestoreDeletedIcon}
    >
        Restore
    </Button>
);

export default RestoreDeletedButton;

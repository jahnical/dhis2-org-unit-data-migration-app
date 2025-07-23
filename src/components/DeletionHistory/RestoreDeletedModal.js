// RestoreDeletedModal.js
// Modal for confirming restore of deleted TEIs
import React from 'react';
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip } from '@dhis2/ui';

const RestoreDeletedModal = ({ open, onClose, selectedTeis, onConfirm, restoring }) => {
    if (!open) return null;
    return (
        <Modal small onClose={onClose} position="middle">
            <ModalTitle>Restore Deleted TEIs</ModalTitle>
            <ModalContent>
                Are you sure you want to restore the selected deleted TEI(s)?
                <ul style={{ marginTop: 12 }}>
                    {selectedTeis.map(id => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose} disabled={restoring}>Cancel</Button>
                    <Button primary onClick={() => { onConfirm(); }} disabled={restoring}>Confirm Restore</Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};

export default RestoreDeletedModal;

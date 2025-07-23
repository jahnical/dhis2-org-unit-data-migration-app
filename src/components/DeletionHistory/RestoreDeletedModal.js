import React from 'react';
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip } from '@dhis2/ui';

const RestoreDeletedModal = ({ open, onClose, selectedTeis, onConfirm, restoring }) => {
    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

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
                    <Button primary onClick={handleConfirm} disabled={restoring}>Confirm Restore</Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};

export default RestoreDeletedModal;

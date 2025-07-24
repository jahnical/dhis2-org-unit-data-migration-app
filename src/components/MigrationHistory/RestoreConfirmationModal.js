import React from 'react'
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip } from '@dhis2/ui'

const RestoreConfirmationModal = ({ open, onClose, selectedBatches, onConfirm }) => {
    if (!open) return null
    return (
        <Modal small onClose={onClose} position="middle">
            <ModalTitle>Restore TEIs</ModalTitle>
            <ModalContent>
                Are you sure you want to restore the selected soft-deleted batches?
                <ul style={{ marginTop: 12 }}>
                    {selectedBatches.map(id => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose}>Cancel</Button>
                    <Button primary onClick={() => { onConfirm(selectedBatches); onClose(); }}>Confirm Restore</Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

export default RestoreConfirmationModal

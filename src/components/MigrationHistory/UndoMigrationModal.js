// UndoMigrationModal.js
// Modal for confirming undo migration
import React from 'react'
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip } from '@dhis2/ui'

const UndoMigrationModal = ({ open, onClose, selectedBatches, onConfirm }) => {
    if (!open) return null
    return (
        <Modal small onClose={onClose} position="middle">
            <ModalTitle>Undo Migration</ModalTitle>
            <ModalContent>
                Are you sure you want to undo the selected migration batches?
                <ul style={{ marginTop: 12 }}>
                    {selectedBatches.map(id => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose}>Cancel</Button>
                    <Button primary onClick={() => { onConfirm(selectedBatches); onClose(); }}>Confirm Undo</Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

export default UndoMigrationModal

// UndoMigrationModal.js
// Modal for confirming undo migration

import React, { useState, useEffect } from 'react'
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip, NoticeBox, CircularLoader } from '@dhis2/ui'
import { useSelector, useDispatch } from 'react-redux'

const UndoMigrationModal = ({ open, onClose, selectedBatches, engine, currentUser, histories }) => {
    const dispatch = useDispatch();
    const undoState = useSelector(state => state.undoMigration);
    const [step, setStep] = useState('selection'); // selection, preview, undoing, success, error
    const [undoProgress, setUndoProgress] = useState({ step: 0 });

    // Get batch details for preview
    const batchDetails = React.useMemo(() => {
        if (!histories || !selectedBatches?.length) return [];
        return histories.filter(h => selectedBatches.includes(h.id));
    }, [histories, selectedBatches]);

    // Get destination org units for selected batches
    const destinationOrgUnits = React.useMemo(() => {
        return batchDetails.map(b => b.targetOrgUnit?.name || b.targetOrgUnit?.displayName || b.targetOrgUnit?.id || 'Unknown');
    }, [batchDetails]);

    useEffect(() => {
        if (undoState.loading) {
            setStep('undoing');
        } else if (undoState.success) {
            setStep('success');
        } else if (undoState.error) {
            setStep('error');
        } else {
            setStep('selection');
        }
    }, [undoState.loading, undoState.success, undoState.error]);

    // Clear undo state when modal closes
    const handleClose = () => {
        setStep('selection');
        dispatch({ type: 'RESET_UNDO_MIGRATION' });
        onClose();
    };

    const handleUndo = async () => {
        setStep('undoing');
        setUndoProgress({ step: 0 });
        await dispatch(require('../../actions/undoMigration').undoMigrationBatchesThunk(selectedBatches, engine, currentUser));
    };

    const renderPreview = () => (
        <div style={{ padding: '16px' }}>
            <NoticeBox title={'Undo Migration Preview'} warning>
                <p>{`You are about to undo ${selectedBatches.length} migration batch${selectedBatches.length !== 1 ? 'es' : ''}:`}</p>
                <ul>
                    {batchDetails.map(batch => (
                        <li key={batch.id}>
                            <strong>Batch:</strong> {batch.id}<br />
                            <strong>Destination Org Unit:</strong> {batch.sourceOrgUnit?.name || batch.sourceOrgUnit?.displayName || batch.sourceOrgUnit?.id || 'Unknown'}<br />
                            <strong>TEIs:</strong> {batch.teis?.length || 0}
                        </li>
                    ))}
                </ul>
                <p>This will revert the selected migration batches. This action cannot be undone.</p>
            </NoticeBox>
        </div>
    );

    const renderProgress = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '16px'
        }}>
            <CircularLoader />
            <div>
                Undoing migration batches...
            </div>
        </div>
    );

    if (!open) return null;
    return (
        <Modal onClose={handleClose} position="middle" large>
            <ModalTitle>Undo Migration</ModalTitle>
            {undoState.loading && step === 'undoing' ? (
                <ModalContent>
                    {renderProgress()}
                </ModalContent>
            ) : undoState.error ? (
                <ModalContent>
                    <NoticeBox error title={'Could not undo migration'}>
                        {undoState.error}
                    </NoticeBox>
                </ModalContent>
            ) : (
                <>
                    <ModalContent>
                        {undoState.success ? (
                            <NoticeBox success title={'Undo successful'}>
                                All selected migration batches have been successfully undone.
                            </NoticeBox>
                        ) : step === 'selection' ? (
                            renderPreview()
                        ) : null}
                    </ModalContent>
                    <ModalActions>
                        {undoState.success ? (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={handleClose}
                                    dataTest="undo-migration-modal-confirm"
                                >
                                    Close
                                </Button>
                            </ButtonStrip>
                        ) : (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={handleClose}
                                    dataTest="undo-migration-modal-cancel"
                                >
                                    Cancel
                                </Button>
                                {step === 'selection' && (
                                    <Button
                                        primary
                                        onClick={handleUndo}
                                        dataTest="undo-migration-modal-confirm"
                                    >
                                        Confirm Undo
                                    </Button>
                                )}
                            </ButtonStrip>
                        )}
                    </ModalActions>
                </>
            )}
        </Modal>
    );
}

export default UndoMigrationModal

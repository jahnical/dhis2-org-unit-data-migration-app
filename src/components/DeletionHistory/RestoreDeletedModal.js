import React from 'react';
import { Modal, ModalTitle, ModalContent, ModalActions, Button, ButtonStrip, NoticeBox, CircularLoader } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';


const RestoreDeletedModal = ({ open, onClose, selectedTeis, onConfirm, restoring, restoreComplete, restoreError }) => {
    const handleConfirm = async () => {
        await onConfirm();
    };

    if (!open) return null;
    return (
        <Modal onClose={onClose} position="middle">
            <ModalTitle>{i18n.t('Restore Deleted TEIs')}</ModalTitle>
            {restoreError ? (
                <ModalContent>
                    <NoticeBox error title={i18n.t('Restore failed')} aria-live="polite">
                        {restoreError}
                    </NoticeBox>
                </ModalContent>
            ) : restoreComplete ? (
                <ModalContent>
                    <NoticeBox success title={i18n.t('Restore successful')} aria-live="polite">
                        {i18n.t('All selected TEIs have been restored and are now available in the active list.')}
                    </NoticeBox>
                </ModalContent>
            ) : (
                <>
                    <ModalContent>
                        {i18n.t('Are you sure you want to restore the selected deleted TEI(s)?')}
                        <ul style={{ marginTop: 12 }}>
                            {selectedTeis.map(id => (
                                <li key={id}>{id}</li>
                            ))}
                        </ul>
                        {restoring && (
                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <CircularLoader />
                                <div style={{ marginTop: 12, fontWeight: 500 }}>
                                    {i18n.t('Restoring TEIs...')}
                                </div>
                            </div>
                        )}
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={onClose} disabled={restoring}>{i18n.t('Cancel')}</Button>
                            <Button primary onClick={handleConfirm} disabled={restoring}>{i18n.t('Confirm Restore')}</Button>
                        </ButtonStrip>
                    </ModalActions>
                </>
            )}
            {(restoreComplete || restoreError) && (
                <ModalActions>
                    <ButtonStrip end>
                        <Button primary onClick={onClose}>{i18n.t('OK')}</Button>
                    </ButtonStrip>
                </ModalActions>
            )}
        </Modal>
    );
};

export default RestoreDeletedModal;

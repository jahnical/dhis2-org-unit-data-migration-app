import React, { useEffect, useCallback, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import { useDataEngine, useAlert } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    Modal,
    ModalContent,
    ModalActions,
    ButtonStrip,
    ModalTitle,
    Button,
    CircularLoader,
    NoticeBox,
} from '@dhis2/ui'

import { dataActionCreators } from '../../actions/data_controls.js'
import { deleteTeis } from '../../actions/deletion.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import { deletionSelectors } from '../../reducers/deletion.js'

const DataDeletionModal = ({ onClose }) => {
    const dispatch = useDispatch()
    const engine = useDataEngine()
    const alert = useAlert()

    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs)
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs) // array of UIDs
    const deletionStatus = useSelector(deletionSelectors.getDeletionStatus)
    const loading = useSelector(deletionSelectors.getDeletionIsLoading)
    const error = useSelector(deletionSelectors.getDeletionError)

    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit)
    const programId = useSelector(dataControlSelectors.getDataControlProgram)

    const [showConfirm, setShowConfirm] = useState(false)
    const [deletionComplete, setDeletionComplete] = useState(false)

    const isMountedRef = useRef(true)
    useEffect(() => {
        isMountedRef.current = true
        return () => { isMountedRef.current = false }
    }, [])

    // Reset modal and redux state on close
    const resetAndClose = useCallback(() => {
        dispatch(dataActionCreators.reset())
        setDeletionComplete(false)
        setShowConfirm(false)
        onClose()
    }, [dispatch, onClose])

    // Show confirmation modal
    const handleSoftDeleteClick = useCallback(() => {
        setShowConfirm(true)
    }, [])

    // Confirm deletion: dispatch native deleteTeis action
    const handleConfirmDelete = useCallback(() => {
        setShowConfirm(false)
        dispatch(deleteTeis({ teiUids: selectedTeis, engine }))
    }, [dispatch, selectedTeis, engine])

    // When deletionStatus changes, react accordingly
    useEffect(() => {
        // Full success - mark complete and refresh

        if (deletionStatus === 'deleted' && isMountedRef.current) {
            setDeletionComplete(true)
            dispatch(dataActionCreators.fetchTEIs(orgUnitId, programId, engine))
        }
    }, [deletionStatus, orgUnitId, programId, engine, dispatch])

    // Reset local modal state on open/unmount
    useEffect(() => {
        setDeletionComplete(false)
        setShowConfirm(false)
        return () => {
            setDeletionComplete(false)
            setShowConfirm(false)
        }
    }, [])

    // Show error alert and reset state if error occurs
    useEffect(() => {
        if (error) {
            let errorMessage = i18n.t("The TEIs couldn't be deleted. Please try again or contact your system administrator.")
            if (typeof error === 'string') {
                errorMessage = error
            } else if (error instanceof Error && error.message) {
                errorMessage = error.message
            }
            console.error('Deletion Error:', error)
            alert.show({ message: errorMessage, critical: true })
            dispatch(dataActionCreators.reset())
        } 

    }, [error, alert, dispatch])

    // Get TEI objects for display in confirm modal
    const selectedTeiObjects = allTeis.filter(tei =>
        selectedTeis.includes(tei.trackedEntityInstance || tei.id)
    )

    return (
        <Modal onClose={resetAndClose} position="middle">
            <ModalTitle>{i18n.t('Confirm Data Deletion')}</ModalTitle>

            {loading ? (
                <ModalContent>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <CircularLoader />
                        <span>{i18n.t('Deleting {{count}} TEIs...', { count: selectedTeis.length })}</span>
                    </div>
                </ModalContent>
            ) : error ? (
                <ModalContent>
                    <p>{i18n.t('An error occurred during deletion. Please check the alert for details.')}</p>
                    <ButtonStrip>
                        <Button secondary onClick={resetAndClose} dataTest="data-deletion-modal-error-close">
                            {i18n.t('Close')}
                        </Button>
                    </ButtonStrip>
                </ModalContent>



            ) : deletionComplete ? (
                <>
                    <ModalContent>
                        <NoticeBox success title={i18n.t('Soft delete successful')} aria-live="polite">
                            {i18n.t('All selected TEIs have been marked as deleted. You can restore them from the History tab.')}
                        </NoticeBox>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button primary onClick={resetAndClose} dataTest="data-deletion-modal-confirm">
                                {i18n.t('OK')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </>
            ) : showConfirm ? (
                <>
                    <ModalContent aria-live="assertive">
                        <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: 'red' }}>
                                {i18n.t('You are about to mark {{count}} TEIs as deleted.', { count: selectedTeis.length })}
                            </strong>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            {selectedTeis.length > 20
                                ? i18n.t('This is a large number of TEIs. This action will mark them as deleted and remove them from the active list. This can be undone from the History tab.')
                                : i18n.t('This action will mark the selected TEIs as deleted and remove them from the active list. This can be undone from the History tab.')}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <strong>{i18n.t('TEIs to be deleted:')}</strong>
                            <ul style={{ maxHeight: 120, overflowY: 'auto', margin: 0, paddingLeft: 18 }}>
                                {selectedTeiObjects.map(tei => (
                                    <li key={tei.trackedEntityInstance || tei.id}>{tei.trackedEntityInstance || tei.id}</li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ color: 'red', fontWeight: 500 }}>
                            {i18n.t('Are you absolutely sure you want to proceed?')}
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button secondary onClick={resetAndClose} dataTest="data-deletion-modal-cancel" disabled={loading}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button destructive onClick={handleConfirmDelete} dataTest="data-deletion-modal-confirm" disabled={loading}>
                                {i18n.t('Yes, Delete')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </>
            ) : (
                <>
                    <ModalContent>
                        <NoticeBox warning title={i18n.t('Warning')} aria-live="polite">
                            {selectedTeis.length > 20 ? (
                                <>
                                    <strong>{i18n.t('You are about to mark {{count}} TEIs as deleted.', { count: selectedTeis.length })}</strong>
                                    <br />
                                    {i18n.t('This is a large number of TEIs. Are you sure you want to proceed?')}
                                    <br />
                                    {i18n.t('This action can be undone from the History tab.')}
                                </>
                            ) : (
                                i18n.t('You are about to mark {{count}} TEIs as deleted. This action can be undone from the History tab.', { count: selectedTeis.length })
                            )}
                        </NoticeBox>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button secondary onClick={resetAndClose} dataTest="data-deletion-modal-cancel" disabled={loading}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button destructive onClick={handleSoftDeleteClick} dataTest="data-deletion-modal-confirm" disabled={loading || selectedTeis.length === 0}>
                                {i18n.t('Delete')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </>
            )}
        </Modal>
    )
}

DataDeletionModal.propTypes = {
    onClose: PropTypes.func.isRequired,
}

export default DataDeletionModal

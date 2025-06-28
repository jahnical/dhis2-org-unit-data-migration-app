import { useDataMutation } from '@dhis2/app-runtime'
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
import PropTypes from 'prop-types'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { dataActionCreators } from '../../actions/data_controls.js'
import { deletionAsyncActions } from '../../actions/deletion.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import { deletionSelectors } from '../../reducers/deletion.js'

const DataDeletionModal = ({ onClose }) => {

    const deleteTEIMutation = {
        resource: 'trackedEntityInstances',
        type: 'delete',
        id: ({ id }) => id,
    }

const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs)
const deletionStatus = useSelector(deletionSelectors.getDeletionState)
const [deleteTEI, { loading, error }] = useDataMutation(deleteTEIMutation)
const dispatch = useDispatch()

const deleteData = () => {
    dispatch(
        deletionAsyncActions.deleteTEIs({
            teis: selectedTeis,
            deleteTEI: deleteTEI,
        })
    )
}

const onCloseClicked = () => {
    if (deletionStatus === 'success') {
        dispatch(dataActionCreators.reset())
    }
    onClose()
}

return (
    <Modal onClose={onClose} position="middle">
        <ModalTitle>{i18n.t('Confirm Data Deletion')}</ModalTitle>
        {loading ? (
            <ModalContent>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    <CircularLoader />
                    <span>
                        {i18n.t('Deleting {{count}} TEIs...', {
                            count: selectedTeis.length,
                        })}
                    </span>
                </div>
            </ModalContent>
        ) : error ? (
            <ModalContent>
                <NoticeBox error title={i18n.t('Could not delete TEIs')}>
                    {error?.message ||
                        i18n.t(
                            "The TEIs couldn't be deleted. Try again or contact your system administrator."
                        )}
                </NoticeBox>
            </ModalContent>
        ) : (
            <>
                <ModalContent>
                    {deletionStatus === 'success' ? (
                        <NoticeBox
                            success
                            title={i18n.t('Deletion successful')}
                        >
                            {i18n.t(
                                'All selected TEIs have been successfully deleted.'
                            )}
                        </NoticeBox>
                    ) : (
                        <div>
                            <NoticeBox warning title={i18n.t('Warning')}>
                                {i18n.t('You are about to delete {{count}} TEIs. This action cannot be undone.', {
                                    count: selectedTeis.length,
                                })}
                            </NoticeBox>
                            {/*Removed Section listing a summary of TEI items to be deleted*/}
                            {/*<div style={{ marginTop: '16px' }}>*/}
                            {/*    <h4>{i18n.t('Items to be deleted:')}</h4>*/}
                            {/*    <ul>*/}
                            {/*        {selectedTeis.slice(0, 5).map((tei) => (*/}
                            {/*            <li key={tei}>{tei}</li>*/}
                            {/*        ))}*/}
                            {/*        {selectedTeis.length > 5 && (*/}
                            {/*            <li>{i18n.t('... and {{count}} more', {*/}
                            {/*                count: selectedTeis.length - 5*/}
                            {/*            })}</li>*/}
                            {/*        )}*/}
                            {/*    </ul>*/}
                            {/*</div>*/}
                        </div>
                    )}
                </ModalContent>
                <ModalActions>
                    {deletionStatus === 'success' ? (
                        <ButtonStrip>
                            <Button
                                secondary
                                onClick={onCloseClicked}
                                dataTest="data-deletion-modal-confirm"
                            >
                                {i18n.t('Close')}
                            </Button>
                        </ButtonStrip>
                    ) : (
                        <ButtonStrip>
                            <Button
                                secondary
                                onClick={onCloseClicked}
                                dataTest="data-deletion-modal-cancel"
                            >
                                {i18n.t('Cancel')}
                            </Button>
                            <Button
                                destructive
                                onClick={deleteData}
                                dataTest="data-deletion-modal-confirm"
                            >
                                {i18n.t('Delete')}
                            </Button>
                        </ButtonStrip>
                    )}
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

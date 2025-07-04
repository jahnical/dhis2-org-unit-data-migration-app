import { useDataEngine } from '@dhis2/app-runtime'
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
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { dataActionCreators } from '../../actions/data_controls.js'
import { downloadActions } from '../../actions/download.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import { downloadSelectors } from '../../reducers/download.js'

const DataDownloadModal = ({ onClose }) => {
    const [step, setStep] = useState('preview') // preview, downloading
    const [downloadProgress, setDownloadProgress] = useState({ completed: 0 })
    const [filename, setFilename] = useState('teis-export.csv')

    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs)
    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs)
    const loading = useSelector(downloadSelectors.getDownloadIsLoading)
    const error = useSelector(downloadSelectors.getDownloadError)
    const engine = useDataEngine()
    const dispatch = useDispatch()

    const downloadData = async () => {
        setStep('downloading')
        setDownloadProgress({ completed: 0 })

        const updateProgress = (progress) => {
            setDownloadProgress(progress)
        }

        dispatch(
            downloadActions.downloadTEIsAsCsv({
                teis: allTeis,
                selectedTeis: selectedTeis,
                onProgress: updateProgress,
            })
        )
    }

    const onCloseClicked = () => {
        onClose()
    }

    const renderPreview = () => (
        <div style={{ padding: '16px' }}>
            <NoticeBox title={i18n.t('Download Preview')}>
                <p>{i18n.t('You are about to download:')}</p>
                <ul>
                    <li>
                        {i18n.t('{{count}} TEIs', { count: selectedTeis.length })}
                    </li>
                </ul>
                <div style={{ marginTop: '16px' }}>
                    <label htmlFor="filename">{i18n.t('Filename:')}</label>
                    <input
                        id="filename"
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        style={{ marginLeft: '8px', padding: '4px' }}
                    />
                </div>
                <p style={{ marginTop: '16px' }}>{i18n.t('The data will be downloaded in CSV format.')}</p>
            </NoticeBox>
        </div>
    )

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
                {i18n.t('Preparing download... {{completed}} of {{total}} TEIs processed', {
                    completed: downloadProgress.completed || 0,
                    total: selectedTeis.length,
                })}
            </div>
            {downloadProgress.completed > 0 && (
                <div>
                    {Math.round((downloadProgress.completed / selectedTeis.length) * 100)}%
                </div>
            )}
        </div>
    )

    return (
        <Modal onClose={onClose} position="middle" large>
            <ModalTitle>{i18n.t('Download TEI Data')}</ModalTitle>
            {loading && step === 'downloading' ? (
                <ModalContent>
                    {renderProgress()}
                </ModalContent>
            ) : error ? (
                <ModalContent>
                    <NoticeBox error title={i18n.t('Could not prepare download')}>
                        {error?.message ||
                            i18n.t(
                                "The download couldn't be prepared. Try again or contact your system administrator."
                            )}
                    </NoticeBox>
                </ModalContent>
            ) : (
                <>
                    <ModalContent>
                        {step === 'preview' && renderPreview()}
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button
                                secondary
                                onClick={onCloseClicked}
                                dataTest="data-download-modal-cancel"
                            >
                                {i18n.t('Cancel')}
                            </Button>
                            {step === 'preview' && (
                                <Button
                                    primary
                                    onClick={downloadData}
                                    dataTest="data-download-modal-confirm"
                                >
                                    {i18n.t('Download CSV')}
                                </Button>
                            )}
                        </ButtonStrip>
                    </ModalActions>
                </>
            )}
        </Modal>
    )
}

DataDownloadModal.propTypes = {
    onClose: PropTypes.func.isRequired,
}

export default DataDownloadModal
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
import {
    migrationActions,
} from '../../actions/migration.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import { sGetMetadata } from '../../reducers/metadata.js'
import { migrationSelectors } from '../../reducers/migration.js'
import OrgUnitSelection from './OrgUnitSelection.js'

const DataMigrationModal = ({ onClose }) => {
    const [step, setStep] = useState('selection') // selection, preview, migrating
    const [migrationProgress, setMigrationProgress] = useState({step: 0})

    const targetOrgUnit = useSelector(migrationSelectors.getMigrationTargetOrgUnitId)
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs)
    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs)
    const loading = useSelector(migrationSelectors.getMigrationIsLoading)
    const error = useSelector(migrationSelectors.getMigrationError)
    const migrationStatus = useSelector(migrationSelectors.getMigrationMigrationStatus)
    const failedTeis = useSelector(migrationSelectors.getMigrationFailedTeis)
    const metadata = useSelector(sGetMetadata)
    const engine = useDataEngine()
    const dispatch = useDispatch()

    const setTargetOrgUnit = (orgUnitId) => {
        if (metadata[orgUnitId]) {
            console.log('[History][Target OrgUnit Selected]', {
                id: orgUnitId,
                name: metadata[orgUnitId].name || metadata[orgUnitId].displayName
            })
        }
        dispatch(migrationActions.setTargetOrgUnit(orgUnitId))
    }

    // Log target org unit when it becomes available (step to preview or migration)
    React.useEffect(() => {
        if (targetOrgUnit && metadata[targetOrgUnit]) {
            console.log('[History][Target OrgUnit Selected]', {
                id: targetOrgUnit,
                name: metadata[targetOrgUnit].name || metadata[targetOrgUnit].displayName
            })
        }
    }, [targetOrgUnit, metadata])

    const migrateData = async () => {
        // Add validation before starting migration
        if (!allTeis || !selectedTeis || !targetOrgUnit || !metadata[targetOrgUnit] || !engine) {
            console.error('Missing required parameters for migration:', {
                allTeis: !!allTeis,
                selectedTeis: !!selectedTeis,
                targetOrgUnit: !!targetOrgUnit,
                metadata: !!metadata[targetOrgUnit],
                engine: !!engine
            })
            return
        }

        setStep('migrating')
        setMigrationProgress({step: 0})

        // Simulating progress updates
        const updateProgress = (progress) => {
            setMigrationProgress(progress)
        }

        dispatch(
            migrationActions.migrateTEIs({
                teis: allTeis,
                selectedTeis: selectedTeis,
                targetOrgUnit: targetOrgUnit,
                targetOrgUnitName: metadata[targetOrgUnit]?.name || metadata[targetOrgUnit]?.displayName,
                engine: engine,
                onProgress: updateProgress,
            })
        )
    }

    const retryFailedMigration = async () => {
        setStep('migrating')
        setMigrationProgress({step: 0})

        const updateProgress = (progress) => {
            setMigrationProgress(progress)
        }

        // Check if this is a full error retry or partial failure retry
        const isFullErrorRetry = error !== null && migrationStatus === 'failed'

        if (isFullErrorRetry) {
            // For full error retry, use all originally selected TEIs
            dispatch(
                migrationActions.migrateTEIs({
                    teis: allTeis,
                    selectedTeis: selectedTeis,
                    targetOrgUnit: targetOrgUnit,
                    targetOrgUnitName: metadata[targetOrgUnit]?.name || metadata[targetOrgUnit]?.displayName,
                    engine: engine,
                    onProgress: updateProgress,
                })
            )
        } else {
            // For partial failure retry, only retry the failed TEIs
            // Add validation to ensure all required parameters are present
            if (!allTeis || !failedTeis || !targetOrgUnit || !metadata[targetOrgUnit] || !engine) {
                console.error(`Missing required parameters for retry: allTeis: ${allTeis}
                    failedTeis: ${!!failedTeis},
                    targetOrgUnit: ${!!targetOrgUnit},
                    metadata: ${!!metadata[targetOrgUnit]},
                    engine: ${!!engine}`, {
                    allTeis: !!allTeis,
                    failedTeis: !!failedTeis,
                    targetOrgUnit: !!targetOrgUnit,
                    metadata: !!metadata[targetOrgUnit],
                    engine: !!engine
                })
                return
            }

            dispatch(
                migrationActions.retryFailedTEIs({
                    teis: allTeis,
                    failedTeis: failedTeis,
                    targetOrgUnit: targetOrgUnit,
                    targetOrgUnitName: metadata[targetOrgUnit]?.name || metadata[targetOrgUnit]?.displayName,
                    engine: engine,
                    onProgress: updateProgress,
                })
            )
        }
    }

    const onCloseClicked = () => {
        if (migrationStatus === 'success') {
            dispatch(dataActionCreators.reset())
            dispatch(migrationActions.resetMigration())
        } else {
            dispatch(migrationActions.resetMigration())
        }
        onClose()
    }

    const renderPreview = () => (
        <div style={{ padding: '16px' }}>
            <NoticeBox title={i18n.t('Migration Preview')} warning>
                <p>{i18n.t('You are about to migrate:')}</p>
                <ul>
                    <li>
                        {i18n.t('{{count}} TEIs', { count: selectedTeis.length })}
                    </li>
                    <li>
                        {i18n.t('To {{orgUnit}}', {
                            orgUnit: metadata[targetOrgUnit].displayName,
                        })}
                    </li>
                </ul>
                <p>{i18n.t('Are you sure you want to continue?')}</p>
            </NoticeBox>
        </div>
    )

    const renderProgress = () => {
        const successCount = (migrationProgress.successfulTeis && migrationProgress.successfulTeis.length) || 0
        const failureCount = (migrationProgress.failedTeis && migrationProgress.failedTeis.length) || 0
        const totalCount = migrationProgress.total || 0
        const percent = totalCount ? Math.round(((successCount + failureCount) / totalCount) * 100) : 0
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '16px'
            }}>
                <CircularLoader />
                {
                    migrationProgress.step === 0? <div>
                        <p>{i18n.t("Updating Organisation Units")}</p>
                    </div> : <>
                        <div>
                            {i18n.t('Transferring Ownerships {{success}} successes and {{failure}} failures of {{total}} TEIs...', {
                                success: successCount,
                                failure: failureCount,
                                total: totalCount,
                            })}
                        </div>
                        <div>
                            {percent}%
                        </div>
                    </>
                }
            </div>
        )
    }

    const renderMigrationResults = () => {
        const hasFailedTeis = failedTeis && failedTeis.length > 0
        const hasError = error !== null

        if (migrationStatus === 'success' && !hasFailedTeis) {
            return (
                <NoticeBox success title={i18n.t('Migration successful')}>
                    {i18n.t('All TEIs have been successfully migrated to the selected org unit.')}
                </NoticeBox>
            )
        }

        if (migrationStatus === 'partial_success' || hasFailedTeis) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <NoticeBox warning title={i18n.t('Migration completed with some failures')}>
                        {i18n.t('Some TEIs could not be migrated. {{count}} TEI(s) failed to migrate.', {
                            count: failedTeis.length
                        })}
                    </NoticeBox>
                    {hasError && (
                        <NoticeBox error title={i18n.t('Error details')}>
                            {error?.message || error || i18n.t('An error occurred during migration')}
                        </NoticeBox>
                    )}
                </div>
            )
        }

        if (hasError) {
            return (
                <NoticeBox error title={i18n.t('Migration failed')}>
                    <p>{error?.message || error || i18n.t('The migration could not be completed')}</p>
                    <p style={{ marginTop: '8px', fontStyle: 'italic' }}>
                        {i18n.t('You can retry the migration for all {{count}} selected TEIs.', {
                            count: selectedTeis.length
                        })}
                    </p>
                </NoticeBox>
            )
        }

        return null
    }

    const showRetryButton = () => {
        // Show retry button for:
        // 1. Partial success with failed TEIs
        // 2. Complete failure with error
        // 3. Any scenario with failed TEIs
        return (
            (migrationStatus === 'partial_success' ||
                migrationStatus === 'failed' ||
                error !== null ||
                (failedTeis && failedTeis.length > 0)) &&
            !loading
        )
    }

    const showCloseOnlyButton = () => {
        return migrationStatus === 'success' && (!failedTeis || failedTeis.length === 0) && error === null
    }

    const getRetryButtonText = () => {
        const hasError = error !== null
        const hasFailedTeis = failedTeis && failedTeis.length > 0

        if (hasError && migrationStatus === 'failed') {
            return i18n.t('Retry All TEIs')
        } else if (hasFailedTeis) {
            return i18n.t('Retry Failed TEIs')
        }
        else {
            return i18n.t('Retry Migration')
        }
    }

    return (
        <Modal onClose={onCloseClicked} position="middle" large>
            <ModalTitle>Data Migration</ModalTitle>
            {loading && step === 'migrating' ? (
                <ModalContent>
                    {renderProgress()}
                </ModalContent>
            ) : (
                <>
                    <ModalContent>
                        {migrationStatus === 'success' || migrationStatus === 'partial_success' || migrationStatus === 'failed' || error ? (
                            renderMigrationResults()
                        ) : step === 'selection' ? (
                            <div style={{ marginBottom: '20px' }}>
                                <h4>Select Target Organisation Unit</h4>
                                <OrgUnitSelection isSourceOrgUnit={false} setSelected={setTargetOrgUnit} />
                            </div>
                        ) : step === 'preview' ? (
                            renderPreview()
                        ) : null}
                    </ModalContent>
                    <ModalActions>
                        {showCloseOnlyButton() ? (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={onCloseClicked}
                                    dataTest="data-migration-modal-close"
                                >
                                    {i18n.t('Close')}
                                </Button>
                            </ButtonStrip>
                        ) : showRetryButton() ? (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={onCloseClicked}
                                    dataTest="data-migration-modal-cancel"
                                >
                                    {i18n.t('Cancel')}
                                </Button>
                                <Button
                                    primary
                                    onClick={retryFailedMigration}
                                    dataTest="data-migration-modal-retry"
                                >
                                    {getRetryButtonText()}
                                </Button>
                            </ButtonStrip>
                        ) : (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={onCloseClicked}
                                    dataTest="data-migration-modal-cancel"
                                >
                                    {i18n.t('Cancel')}
                                </Button>
                                {step === 'selection' && (
                                    <Button
                                        disabled={!targetOrgUnit}
                                        primary
                                        onClick={() => setStep('preview')}
                                        dataTest="data-migration-modal-next"
                                    >
                                        {i18n.t('Next')}
                                    </Button>
                                )}
                                {step === 'preview' && (
                                    <Button
                                        primary
                                        onClick={migrateData}
                                        dataTest="data-migration-modal-confirm"
                                    >
                                        {i18n.t('Confirm Migration')}
                                    </Button>
                                )}
                            </ButtonStrip>
                        )}
                    </ModalActions>
                </>
            )}
        </Modal>
    )
}

DataMigrationModal.propTypes = {
    onClose: PropTypes.func.isRequired,
}

export default DataMigrationModal

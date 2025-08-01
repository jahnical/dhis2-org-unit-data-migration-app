import { useDataEngine } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { Modal, ModalContent, ModalActions, ButtonStrip, ModalTitle, Button, CircularLoader, NoticeBox } from '@dhis2/ui';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dataActionCreators } from '../../actions/data_controls.js';
import { migrationActions } from '../../actions/migration.js';
import { dataControlSelectors } from '../../reducers/data_controls.js';
import { sGetMetadata } from '../../reducers/metadata.js';
import { migrationSelectors } from '../../reducers/migration.js';
import OrgUnitSelection from '../SearchableOrgUnitTree/OrgUnitSelection.js';

const DataMigrationModal = _ref => {
    let {
        onClose
    } = _ref;
    const [step, setStep] = useState('selection'); // selection, preview, migrating
    const [migrationProgress, setMigrationProgress] = useState({
        step: 0
    });
    const [preservedOrgUnit, setPreservedOrgUnit] = useState(null); // Store org unit when going to preview

    const dispatch = useDispatch();
    const targetOrgUnit = useSelector(migrationSelectors.getMigrationTargetOrgUnitId);
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs);
    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs);
    const loading = useSelector(migrationSelectors.getMigrationIsLoading);
    const error = useSelector(migrationSelectors.getMigrationError);
    const migrationStatus = useSelector(migrationSelectors.getMigrationMigrationStatus);
    const metadata = useSelector(sGetMetadata);
    const engine = useDataEngine();

    useEffect(() => {
        // Clear target org unit when modal opens
        dispatch(migrationActions.setTargetOrgUnit(null));
        setPreservedOrgUnit(null);
    }, [dispatch]);

    console.log('targetOrgUnit value:', targetOrgUnit);
    const [currentUser, setCurrentUser] = useState(null)

    // Fetch logged-in user on mount
    React.useEffect(() => {
        async function fetchUser() {
            try {
                const { me } = await engine.query({
                    me: { resource: 'me' },
                })
                setCurrentUser(me)
                console.log('Logged-in user:', me)
            } catch (e) {
                console.error('Failed to fetch logged-in user', e)
            }
        }
        fetchUser()
    }, [engine])

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
        setStep('migrating');
        setMigrationProgress({
            step: 0
        });

        // Simulating progress updates
        const updateProgress = (progress) => {
            setMigrationProgress(progress)
        }

        dispatch(
            migrationActions.migrateTEIs({
                teis: allTeis,
                selectedTeis: selectedTeis,
                targetOrgUnit: targetOrgUnit,
                targetOrgUnitName: metadata[targetOrgUnit].name,
                engine: engine,
                onProgress: updateProgress,
                currentUser: currentUser,
            })
        )
    }

    const onCloseClicked = () => {
        if (migrationStatus === 'success') {
            dispatch(dataActionCreators.reset());
            dispatch(migrationActions.resetMigration());
        } else {
            dispatch(migrationActions.resetMigration())
        }
        dispatch({ type: 'MIGRATE_TEIS_RESET' });
        onClose();
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
                    migrationProgress.step == 0? <div>
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

    return (
        <Modal onClose={onCloseClicked} position="middle" large>
            <ModalTitle>Data Migration</ModalTitle>
            {loading && step === 'migrating' ? (
                <ModalContent>
                    {renderProgress()}
                </ModalContent>
            ) : error ? (
                <ModalContent>
                    <NoticeBox error title={i18n.t('Could not migrate TEIs')}>
                        {error?.message ||
                            i18n.t(
                                "The TEIs couldn't be migrated. {{error}}",
                                { error: error }
                            )}
                    </NoticeBox>
                </ModalContent>
            ) : (
                <>
                    <ModalContent>
                        {migrationStatus === 'success' ? (
                            <NoticeBox success title={i18n.t('Migration successful')}>
                                {i18n.t('All TEIs have been successfully migrated to the selected org unit.')}
                            </NoticeBox>
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
                        {migrationStatus === 'success' ? (
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={onCloseClicked}
                                    dataTest="data-migration-modal-confirm"
                                >
                                    {i18n.t('Close')}
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
    onClose: PropTypes.func.isRequired
};

export default DataMigrationModal;

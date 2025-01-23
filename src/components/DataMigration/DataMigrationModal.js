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
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    migrationActionCreators,
    migrationAsyncActions,
} from '../../actions/migration.js'
import { sGetMetadata } from '../../reducers/metadata.js'
import { migrationSelectors } from '../../reducers/migration.js'
import HSACredentialsForm from './HSACredentialsForm.js'
import OrgUnitSelection from './OrgUnitSelection.js'

const DataMigrationModal = ({ onClose }) => {
    const targetOrgUnit = useSelector(
        migrationSelectors.getMigrationTargetOrgUnit
    )
    const credentials = useSelector(migrationSelectors.getMigrationCredentials)
    const filteredTeis = useSelector(migrationSelectors.getMigrationTEIs)
    const allTeis = useSelector(migrationSelectors.getMigrationRawTEIs)
    const loading = useSelector(migrationSelectors.getMigrationIsLoading)
    const error = useSelector(migrationSelectors.getMigrationError)
    const migrationStatus = useSelector(
        migrationSelectors.getMigrationMigrationStatus
    )
    const metadata = useSelector(sGetMetadata)
    const engine = useDataEngine()
    const dispatch = useDispatch()

    const migrateData = () => {
        dispatch(
            migrationAsyncActions.migrateTEIs({
                teis: allTeis,
                filteredTeis: filteredTeis,
                targetOrgUnit: targetOrgUnit,
                targetOrgUnitName: metadata[targetOrgUnit],
                credentials: credentials,
                engine: engine,
            })
        )
    }

    const onCloseClicked = () => {
        if (migrationStatus === 'success') {
            dispatch(migrationActionCreators.reset())
        }
        onClose()
    }

    return (
        <Modal onClose={onClose} position="middle" large>
            <ModalTitle>Data Migration</ModalTitle>
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
                            {i18n.t(
                                'Migrating {{count}} TEIs to {{targetOrgUnit}}...',
                                {
                                    count: filteredTeis.length,
                                    targetOrgUnit: metadata[targetOrgUnit]
                                        ? metadata[targetOrgUnit].displayName
                                        : undefined,
                                }
                            )}
                        </span>
                    </div>
                </ModalContent>
            ) : error ? (
                <ModalContent>
                    <NoticeBox error title={i18n.t('Could not migrate TEIs')}>
                        {error?.message ||
                            i18n.t(
                                "The TEIs couldn't be migrated. Try again or contact your system administrator."
                            )}
                    </NoticeBox>
                </ModalContent>
            ) : (
                <>
                    <ModalContent
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {migrationStatus === 'success' ? (
                            <NoticeBox
                                success
                                title={i18n.t('Migration successful')}
                            >
                                {i18n.t(
                                    'All TEIs have been successfully migrated to the selected org unit.'
                                )}
                            </NoticeBox>
                        ) : (
                            <>
                                <div style={{ marginBottom: '20px' }}>
                                    <h4>Select Target Organisation Unit</h4>
                                    <OrgUnitSelection isSourceOrgUnit={false} />
                                </div>
                                <div
                                    style={{
                                        overflow: 'auto',
                                        maxHeight: '512px',
                                        maxWidth: '372pt',
                                        marginBottom: '16px',
                                    }}
                                >
                                    <HSACredentialsForm />
                                </div>
                            </>
                        )}
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
                                <Button
                                    disabled={
                                        !targetOrgUnit ||
                                        !credentials.username ||
                                        !credentials.password
                                    }
                                    primary
                                    onClick={migrateData}
                                    dataTest="data-migration-modal-confirm"
                                >
                                    {i18n.t('Migrate')}
                                </Button>
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

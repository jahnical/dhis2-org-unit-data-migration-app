import { Button, Divider } from '@dhis2/ui'
import cx from 'classnames'
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { acSetUiAccessoryPanelActiveTab } from '../../actions/ui.js'
import { ACCESSORY_PANEL_TAB_INPUT } from '../../modules/accessoryPanelConstants.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import {
    sGetUiShowAccessoryPanel,
    sGetUiSidebarHidden,
    sGetUiAccessoryPanelActiveTab,
} from '../../reducers/ui.js'
import DataDeletionModal from '../DataDeletion/DataDeletionModal.js'
import DataMigrationModal from '../DataMigration/DataMigrationModal.js'
import OrgUnitSelection from '../SearchableOrgUnitTree/OrgUnitSelection.js'
import { InputPanel } from './InputPanel/index.js'
import styles from './MainSidebar.module.css'
import { useSelectedDimensions } from './SelectedDimensionsContext.js'
import { useResizableAccessorySidebar } from './useResizableAccessorySidebar.js'

const MainSidebar = () => {
    const dispatch = useDispatch()
    const selectedTabId = useSelector(sGetUiAccessoryPanelActiveTab)
    const programId = useSelector(dataControlSelectors.getDataControlProgram)
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit)
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs)
    const open = useSelector(sGetUiShowAccessoryPanel) && Boolean(selectedTabId)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false)
    const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false)

    const {
        isResizing,
        accessoryStyle,
        accessoryInnerStyle,
        onResizeHandleMouseDown,
        onResizeHandleFocus,
        onResizeHandleDblClick,
    } = useResizableAccessorySidebar(!open)

    const isHidden = useSelector(sGetUiSidebarHidden)
    const setSelectedTabId = useCallback(
        (id) => {
            dispatch(acSetUiAccessoryPanelActiveTab(id))
        },
        [dispatch]
    )
    useSelectedDimensions()

    useEffect(() => {
        if (!open && !isTransitioning) {
            setSelectedTabId(null)
        }
    }, [open, isTransitioning, setSelectedTabId])

    const onMigrateDataCliked = () => {
        console.log('Migrate Data clicked')
        setIsMigrationModalOpen(true)
    }

    const onDeleteDataCliked = () => {
        console.log('Delete Data clicked')
        setIsDeletionModalOpen(true)
    }

    const handleDMmodalClose = () => {
        setIsMigrationModalOpen(false)
        setIsDeletionModalOpen(false)
    }

    return (
        <div
            className={cx(styles.container, {
                [styles.hidden]: isHidden,
                [styles.resizing]: isResizing,
            })}
        >
            <div
                className={cx(styles.accessory, styles.main, {
                    [styles.hidden]: !open,
                    [styles.padded]:
                        selectedTabId === ACCESSORY_PANEL_TAB_INPUT,
                    [styles.transitioning]: isTransitioning,
                })}
                style={accessoryStyle}
                data-test="accessory-sidebar"
            >
                <div
                    className={styles.accessoryInner}
                    style={accessoryInnerStyle}
                    onTransitionEnd={() => setIsTransitioning(false)}
                >
                    <InputPanel
                        visible={selectedTabId === ACCESSORY_PANEL_TAB_INPUT}
                    />

                    <Divider />

                    {/* Updated OrgUnitSelection with compact mode and custom styling */}
                    <div className={styles.orgUnitSelectionWrapper}>
                        <OrgUnitSelection
                            isSourceOrgUnit={true}
                            title="Select Source Organisation Unit"
                            description="" // No description for compact mode
                            compact={true}
                            maxHeight="400px" // Custom max height for sidebar
                        />
                    </div>

                    <Divider />

                    {isMigrationModalOpen && (
                        <DataMigrationModal onClose={handleDMmodalClose} />
                    )}

                    {isDeletionModalOpen && (
                        <DataDeletionModal onClose={handleDMmodalClose} />
                    )}

                    <Button
                        primary
                        onClick={onMigrateDataCliked}
                        style={{
                            width: '100%',
                            maxWidth: '512px',
                            height: '48px',
                            marginTop: '16px',
                        }}
                        disabled={!programId || !orgUnitId || selectedTeis.length === 0}
                    >
                        Migrate Data
                    </Button>

                    <Button
                        destructive={true}
                        onClick={onDeleteDataCliked}
                        style={{
                            width: '100%',
                            maxWidth: '512px',
                            height: '48px',
                            marginTop: '16px',
                        }}
                        disabled={!programId || !orgUnitId || selectedTeis.length === 0}
                    >
                        Delete Data
                    </Button>
                </div>
                {open && (
                    <div
                        className={styles.resizeHandle}
                        onMouseDown={onResizeHandleMouseDown}
                        onFocus={onResizeHandleFocus}
                        onDoubleClick={onResizeHandleDblClick}
                        tabIndex={0}
                        data-test="accessory-panel-resize-handle"
                    />
                )}
            </div>
        </div>
    )
}

export default MainSidebar

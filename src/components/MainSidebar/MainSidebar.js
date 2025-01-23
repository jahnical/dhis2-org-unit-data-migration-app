import { Button, Divider } from '@dhis2/ui'
import cx from 'classnames'
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { acSetUiAccessoryPanelActiveTab } from '../../actions/ui.js'
import { ACCESSORY_PANEL_TAB_INPUT } from '../../modules/accessoryPanelConstants.js'
import { migrationSelectors } from '../../reducers/migration.js'
import {
    sGetUiShowAccessoryPanel,
    sGetUiSidebarHidden,
    sGetUiAccessoryPanelActiveTab,
} from '../../reducers/ui.js'
import DataMigrationModal from '../DataMigration/DataMigrationModal.js'
import OrgUnitSelection from '../DataMigration/OrgUnitSelection.js'
import { InputPanel } from './InputPanel/index.js'
import styles from './MainSidebar.module.css'
import { useSelectedDimensions } from './SelectedDimensionsContext.js'
import { useResizableAccessorySidebar } from './useResizableAccessorySidebar.js'

const MainSidebar = () => {
    const dispatch = useDispatch()
    const selectedTabId = useSelector(sGetUiAccessoryPanelActiveTab)
    const programId = useSelector(migrationSelectors.getMigrationProgram)
    const orgUnitId = useSelector(migrationSelectors.getMigrationOrgUnit)
    const open = useSelector(sGetUiShowAccessoryPanel) && Boolean(selectedTabId)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

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
        setIsOpen(true)
    }

    const handleDMmodalClose = () => {
        setIsOpen(false)
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

                    <div
                        style={{
                            overflow: 'auto',
                            maxHeight: '512px',
                        }}
                    >
                        <h4>Select Source Organisation Unit</h4>
                        <OrgUnitSelection isSourceOrgUnit={true} />
                    </div>

                    <Divider />

                    {isOpen && (
                        <DataMigrationModal onClose={handleDMmodalClose} />
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
                        disabled={!programId || !orgUnitId}
                    >
                        Migrate Data
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

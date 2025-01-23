import { useCachedDataQuery } from '@dhis2/analytics'
import { CssVariables } from '@dhis2/ui'
import cx from 'classnames'
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { acClearAll, acSetVisualizationLoading } from '../actions/loader.js'
import { tSetInitMetadata } from '../actions/metadata.js'
import { acSetShowExpandedLayoutPanel } from '../actions/ui.js'
import history from '../modules/history.js'
import { SYSTEM_SETTINGS_DIGIT_GROUP_SEPARATOR } from '../modules/systemSettings.js'
import {
    sGetIsVisualizationLoading,
    sGetLoadError,
} from '../reducers/loader.js'
import { migrationSelectors } from '../reducers/migration.js'
import { sGetUiProgramId } from '../reducers/ui.js'
import classes from './App.module.css'
import TEIs from './DataMigration/TEIs.js'
import { default as DialogManager } from './Dialogs/DialogManager.js'
import DndContext from './DndContext.js'
import Layout from './Layout/Layout.js'
import LoadingMask from './LoadingMask/LoadingMask.js'
import MainSidebar from './MainSidebar/MainSidebar.js'
import { Toolbar } from './Toolbar/Toolbar.js'
import StartScreen from './Visualization/StartScreen.js'

const App = () => {
    const programId = useSelector(sGetUiProgramId)
    const orgUnitId = useSelector(migrationSelectors.getMigrationOrgUnit)
    const [initialLoadIsComplete, setInitialLoadIsComplete] = useState(false)
    const dispatch = useDispatch()
    const isLoading = useSelector(sGetIsVisualizationLoading)
    const error = useSelector(sGetLoadError)
    const { systemSettings, rootOrgUnits } = useCachedDataQuery()
    const digitGroupSeparator =
        systemSettings[SYSTEM_SETTINGS_DIGIT_GROUP_SEPARATOR]

    const loadVisualization = async (location) => {
        //dispatch(acSetVisualizationLoading(true))
        const isExisting = location.pathname.length > 1
        if (!isExisting) {
            dispatch(
                acClearAll({
                    error: null,
                    digitGroupSeparator,
                    rootOrgUnits,
                })
            )
            dispatch(acSetVisualizationLoading(false))
        }
        /* When creating a new visualisation it's convenient to have
         * a lot of space for adding/viewing dimensions */
        dispatch(acSetShowExpandedLayoutPanel(!isExisting))
        setInitialLoadIsComplete(true)
    }

    useEffect(() => {
        dispatch(tSetInitMetadata(rootOrgUnits))
        loadVisualization(history.location)
    }, [])

    return (
        <div
            className={cx(
                classes.eventReportsApp,
                classes.flexCt,
                classes.flexDirCol
            )}
        >
            <Toolbar />
            <div
                className={cx(
                    classes.sectionMain,
                    classes.flexGrow1,
                    classes.flexCt
                )}
            >
                <DndContext>
                    <MainSidebar />
                    <DialogManager />
                    <div
                        className={cx(
                            classes.flexGrow1,
                            classes.minWidth0,
                            classes.flexBasis0,
                            classes.flexCt,
                            classes.flexDirCol
                        )}
                    >
                        <div className={classes.mainCenterLayout}>
                            <Layout />
                        </div>
                        <div className={cx(classes.mainCenterCanvas)}>
                            {(initialLoadIsComplete &&
                                (!programId || !orgUnitId) &&
                                !isLoading) ||
                            error ? (
                                <StartScreen />
                            ) : (
                                <>
                                    {isLoading && (
                                        <div className={classes.loadingCover}>
                                            <LoadingMask />
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            margin: '16px auto',
                                            maxWidth: '95%',
                                            overflowX: 'auto',
                                        }}
                                    >
                                        <TEIs />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </DndContext>
            </div>
            <CssVariables colors spacers theme />
        </div>
    )
}

export default App

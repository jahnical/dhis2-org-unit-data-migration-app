//src/components/App.js
// This file contains the main App component which sets up the layout and handles the main application logic.
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
import { dataControlSelectors } from '../reducers/data_controls.js'
import {
    sGetIsVisualizationLoading,
    sGetLoadError,
} from '../reducers/loader.js'
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
import History from './MigrationHistory/History'
import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect } from 'react'
import { loadMigrationHistory, cleanupOldHistoryThunk } from '../actions/historyThunks'

const App = () => {
    const programId = useSelector(sGetUiProgramId)
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit)
    const [initialLoadIsComplete, setInitialLoadIsComplete] = useState(false)
    const [tabIndex, setTabIndex] = useState(0)
    const dispatch = useDispatch()
    const isLoading = useSelector(sGetIsVisualizationLoading)
    const error = useSelector(sGetLoadError)
    const { systemSettings, rootOrgUnits } = useCachedDataQuery()
    const digitGroupSeparator =
        systemSettings[SYSTEM_SETTINGS_DIGIT_GROUP_SEPARATOR]
    const engine = useDataEngine()

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

    const handleTabChange = (index) => setTabIndex(index)

    useEffect(() => {
        dispatch(tSetInitMetadata(rootOrgUnits))
        loadVisualization(history.location)
    }, [])

    // Log logged-in user on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const { me } = await engine.query({
                    me: { resource: 'me' },
                })
                console.log('Logged-in user:', me)
            } catch (e) {
                console.error('Failed to fetch logged-in user', e)
            }
        }
        fetchUser()
    }, [engine])

    useEffect(() => {
        // On app startup, load and cleanup migration history
        dispatch(loadMigrationHistory(engine))
        dispatch(cleanupOldHistoryThunk(engine))
    }, [dispatch, engine])

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
                        {/* Tabs */}
                        <div
                            style={{
                                display: 'flex',
                                borderBottom: '1px solid #ccc',
                                marginBottom: 16,
                            }}
                        >
                            <button
                                style={{
                                    flex: 0.1,
                                    padding: '12px 0',
                                    border: 'none',
                                    borderBottom:
                                        tabIndex === 0 ? '2px solid #1976d2' : 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: tabIndex === 0 ? 'bold' : 'normal',
                                }}
                                onClick={() => handleTabChange(0)}
                            >
                                Main
                            </button>
                            <button
                                style={{
                                    flex: 0.1,
                                    padding: '12px 0',
                                    border: 'none',
                                    borderBottom:
                                        tabIndex === 1 ? '2px solid #1976d2' : 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: tabIndex === 1 ? 'bold' : 'normal',
                                }}
                                onClick={() => handleTabChange(1)}
                            >
                                History
                            </button>
                        </div>
                        {/* Main Layout */}
                        <div className={classes.mainCenterLayout}>
                            <Layout />
                        </div>
                        {/* Tab Content */}
                        <div className={cx(classes.mainCenterCanvas)}>
                            {tabIndex === 0 &&
                                ((initialLoadIsComplete &&
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
                                ))}
                            {tabIndex === 1 && (
                                <div
                                    style={{
                                        margin: '16px auto',
                                        maxWidth: '95%',
                                        overflowX: 'visible',
                                    }}
                                >
                                    <History />
                                </div>
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

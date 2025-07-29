import { combineReducers } from 'redux'
import current from './current.js'
import { dataControl } from './data_controls.js'
import { deleteTeis } from './deletion.js'
import loader from './loader.js'
import metadata from './metadata.js'
import { migration } from './migration.js'
import ui from './ui.js'
import visualization from './visualization.js'
import { downloadTeis } from './download.js'
import historyTeis from './historyTeis.js'
import historyReducer from './history.js'
import undoMigrationReducer from './undoMigration.js'

// Reducers

export default combineReducers({
    current,
    loader,
    metadata,
    ui,
    visualization,
    migration,
    deleteTeis,
    dataControl,
    downloadTeis,
    historyTeis,
    history: historyReducer,
    undoMigration: undoMigrationReducer,
})

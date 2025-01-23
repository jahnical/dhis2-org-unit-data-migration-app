import { combineReducers } from 'redux'
import current from './current.js'
import loader from './loader.js'
import metadata from './metadata.js'
import { migrationForm, migration } from './migration.js'
import ui from './ui.js'
import visualization from './visualization.js'

// Reducers

export default combineReducers({
    current,
    loader,
    metadata,
    ui,
    visualization,
    migrationForm,
    migration,
})

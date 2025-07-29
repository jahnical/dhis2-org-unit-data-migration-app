// src/reducers/history.js
// Redux reducer for migration history
import {
    LOG_HISTORY_BATCH,
    LOAD_HISTORY,
    CLEANUP_OLD_HISTORY,
} from '../actions/history'

const initialState = {
    histories: [],
}

const historyReducer = (state = initialState, action) => {
    switch (action.type) {
        case LOG_HISTORY_BATCH:
            return {
                ...state,
                histories: [action.payload, ...state.histories],
            };
        case LOAD_HISTORY:
            return {
                ...state,
                histories: action.payload,
            };
        case 'SET_MIGRATION_HISTORY':
            return {
                ...state,
                histories: action.payload,
            };
        case 'CLEAR_MIGRATION_HISTORY':
            return {
                ...state,
                histories: [],
            };
        case CLEANUP_OLD_HISTORY:
            // Actual cleanup logic will be handled by a thunk/middleware
            return state;
        default:
            return state;
    }
}

export default historyReducer

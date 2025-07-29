// Undo Migration Reducer (reverse migration)
import {
    UNDO_MIGRATION_BATCH,
    UNDO_MIGRATION_SUCCESS,
    UNDO_MIGRATION_FAILURE,
} from '../actions/undoMigration';

const initialState = {
    loading: false,
    error: null,
    success: false,
};

const undoMigrationReducer = (state = initialState, action) => {
    switch (action.type) {
        case UNDO_MIGRATION_BATCH:
            return { ...state, loading: true, error: null, success: false };
        case UNDO_MIGRATION_SUCCESS:
            return { ...state, loading: false, success: true };
        case UNDO_MIGRATION_FAILURE:
            return { ...state, loading: false, error: action.payload, success: false };
        case 'RESET_UNDO_MIGRATION':
            return initialState;
        default:
            return state;
    }
};

export default undoMigrationReducer;
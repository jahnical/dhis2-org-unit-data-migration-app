export const DELETION_TYPES = {
    // Only keep soft delete and restore types
    DELETE_TEIS_START: 'DELETE_TEIS_START',
    DELETE_TEIS_ERROR: 'DELETE_TEIS_ERROR',
    SOFT_DELETE_TEIS: 'SOFT_DELETE_TEIS',
    RESTORE_TEIS_START: 'RESTORE_TEIS_START',
    RESTORE_TEIS_SUCCESS: 'RESTORE_TEIS_SUCCESS',
    RESTORE_TEIS_ERROR: 'RESTORE_TEIS_ERROR',
    RESET: 'DELETE_TEIS_RESET',
}

const deletionInitialState = {
    teis: [],
    loading: false,
    error: null,
    deletionStatus: null,
}

export function deleteTeis(state = deletionInitialState, action) {
    switch (action.type) {
        case DELETION_TYPES.DELETE_TEIS_START:
            return { ...state, loading: true, error: null }

        case DELETION_TYPES.SOFT_DELETE_TEIS:
            // Do not update teis here, expect a fresh fetch after deletion
            return {
                ...state,
                deletionStatus: 'soft_deleted',
                loading: false,
            }

        case DELETION_TYPES.RESTORE_TEIS_START:
            return { ...state, loading: true, error: null }

        case DELETION_TYPES.RESTORE_TEIS_SUCCESS:
            // Do not update teis here, expect a fresh fetch after restore
            return {
                ...state,
                loading: false,
                deletionStatus: 'restored',
            }

        case DELETION_TYPES.RESTORE_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload, deletionStatus: null }

        case DELETION_TYPES.DELETE_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload, deletionStatus: null }

        case DELETION_TYPES.RESET:
            return deletionInitialState

        default:
            return state
    }
}

export const deletionSelectors = {
    getDeletionState: (state) => state.deleteTeis.deletionStatus,
    getDeletionIsLoading: (state) => state.deleteTeis.loading,
    getDeletionError: (state) => state.deleteTeis.error,
    getDeletedTEIs: (state) => state.deleteTeis.teis.filter(tei => tei.deleted),
    getRestorableTEIs: (state) => state.deleteTeis.teis.filter(tei => tei.deleted),
}

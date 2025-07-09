export const DELETION_TYPES = {
    DELETE_TEIS_START: 'DELETE_TEIS_START',
    DELETE_TEIS_SUCCESS: 'DELETE_TEIS_SUCCESS',
    DELETE_TEIS_ERROR: 'DELETE_TEIS_ERROR',
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

        case DELETION_TYPES.DELETE_TEIS_SUCCESS:
            return {
                ...state,
                loading: false,
                deletionStatus: 'success',
                teis: [],
            }

        case DELETION_TYPES.DELETE_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload }

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
    getDeletedTEIs: (state) => state.deleteTeis.teis,
}

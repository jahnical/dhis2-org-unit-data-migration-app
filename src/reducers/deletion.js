export const DELETION_TYPES = {
    DELETE_TEIS_START: 'deletion/DELETE_TEIS_START',
    DELETE_TEIS_SUCCESS: 'deletion/DELETE_TEIS_SUCCESS',
    DELETE_TEIS_ERROR: 'deletion/DELETE_TEIS_ERROR',

    RESTORE_TEIS_START: 'deletion/RESTORE_TEIS_START',
    RESTORE_TEIS_SUCCESS: 'deletion/RESTORE_TEIS_SUCCESS',
    RESTORE_TEIS_ERROR: 'deletion/RESTORE_TEIS_ERROR',
     RESTORE_TEIS_COMPLETE: 'deletion/RESTORE_TEIS_COMPLETE',

    RESET: 'deletion/RESET',
}

const initialState = {
    loading: false,
    error: null,
    deletionStatus: null, // 'deleted' | 'restored' | null
}

export function deleteTeis(state = initialState, action) {
  switch (action.type) {
    case DELETION_TYPES.DELETE_TEIS_START:
    case DELETION_TYPES.RESTORE_TEIS_START:
      return {
        ...state,
        loading: true,
        error: null,
        deletionStatus: null,
        restoredTeis: [],
      };

    case DELETION_TYPES.DELETE_TEIS_SUCCESS:
      return { 
        ...state, 
        loading: false, 
        deletionStatus: 'deleted' 
      };

    case DELETION_TYPES.RESTORE_TEIS_SUCCESS:
    case DELETION_TYPES.RESTORE_TEIS_COMPLETE:
      return { 
        ...state, 
        loading: false, 
        deletionStatus: 'restored', 
        restoredTeis: action.payload.teiUids || action.payload || [] 
      };

    case DELETION_TYPES.DELETE_TEIS_ERROR:
    case DELETION_TYPES.RESTORE_TEIS_ERROR:
      return { 
        ...state, 
        loading: false, 
        error: action.payload, 
        deletionStatus: null 
      };

    case DELETION_TYPES.RESET:
      return initialState;

    default:
      return state;
  }
}

// Selectors
const sGetDeletionIsLoading = state => state.deleteTeis.loading
const sGetDeletionError = state => state.deleteTeis.error
const sGetDeletionStatus = state => state.deleteTeis.deletionStatus
const sGetRestoredTeis = state => state.deleteTeis.restoredTeis
export const deletionSelectors = {
    getDeletionIsLoading: sGetDeletionIsLoading,
    getDeletionError: sGetDeletionError,
    getDeletionStatus: sGetDeletionStatus,
    getRestoredTeis: sGetRestoredTeis,
}

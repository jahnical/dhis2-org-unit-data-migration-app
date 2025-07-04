export const DOWNLOAD_TYPES = {
    DOWNLOAD_TEIS_START: 'DOWNLOAD_TEIS_START',
    DOWNLOAD_TEIS_SUCCESS: 'DOWNLOAD_TEIS_SUCCESS',
    DOWNLOAD_TEIS_ERROR: 'DOWNLOAD_TEIS_ERROR',
    SET_TARGET_ORG_UNIT: 'DATA_CONTROL_SET_TARGET_ORG_UNIT',
    RESET: 'DOWNLOAD_TEIS_RESET',
}

const downloadInitialState = {
    loading: false,
    error: null,
    targetOrgUnitId: null,
    migrationStatus: null
}

export function downloadTeis(state = downloadInitialState, action) {
    switch (action.type) {
        case DOWNLOAD_TYPES.SET_TARGET_ORG_UNIT:
            return { ...state, targetOrgUnitId: action.payload }

        case DOWNLOAD_TYPES.DOWNLOAD_TEIS_START:
            return { ...state, loading: true, error: null }

        case DOWNLOAD_TYPES.DOWNLOAD_TEIS_SUCCESS:
            return {
                ...state,
                loading: false,
                downloadStatus: 'success',
                teis: [],
            }

        case DOWNLOAD_TYPES.DOWNLOAD_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload }

        case DOWNLOAD_TYPES.RESET:
            return downloadInitialState

        default:
            return state
    }
}

export const downloadSelectors = {
    getDownloadStatus: (state) => state.downloadTeis.downloadStatus,
    getDownloadIsLoading: (state) => state.downloadTeis.loading,
    getDownloadError: (state) => state.downloadTeis.error,
    getDownloadedTEIs: (state) => state.downloadTeis.teis,
}

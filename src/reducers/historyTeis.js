// Redux slice for History TEIs
const defaultState = {
    isLoading: false,
    error: null,
    teis: [],
    selectedTeis: [],
    filters: {},
    attributesToDisplay: [],
};

export const historyTeisActionTypes = {
    SET_LOADING: 'historyTeis/SET_LOADING',
    SET_ERROR: 'historyTeis/SET_ERROR',
    SET_TEIS: 'historyTeis/SET_TEIS',
    SET_SELECTED_TEIS: 'historyTeis/SET_SELECTED_TEIS',
    SET_FILTERS: 'historyTeis/SET_FILTERS',
    SET_ATTRIBUTES_TO_DISPLAY: 'historyTeis/SET_ATTRIBUTES_TO_DISPLAY',
};

function historyTeisReducer(state = defaultState, action) {
    switch (action.type) {
        case historyTeisActionTypes.SET_LOADING:
            return { ...state, isLoading: action.payload };
        case historyTeisActionTypes.SET_ERROR:
            return { ...state, error: action.payload };
        case historyTeisActionTypes.SET_TEIS:
            return { ...state, teis: action.payload };
        case historyTeisActionTypes.SET_SELECTED_TEIS:
            return { ...state, selectedTeis: action.payload };
        case historyTeisActionTypes.SET_FILTERS:
            return { ...state, filters: action.payload };
        case historyTeisActionTypes.SET_ATTRIBUTES_TO_DISPLAY:
            return { ...state, attributesToDisplay: action.payload };
        default:
            return state;
    }
}

export default historyTeisReducer;

// Selectors
export const sGetHistoryTeisIsLoading = state => state.historyTeis.isLoading;
export const sGetHistoryTeisError = state => state.historyTeis.error;
export const sGetHistoryTeis = state => state.historyTeis.teis;
export const sGetHistorySelectedTeis = state => state.historyTeis.selectedTeis;
export const sGetHistoryTeisFilters = state => state.historyTeis.filters;
export const sGetHistoryTeisAttributesToDisplay = state => state.historyTeis.attributesToDisplay;

import { historyTeisActionTypes } from '../reducers/historyTeis.js';

export const setHistoryTeisLoading = (isLoading) => ({
    type: historyTeisActionTypes.SET_LOADING,
    payload: isLoading,
});

export const setHistoryTeisError = (error) => ({
    type: historyTeisActionTypes.SET_ERROR,
    payload: error,
});

export const setHistoryTeis = (teis) => ({
    type: historyTeisActionTypes.SET_TEIS,
    payload: teis,
});

export const setHistorySelectedTeis = (selectedTeis) => ({
    type: historyTeisActionTypes.SET_SELECTED_TEIS,
    payload: selectedTeis,
});

export const setHistoryTeisFilters = (filters) => ({
    type: historyTeisActionTypes.SET_FILTERS,
    payload: filters,
});

export const setHistoryTeisAttributesToDisplay = (attributes) => ({
    type: historyTeisActionTypes.SET_ATTRIBUTES_TO_DISPLAY,
    payload: attributes,
});

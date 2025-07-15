import { filterTeis } from "../modules/data_control.js"

export const DATA_CONTROL_TYPES = {
    SET_ORG_UNIT: 'DATA_CONTROL_SET_ORG_UNIT',
    SET_PROGRAM: 'DATA_CONTROL_SET_PROGRAM',
    SET_CREDENTIALS: 'DATA_CONTROL_SET_CREDENTIALS',
    SET_SELECTED_TEIS: 'DATA_CONTROL_SET_SELECTED_TEIS',
    ADD_FILTER: 'DATA_CONTROL_ADD_FILTER',
    UPDATE_FILTER: 'DATA_CONTROL_UPDATE_FILTER',
    REMOVE_FILTER: 'DATA_CONTROL_REMOVE_FILTER',
    ADD_DISPLAY_ATTRIBUTE: 'DATA_CONTROL_ADD_DISPLAY_ATTRIBUTE',
    REMOVE_DISPLAY_ATTRIBUTE: 'DATA_CONTROL_REMOVE_DISPLAY_ATTRIBUTE',
    RESET: 'DATA_CONTROL_RESET',
    FETCH_TEIS_START: 'DATA_CONTROL_FETCH_TEIS_START',
    FETCH_TEIS_SUCCESS: 'DATA_CONTROL_FETCH_TEIS_SUCCESS',
    FETCH_TEIS_ERROR: 'DATA_CONTROL_FETCH_TEIS_ERROR',
    SET_FILTERS: 'DATA_CONTROL_SET_FILTERS', // <-- Added missing action type
}

// Initial States
const controlInitialState = {
    orgUnitId: null,
    programId: null,
    credentials: {
        username: '',
        password: '',
    },
    attributesToDisplay: [],
    filters: [],
    selectedTeis: [],
    teis: [],
    loading: false,
    error: null,
}

// Form Reducer
export function dataControl(state = controlInitialState, action) {
    switch (action.type) {
        case DATA_CONTROL_TYPES.SET_ORG_UNIT:
            return { ...state, orgUnitId: action.payload, filters: [] }

        case DATA_CONTROL_TYPES.SET_PROGRAM:
            return { ...state, programId: action.payload, filters: [] }

        case DATA_CONTROL_TYPES.SET_CREDENTIALS:
            return {
                ...state,
                credentials: { ...state.credentials, ...action.payload },
            }

        case DATA_CONTROL_TYPES.ADD_FILTER:
            return {
                ...state,
                filters: [...state.filters, action.payload],
            }

        case DATA_CONTROL_TYPES.UPDATE_FILTER:
            return {
                ...state,
                filters: state.filters.map((filter) =>
                    filter.field === action.payload.field
                        ? action.payload
                        : filter
                ),
            }

        case DATA_CONTROL_TYPES.SET_FILTERS:
            return {
                ...state,
                filters: action.payload,
            }

        case DATA_CONTROL_TYPES.ADD_DISPLAY_ATTRIBUTE:
            return {
                ...state,
                attributesToDisplay: [
                    ...state.attributesToDisplay,
                    action.payload,
                ],
            }

        case DATA_CONTROL_TYPES.REMOVE_DISPLAY_ATTRIBUTE:
            return {
                ...state,
                attributesToDisplay: state.attributesToDisplay.filter(
                    (attr) => attr !== action.payload
                ),
            }

        case DATA_CONTROL_TYPES.REMOVE_FILTER:
            return {
                ...state,
                filters: state.filters.filter(
                    (filter) => filter.field !== action.payload.name
                ),
            }

        case DATA_CONTROL_TYPES.SET_SELECTED_TEIS:
            return {
                ...state,
                selectedTeis: action.payload,
            }

        case DATA_CONTROL_TYPES.FETCH_TEIS_START:
            return { ...state, loading: true, error: null }

        case DATA_CONTROL_TYPES.FETCH_TEIS_SUCCESS:
                    return { ...state, loading: false, teis: action.payload }

        case DATA_CONTROL_TYPES.FETCH_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload }

        case DATA_CONTROL_TYPES.RESET:
            return controlInitialState

        default:
            return state
    }
}

// Selectors
export const dataControlSelectors = {
    getDataControlState: (state) => state.dataControl,
    getDataControlOrgUnit: (state) => state.dataControl.orgUnitId,
    getDataControlProgram: (state) => state.dataControl.programId,
    getDataControlCredentials: (state) => state.dataControl.credentials,
    getDataControlFilters: (state) => state.dataControl.filters,
    getDataControlIsLoading: (state) => state.dataControl.loading,
    getDataControlError: (state) => state.dataControl.error,
    getDataControlMigrationStatus: (state) => state.dataControl.migrationStatus,
    getSelectedTEIs: (state) => state.dataControl.selectedTeis,
    getDataControlAttributesToDisplay: (state) =>
        state.dataControl.attributesToDisplay,
    getDataControlRawTEIs: (state) => state.dataControl.teis,
    getDataControlTEIs: (state) => {
        const teis = state.dataControl.teis
        return filterTeis(
            teis,
            state.dataControl.filters
        )
    },
}


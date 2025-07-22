import { DATA_CONTROL_TYPES } from "../reducers/data_controls.js"


export const dataActionCreators = {
    setSourceOrgUnit: (orgUnitId) => ({
        type: DATA_CONTROL_TYPES.SET_ORG_UNIT,
        payload: orgUnitId,
    }),

    setProgram: (programId) => ({
        type: DATA_CONTROL_TYPES.SET_PROGRAM,
        payload: programId,
    }),

    setCredentials: (credentials) => ({
        type: DATA_CONTROL_TYPES.SET_CREDENTIALS,
        payload: credentials,
    }),

    setSelectedTEIs: (teis) => ({
        type: DATA_CONTROL_TYPES.SET_SELECTED_TEIS,
        payload: teis,
    }),

    addFilter: (filter) => ({
        type: DATA_CONTROL_TYPES.ADD_FILTER,
        payload: filter,
    }),

    updateFilter: (filter) => ({
        type: DATA_CONTROL_TYPES.UPDATE_FILTER,
        payload: filter,
    }),

    removeFilter: (filter) => ({
        type: DATA_CONTROL_TYPES.REMOVE_FILTER,
        payload: filter,
    }),

    addDisplayAttribute: (attribute) => ({
        type: DATA_CONTROL_TYPES.ADD_DISPLAY_ATTRIBUTE,
        payload: attribute,
    }),

    removeDisplayAttribute: (attribute) => ({
        type: DATA_CONTROL_TYPES.REMOVE_DISPLAY_ATTRIBUTE,
        payload: attribute,
    }),

    reset: () => ({
        type: DATA_CONTROL_TYPES.RESET,
    }),

    fetchTEIs: (sourceOrgUnit, program, engine) => async (dispatch) => {
            if (!sourceOrgUnit || !program || !engine) {
                throw new Error('Missing required parameters')
            }

            dispatch({ type: DATA_CONTROL_TYPES.FETCH_TEIS_START })

            try {
                const allTEIs = []
                let hasMoreData = true
                let page = 1
                const pageSize = 500

                while (hasMoreData) {
                    const query = {
                        teis: {
                            resource: 'trackedEntityInstances',
                            params: {
                                ou: sourceOrgUnit,
                                program,
                                fields: '*',
                                pageSize,
                                page,
                                includeDeleted: true, // <-- Ensure deleted TEIs are included
                            },
                        },
                    }

                    const { teis } = await engine.query(query)

                    allTEIs.push(...teis.trackedEntityInstances)

                    if (teis.trackedEntityInstances.length === pageSize) {
                        page++
                    } else {
                        hasMoreData = false
                    }
                }

                // Patch: ensure every TEI has both id and trackedEntityInstance set
                const patchedTEIs = allTEIs.map(tei => ({
                    ...tei,
                    id: tei.trackedEntityInstance || tei.id,
                    trackedEntityInstance: tei.trackedEntityInstance || tei.id,
                }));
                dispatch({
                    type: DATA_CONTROL_TYPES.FETCH_TEIS_SUCCESS,
                    payload: patchedTEIs,
                })

                return allTEIs
            } catch (error) {
                dispatch({
                    type: DATA_CONTROL_TYPES.FETCH_TEIS_ERROR,
                    payload: error.message,
                })
                throw error
            }
        },

    // Fix: setDataControlFilters action creator for filters
    setDataControlFilters: (filters) => ({
        type: DATA_CONTROL_TYPES.SET_FILTERS,
        payload: filters,
    }),
}

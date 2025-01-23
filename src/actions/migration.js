import { MIGRATION_TYPES } from '../reducers/migration.js'

export const migrationActionCreators = {
    setSourceOrgUnit: (orgUnitId) => ({
        type: MIGRATION_TYPES.SET_ORG_UNIT,
        payload: orgUnitId,
    }),

    setTargetOrgUnit: (orgUnitId) => ({
        type: MIGRATION_TYPES.SET_TARGET_ORG_UNIT,
        payload: orgUnitId,
    }),

    setProgram: (programId) => ({
        type: MIGRATION_TYPES.SET_PROGRAM,
        payload: programId,
    }),

    setCredentials: (credentials) => ({
        type: MIGRATION_TYPES.SET_CREDENTIALS,
        payload: credentials,
    }),

    addFilter: (filter) => ({
        type: MIGRATION_TYPES.ADD_FILTER,
        payload: filter,
    }),

    updateFilter: (filter) => ({
        type: MIGRATION_TYPES.UPDATE_FILTER,
        payload: filter,
    }),

    removeFilter: (filter) => ({
        type: MIGRATION_TYPES.REMOVE_FILTER,
        payload: filter,
    }),

    addDisplayAttribute: (attribute) => ({
        type: MIGRATION_TYPES.ADD_DISPLAY_ATTRIBUTE,
        payload: attribute,
    }),

    removeDisplayAttribute: (attribute) => ({
        type: MIGRATION_TYPES.REMOVE_DISPLAY_ATTRIBUTE,
        payload: attribute,
    }),

    reset: () => ({
        type: MIGRATION_TYPES.RESET,
    }),
}

export const migrationAsyncActions = {
    fetchTEIs: (sourceOrgUnit, program, engine) => async (dispatch) => {
        if (!sourceOrgUnit || !program || !engine) {
            throw new Error('Missing required parameters')
        }

        dispatch({ type: MIGRATION_TYPES.FETCH_TEIS_START })

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

            dispatch({
                type: MIGRATION_TYPES.FETCH_TEIS_SUCCESS,
                payload: allTEIs,
            })

            return allTEIs
        } catch (error) {
            dispatch({
                type: MIGRATION_TYPES.FETCH_TEIS_ERROR,
                payload: error.message,
            })
            throw error
        }
    },

    migrateTEIs:
        ({
            teis,
            filteredTeis,
            targetOrgUnit,
            targetOrgUnitName,
            credentials,
            engine,
        }) =>
        async (dispatch) => {
            if (
                !teis?.length ||
                !targetOrgUnit ||
                !engine ||
                !filteredTeis?.length ||
                !credentials
            ) {
                throw new Error('Missing required parameters')
            }

            dispatch({ type: MIGRATION_TYPES.MIGRATE_TEIS_START })

            try {
                // Wrap the engine with new headers
                const customEngine = {
                    mutate: (mutation, options) => {
                        const headers = {
                            ...options?.headers,
                            Authorization: `Basic ${btoa(
                                `${credentials.username}:${credentials.password}`
                            )}`,
                        }
                        return engine.mutate(mutation, { ...options, headers })
                    },
                }

                teis = filteredTeis.map((tei) =>
                    teis.find((t) => t.trackedEntityInstance === tei.id)
                )
                const updatedTeis = teis.map((tei) => {
                    // Update all orgUnit references in the TEI
                    const updatedTei = {
                        ...tei,
                        orgUnit: targetOrgUnit,
                        lastUpdated: new Date().toISOString(),
                    }

                    // Update orgUnit in all enrollments
                    if (updatedTei.enrollments) {
                        updatedTei.enrollments = updatedTei.enrollments.map(
                            (enrollment) => ({
                                ...enrollment,
                                orgUnit: targetOrgUnit,
                                orgUnitName: targetOrgUnitName,
                            })
                        )
                    }

                    // Update orgUnit in all events
                    if (updatedTei.enrollments) {
                        updatedTei.enrollments.forEach((enrollment) => {
                            if (enrollment.events) {
                                enrollment.events = enrollment.events.map(
                                    (event) => ({
                                        ...event,
                                        orgUnit: targetOrgUnit,
                                        orgUnitName: targetOrgUnitName,
                                    })
                                )
                            }
                        })
                    }

                    // Update orgUnit in all ownerships
                    if (updatedTei.programOwners) {
                        updatedTei.programOwners = updatedTei.programOwners.map(
                            (ownership) => ({
                                ...ownership,
                                ownerOrgUnit: targetOrgUnit,
                            })
                        )
                    }

                    return updatedTei
                })

                const mutation = {
                    resource: 'trackedEntityInstances',
                    type: 'create',
                    data: {
                        trackedEntityInstances: updatedTeis,
                    },
                }

                const response = await customEngine.mutate(mutation)

                const ownershipPromises = updatedTeis.map(async (tei) => {
                    const ownershipPayload = {
                        trackedEntityInstance: tei.trackedEntityInstance,
                        program: tei.programOwners[0].program,
                        ou: targetOrgUnit,
                    }

                    const ownershipMutation = {
                        resource: `tracker/ownership/transfer`,
                        type: 'update',
                        params: ownershipPayload,
                    }

                    return engine.mutate(ownershipMutation)
                })

                // Wait for all ownership transfers to complete
                await Promise.all(ownershipPromises)

                dispatch({
                    type: MIGRATION_TYPES.MIGRATE_TEIS_SUCCESS,
                    payload: response,
                })

                return response
            } catch (error) {
                dispatch({
                    type: MIGRATION_TYPES.MIGRATE_TEIS_ERROR,
                    payload: error.message,
                })
                throw error
            }
        },
}

// Export all actions
export const migrationActions = {
    ...migrationActionCreators,
    ...migrationAsyncActions,
}

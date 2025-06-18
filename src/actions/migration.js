import { MIGRATION_TYPES } from '../reducers/migration.js'

export const dataActionCreators = {
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

    setSelectedTEIs: (teis) => ({
        type: MIGRATION_TYPES.SET_SELECTED_TEIS,
        payload: teis,
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
            selectedTeis,
            targetOrgUnit,
            targetOrgUnitName,
            engine,
            onProgress,
        }) =>
        async (dispatch) => {
            if (
                !teis?.length ||
                !targetOrgUnit ||
                !engine ||
                !selectedTeis?.length
            ) {
                throw new Error('Missing required parameters')
            }

            dispatch({ type: MIGRATION_TYPES.MIGRATE_TEIS_START })

            try {
                // Wrap the engine with new headers
                // const customEngine = {
                //     mutate: (mutation, options) => {
                //         const headers = {
                //             ...options?.headers,
                //             Authorization: `Basic ${btoa(
                //                 `${credentials.username}:${credentials.password}`
                //             )}`,
                //         }
                //         return engine.mutate(mutation, { ...options, headers })
                //     },
                // }

                const customEngine = engine

                teis = teis.filter((tei) =>
                    selectedTeis.includes(tei.trackedEntityInstance)
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

                onProgress({step: 0})

                const response = await customEngine.mutate(mutation)



                const successfulTeis = []
                const failedTeis = []
                const totalTeis = updatedTeis.length

                const updateProgress = () => {
                    onProgress({
                        step: 1,
                        total: totalTeis,
                        failedTeis: [...failedTeis],
                        successfulTeis: [...successfulTeis]
                    })
                }

                updateProgress()

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

                    try {
                        await engine.mutate(ownershipMutation)
                        successfulTeis.push(tei.trackedEntityInstance)
                        // Update progress after each successful transfer
                        updateProgress()
                    } catch (error) {
                        failedTeis.push(tei.trackedEntityInstance)

                        updateProgress()
                        console.error(`Failed to transfer ownership for TEI ${tei.trackedEntityInstance}:`, error)
                    }
                })

                // Wait for all ownership transfers to complete
                await Promise.all(ownershipPromises)

                // // Extract and update all events from TEIs
                // const updatedEvents = updatedTeis.flatMap(tei =>
                //     (tei.enrollments || []).flatMap(enrollment =>
                //         (enrollment.events || []).map(event => ({
                //             ...event,
                //             orgUnit: targetOrgUnit,
                //             orgUnitName: targetOrgUnitName,
                //         }))
                //     )
                // ).filter(event => event.event)

                // if (updatedEvents.length === 0) {
                //     console.log('No events found for updating.')
                //     return
                // }

                // console.log(`Updating ${updatedEvents.length} events...`)
                // console.log(updatedEvents)

                // // Update all events in a single API call
                // const eventMutation = {
                //     resource: 'events',
                //     type: 'create',
                //     data: {
                //         events: updatedEvents
                //     }
                // }

                // await customEngine.mutate(eventMutation)

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
    ...dataActionCreators,
    ...migrationAsyncActions,
}

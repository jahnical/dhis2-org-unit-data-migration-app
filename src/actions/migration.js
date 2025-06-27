import { MIGRATION_TYPES } from '../reducers/migration.js'

export const migrationActions = {
    setTargetOrgUnit: (orgUnitId) => ({
            type: MIGRATION_TYPES.SET_TARGET_ORG_UNIT,
            payload: orgUnitId,
        }),

    resetMigration: () => ({
            type: MIGRATION_TYPES.RESET,
        }),

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
                    const teiOwnershipPromises = tei.programOwners.map(async (ownership) => {
                        const ownershipPayload = {
                            trackedEntityInstance: tei.trackedEntityInstance,
                            program: ownership.program,
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
                    return await Promise.all(teiOwnershipPromises)
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

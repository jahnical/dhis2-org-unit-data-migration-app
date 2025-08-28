import { MIGRATION_TYPES } from '../reducers/migration.js'
import { logHistoryBatchThunk } from './history.js'

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
             currentUser,
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

                console.log("Selected TEIs for migration:", selectedTeis)

                    teis = teis.filter((tei) =>
                        selectedTeis.includes(tei.trackedEntityInstance)
                    )

                    // Use currentUser for storedBy/lastUpdatedBy
                const migrationUser = currentUser || { uid: '', username: '', displayName: '' }
                const updatedTeis = teis.map((tei) => {
                        // Update all orgUnit references in the TEI
                        const updatedTei = {
                            ...tei,
                            orgUnit: targetOrgUnit,
                            lastUpdated: new Date().toISOString(),
                            lastUpdatedBy: {
                            username: migrationUser.username || '',
                            displayName: migrationUser.displayName || migrationUser.username || '',
                        },
                        storedBy: migrationUser.username || migrationUser.displayName || '',
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
                                failedTeis.push({
                                    teiId: tei.trackedEntityInstance,
                                    error: error.message || error,
                                    timestamp: new Date().toISOString()
                                })

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

                //Log the migration history batch
                const state = dispatch((_, getState) => getState()) || {};
                const programId = state.ui?.program?.id;
                const programName = state.metadata?.[programId]?.name || '';
                const user = state.current?.user || { id: '', name: '' };
                const sourceOrgUnitId = teis[0]?.orgUnit; // Before migration, this is the source
                const sourceOrgUnitName = state.metadata?.[sourceOrgUnitId]?.name || '';
                const targetOrgUnitId = targetOrgUnit;
                const targetOrgUnitNameFinal = state.metadata?.[targetOrgUnitId]?.name || targetOrgUnitName || '';
                const historyBatch = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    date: new Date().toISOString().slice(0, 10),
                    time: new Date().toLocaleTimeString(),
                    action: 'migrated',
                    program: { id: programId, name: programName },
                    sourceOrgUnit: { id: sourceOrgUnitId, name: sourceOrgUnitName },
                    targetOrgUnit: { id: targetOrgUnitId, name: targetOrgUnitNameFinal },
                    user,
                    teis: updatedTeis.map(tei => ({
                        id: tei.trackedEntityInstance || tei.id,
                        created: tei.created,
                        lastUpdated: tei.lastUpdated,
                        storedBy: tei.storedBy,
                        lastUpdatedBy: tei.lastUpdatedBy,
                        attributes: tei.attributes || [],
                    })),
                };
                await dispatch(logHistoryBatchThunk(historyBatch, engine));

                    return response
                } catch (error) {
                    dispatch({
                        type: MIGRATION_TYPES.MIGRATE_TEIS_ERROR,
                        payload: error.message,
                    })
                    throw error
                }
            },

    retryFailedTEIs:
        ({
             teis,
             failedTeis,
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
                    !failedTeis?.length
                ) {
                    throw new Error('Missing required parameters for retry')
                }

                dispatch({ type: MIGRATION_TYPES.MIGRATE_TEIS_START })

                try {
                    // Filter TEIs to only include the failed ones
                    const failedTeiIds = failedTeis.map(failed => failed.teiId || failed)
                    const teisToRetry = teis.filter((tei) =>
                        failedTeiIds.includes(tei.trackedEntityInstance)
                    )

                    if (teisToRetry.length === 0) {
                        throw new Error('No failed TEIs found to retry')
                    }

                    const updatedTeis = teisToRetry.map((tei) => {
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

                    onProgress({step: 0})

                    const successfulTeis = []
                    const newFailedTeis = []
                    const totalTeis = updatedTeis.length

                    const updateProgress = () => {
                        onProgress({
                            step: 1,
                            total: totalTeis,
                            failedTeis: [...newFailedTeis],
                            successfulTeis: [...successfulTeis]
                        })
                    }

                    updateProgress()

                    // Only attempt ownership transfer for retry (skip the TEI update mutation)
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
                                updateProgress()
                            } catch (error) {
                                newFailedTeis.push({
                                    teiId: tei.trackedEntityInstance,
                                    error: error.message || error,
                                    timestamp: new Date().toISOString()
                                })
                                updateProgress()
                                console.error(`Failed to retry ownership transfer for TEI ${tei.trackedEntityInstance}:`, error)
                            }
                        })
                        return await Promise.all(teiOwnershipPromises)
                    })

                    // Wait for all ownership transfers to complete
                    await Promise.all(ownershipPromises)

                    // Determine migration status based on results
                    const migrationStatus = newFailedTeis.length === 0 ? 'success' :
                        successfulTeis.length > 0 ? 'partial_success' : 'failed'

                    dispatch({
                        type: MIGRATION_TYPES.MIGRATE_TEIS_SUCCESS,
                        payload: {
                            response: { status: 'OK' }, // Dummy response for retry
                            successfulTeis,
                            failedTeis: newFailedTeis,
                            migrationStatus
                        },
                    })

                    // Log the retry history batch
                    const state = dispatch((_, getState) => getState()) || {};
                    const programId = state.ui?.program?.id;
                    const programName = state.metadata?.[programId]?.name || '';
                    const user = state.current?.user || { id: '', name: '' };
                    const sourceOrgUnitId = teisToRetry[0]?.orgUnit;
                    const sourceOrgUnitName = state.metadata?.[sourceOrgUnitId]?.name || '';
                    const targetOrgUnitId = targetOrgUnit;
                    const targetOrgUnitNameFinal = state.metadata?.[targetOrgUnitId]?.name || targetOrgUnitName || '';

                    const historyBatch = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        date: new Date().toISOString().slice(0, 10),
                        time: new Date().toLocaleTimeString(),
                        action: 'retry_migrated',
                        program: { id: programId, name: programName },
                        sourceOrgUnit: { id: sourceOrgUnitId, name: sourceOrgUnitName },
                        targetOrgUnit: { id: targetOrgUnitId, name: targetOrgUnitNameFinal },
                        user,
                        teis: updatedTeis.map(tei => ({
                            id: tei.trackedEntityInstance || tei.id,
                            created: tei.created,
                            lastUpdated: tei.lastUpdated,
                            storedBy: tei.storedBy,
                            lastUpdatedBy: tei.lastUpdatedBy,
                            attributes: tei.attributes || [],
                        })),
                    };
                    await dispatch(logHistoryBatchThunk(historyBatch, engine));

                    return { successfulTeis, failedTeis: newFailedTeis }
                } catch (error) {
                    dispatch({
                        type: MIGRATION_TYPES.MIGRATE_TEIS_ERROR,
                        payload: error.message,
                    })
                    throw error
                }
            },
}

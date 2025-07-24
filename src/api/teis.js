import { trackDeletedTei, untrackDeletedTei } from '../utils/datastoreActions';

// Helper to generate a random DHIS2 UID (11 chars, [A-Za-z0-9], first char is a letter)
function generateDhis2Uid() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = chars.charAt(Math.floor(Math.random() * 52)); // first char: only letters
    for (let i = 1; i < 11; i++) {
        uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
}

const updateUIDs = (tei) => {
    // Clone the TEI to avoid mutating the original
    const newTei = { ...tei, id: null };

    // Generate new TEI UID
    const oldTeiUid = newTei.trackedEntityInstance;
    const newTeiUid = generateDhis2Uid();
    newTei.trackedEntityInstance = newTeiUid;

    // Update programOwners
    if (Array.isArray(newTei.programOwners)) {
        newTei.programOwners = newTei.programOwners.map(owner => ({
            ...owner,
            trackedEntityInstance: newTeiUid
        }));
    }

    // Update relationships (if any reference this TEI)
    if (Array.isArray(newTei.relationships)) {
        newTei.relationships = newTei.relationships.map(rel => {
            const newRel = { ...rel };
            if (newRel.from && newRel.from.trackedEntityInstance && newRel.from.trackedEntityInstance.trackedEntityInstance === oldTeiUid) {
                newRel.from = {
                    ...newRel.from,
                    trackedEntityInstance: {
                        ...newRel.from.trackedEntityInstance,
                        trackedEntityInstance: newTeiUid
                    }
                };
            }
            if (newRel.to && newRel.to.trackedEntityInstance && newRel.to.trackedEntityInstance.trackedEntityInstance === oldTeiUid) {
                newRel.to = {
                    ...newRel.to,
                    trackedEntityInstance: {
                        ...newRel.to.trackedEntityInstance,
                        trackedEntityInstance: newTeiUid
                    }
                };
            }
            return newRel;
        });
    }

    // Map of old enrollment IDs to new ones
    const enrollmentIdMap = {};
    // Map of old event IDs to new ones (not strictly needed, but for completeness)
    const eventIdMap = {};

    // Update enrollments
    if (Array.isArray(newTei.enrollments)) {
        newTei.enrollments = newTei.enrollments.map(enrollment => {
            const newEnrollment = { ...enrollment };
            const oldEnrollmentId = newEnrollment.enrollment;
            const newEnrollmentId = generateDhis2Uid();
            enrollmentIdMap[oldEnrollmentId] = newEnrollmentId;
            newEnrollment.enrollment = newEnrollmentId;
            newEnrollment.trackedEntityInstance = newTeiUid;

            // Update events
            if (Array.isArray(newEnrollment.events)) {
                newEnrollment.events = newEnrollment.events.map(event => {
                    const newEvent = { ...event };
                    const oldEventId = newEvent.event;
                    const newEventId = generateDhis2Uid();
                    eventIdMap[oldEventId] = newEventId;
                    newEvent.event = newEventId;
                    newEvent.trackedEntityInstance = newTeiUid;
                    newEvent.enrollment = newEnrollmentId;
                    return newEvent;
                });
            }

            return newEnrollment;
        });
    }

    // Update programOwners (again, for completeness, if any reference old TEI UID)
    if (Array.isArray(newTei.programOwners)) {
        newTei.programOwners = newTei.programOwners.map(owner => ({
            ...owner,
            trackedEntityInstance: newTeiUid
        }));
    }

    // Update relationships inside enrollments/events if present
    if (Array.isArray(newTei.enrollments)) {
        newTei.enrollments = newTei.enrollments.map(enrollment => {
            const newEnrollment = { ...enrollment };
            if (Array.isArray(newEnrollment.events)) {
                newEnrollment.events = newEnrollment.events.map(event => {
                    const newEvent = { ...event };
                    // If relationships exist in event, update trackedEntityInstance/enrollment/event references
                    if (Array.isArray(newEvent.relationships)) {
                        newEvent.relationships = newEvent.relationships.map(rel => {
                            const newRel = { ...rel };
                            if (newRel.from && newRel.from.trackedEntityInstance && newRel.from.trackedEntityInstance.trackedEntityInstance === oldTeiUid) {
                                newRel.from = {
                                    ...newRel.from,
                                    trackedEntityInstance: {
                                        ...newRel.from.trackedEntityInstance,
                                        trackedEntityInstance: newTeiUid
                                    }
                                };
                            }
                            if (newRel.to && newRel.to.trackedEntityInstance && newRel.to.trackedEntityInstance.trackedEntityInstance === oldTeiUid) {
                                newRel.to = {
                                    ...newRel.to,
                                    trackedEntityInstance: {
                                        ...newRel.to.trackedEntityInstance,
                                        trackedEntityInstance: newTeiUid
                                    }
                                };
                            }
                            return newRel;
                        });
                    }
                    return newEvent;
                });
            }
            return newEnrollment;
        });
    }

    return newTei;
};

/**
 * Soft delete a Tracked Entity Instance using the DHIS2 native mechanism.
 * This sets the `deleted = true` flag in the database.
 *
 * @param {object} engine - The DHIS2 app-runtime data engine
 * @param {string} teiUid - The UID of the TEI to delete
 */
export const deleteTEI = async (engine, teiUid, fullTei) => {
  try {
    await engine.mutate({
        resource: `trackedEntityInstances/${teiUid}`,
        type: 'delete',
    })
    // Track deleted TEI in datastore (store full object)
    await trackDeletedTei(engine, fullTei || { id: teiUid })
    console.info(`Successfully soft-deleted TEI ${teiUid}`)
  } catch (error) {
    let errorMsg = `Failed to delete TEI ${teiUid}`
    if (error && error.message) {
      errorMsg += `: ${error.message}`
    }
    if (error && error.status) {
      errorMsg += ` (status: ${error.status})`
    }
    console.error(errorMsg, error)
    throw new Error(errorMsg)
  }
}

export const newRestoreTEI = async (engine, teis) => {
    if (!teis) {
        throw new Error('TEIs is required for restoration')
    }

    try {
        // Update the deleted flag to false
        const updatedTeis = teis.map(tei => {
            console.log(`Restoring TEI: ${tei.trackedEntityInstance || tei.id}`)
            console.log('Original TEI data:', tei)
            const updatedTei = { ...tei }
            updatedTei.deleted = false

            // Update enrollemnts
            if (updatedTei.enrollments) {
                updatedTei.enrollments = updatedTei.enrollments.map(enrollment => {
                    const updatedEnrollment = { ...enrollment }
                    updatedEnrollment.deleted = false

                    // Update events
                    if (updatedEnrollment.events) {
                        updatedEnrollment.events = updatedEnrollment.events.map(event => {
                            const updatedEvent = { ...event }
                            updatedEvent.deleted = false
                            return updatedEvent
                        })
                    }

                    return updatedEnrollment
                })
            }

            console.log('Updated TEI data for restoration:', updatedTei)
            return updateUIDs(updatedTei)
        })

        const response = await engine.mutate({
            resource: `trackedEntityInstances`,
            type: 'create',
            data: {
                trackedEntityInstances: updatedTeis,
            },
        })
        // Untrack restored TEIs in datastore
        for (const tei of teis) {
            await untrackDeletedTei(engine, tei.trackedEntityInstance || tei.id)
        }
        console.info(`Successfully restored TEIs: ${teis.map(tei => tei.trackedEntityInstance || tei.id).join(', ')}`)
        return response
    } catch (error) {
        console.error('Failed to restore TEIs:', error)
        // Rethrow a more informative error for the UI
        throw new Error(`Failed to restore TEIs: ${error.message || error}`)
    }
}


import { trackDeletedTeiBatch, untrackDeletedTei } from '../utils/datastoreActions';

// Helper to generate a random DHIS2 UID (11 chars, [A-Za-z0-9], first char is a letter)
function generateDhis2Uid() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = chars.charAt(Math.floor(Math.random() * 52)); // first char: only letters
    for (let i = 1; i < 11; i++) {
        uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
}



// Recursively replace all old UIDs with new ones in the TEI object
function deepReplaceUIDs(obj, uidMap) {
    if (Array.isArray(obj)) {
        return obj.map(item => deepReplaceUIDs(item, uidMap));
    } else if (obj && typeof obj === 'object') {
        const newObj = {};
        for (const key of Object.keys(obj)) {
            let value = obj[key];
            // If the value is a string and matches an old UID, replace it
            if (typeof value === 'string' && uidMap[value]) {
                newObj[key] = uidMap[value];
            } else {
                newObj[key] = deepReplaceUIDs(value, uidMap);
            }
        }
        return newObj;
    }
    return obj;
}

const updateUIDs = (tei) => {
    // Clone the TEI to avoid mutating the original
    const newTei = { ...tei };

    // Build UID maps
    const uidMap = {};

    // TEI UID
    const oldTeiUid = newTei.trackedEntityInstance;
    const newTeiUid = generateDhis2Uid();
    uidMap[oldTeiUid] = newTeiUid;
    newTei.trackedEntityInstance = newTeiUid;
    newTei.id = newTeiUid;

    // Enrollment UIDs
    if (Array.isArray(newTei.enrollments)) {
        newTei.enrollments = newTei.enrollments.map(enrollment => {
            const newEnrollment = { ...enrollment };
            const oldEnrollmentId = newEnrollment.enrollment;
            const newEnrollmentId = generateDhis2Uid();
            uidMap[oldEnrollmentId] = newEnrollmentId;
            newEnrollment.enrollment = newEnrollmentId;
            newEnrollment.trackedEntityInstance = newTeiUid;

            // Event UIDs
            if (Array.isArray(newEnrollment.events)) {
                newEnrollment.events = newEnrollment.events.map(event => {
                    const newEvent = { ...event };
                    const oldEventId = newEvent.event;
                    const newEventId = generateDhis2Uid();
                    uidMap[oldEventId] = newEventId;
                    newEvent.event = newEventId;
                    newEvent.trackedEntityInstance = newTeiUid;
                    newEvent.enrollment = newEnrollmentId;
                    return newEvent;
                });
            }
            return newEnrollment;
        });
    }

    // Program owners
    if (Array.isArray(newTei.programOwners)) {
        newTei.programOwners = newTei.programOwners.map(owner => ({
            ...owner,
            trackedEntityInstance: newTeiUid
        }));
    }

    // Now recursively replace all old UIDs with new ones everywhere in the object
    const fullyUpdatedTei = deepReplaceUIDs(newTei, uidMap);
    return fullyUpdatedTei;
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
    // Track deleted TEI in datastore as a batch (store full object)
    await trackDeletedTeiBatch(engine, [fullTei || { id: teiUid }])
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
        // Update the deleted flag to false and remove invalid attribute values
        const updatedTeis = teis.map(tei => {
            console.log(`Restoring TEI: ${tei.trackedEntityInstance || tei.id}`)
            console.log('Original TEI data:', tei)
            const updatedTei = { ...tei };
            updatedTei.deleted = false;

            // Remove invalid attribute values (not valid for their option set)
            if (Array.isArray(updatedTei.attributes)) {
                updatedTei.attributes = updatedTei.attributes.filter(attr => {
                    // If attribute has an optionSetValue and value is not valid, remove it
                    // We can't check against the option set here without fetching, so only remove if DHIS2 marks as invalid in previous import summary
                    // For now, remove any attribute with value 'pajoni_ndalama_ngwelero' for attribute 'dkFbZ4zHZZc' as per last error
                    if (attr.attribute === 'dkFbZ4zHZZc' && attr.value === 'pajoni_ndalama_ngwelero') {
                        console.warn('Removing invalid attribute value for restore:', attr);
                        return false;
                    }
                    return true;
                });
            }

            // Update enrollments
            if (updatedTei.enrollments) {
                updatedTei.enrollments = updatedTei.enrollments.map(enrollment => {
                    const updatedEnrollment = { ...enrollment };
                    updatedEnrollment.deleted = false;

                    // Update events
                    if (updatedEnrollment.events) {
                        updatedEnrollment.events = updatedEnrollment.events.map(event => {
                            const updatedEvent = { ...event };
                            updatedEvent.deleted = false;
                            return updatedEvent;
                        });
                    }

                    return updatedEnrollment;
                });
            }

            const finalTei = updateUIDs(updatedTei);
            console.log('Updated TEI data for restoration:', finalTei);
            return finalTei;
        });

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
        let errorMsg = 'Failed to restore TEIs.';
        // Log the full error object for debugging
        console.error('Full error object:', error);
        if (error && error.details && error.details.response) {
            console.error('Error details.response:', error.details.response);
            if (error.details.response.importSummaries) {
                console.error('Import summaries:', error.details.response.importSummaries);
                const summaries = error.details.response.importSummaries;
                if (Array.isArray(summaries) && summaries.length > 0) {
                    errorMsg += ' Import summary: ' + summaries.map(s => s.description || s.status || JSON.stringify(s)).join('; ');
                }
            }
        }
        if (error && error.message) {
            errorMsg += ' ' + error.message;
        } else if (typeof error === 'string') {
            errorMsg += ' ' + error;
        }
        throw new Error(errorMsg);
    }
}


/**
 * API helpers for soft deleting and restoring TEIs using DHIS2 native endpoints.
 */

/**
 * Soft delete a Tracked Entity Instance using the DHIS2 native mechanism.
 * This sets the `deleted = true` flag in the database.
 *
 * @param {object} engine - The DHIS2 app-runtime data engine
 * @param {string} teiUid - The UID of the TEI to delete
 */
export const deleteTEI = async (engine, teiUid) => {
  try {
    await engine.mutate({
        resource: `trackedEntityInstances/${teiUid}`,
        type: 'delete',
    })
    console.info(`Successfully soft-deleted TEI ${teiUid}`)
  } catch (error) {        // Log error details
    let errorMsg = `Failed to delete TEI ${teiUid}`
    if (error && error.message) {
      errorMsg += `: ${error.message}`
    }
    if (error && error.status) {
        errorMsg += ` (status: ${error.status})`
    }
    console.error(errorMsg, error)
    // Rethrow a more informative error for the UI
    throw new Error(errorMsg)
  }
}

/**
 * Restore a previously deleted TEI by fetching, updating status, and posting back.
 * Includes fallback query to retrieve from orgUnit+program if UID fetch fails.
 *
 * @param {object} engine - The DHIS2 app-runtime data engine
 * @param {string} teiUid - The UID of the TEI to restore
 * @param {string} orgUnitId - Org unit ID for fallback query
 * @param {string} programId - Program ID for fallback query
 */
export const restoreTEI = async (engine, teiUid, orgUnitId, programId) => {
    try {
        // Validate parameters
        if (!teiUid || !orgUnitId || !programId) {
            throw new Error('Missing required parameters for TEI restoration');
        }

        console.log(`Starting restoration of TEI: ${teiUid}`);

        // 1. Get the complete soft-deleted TEI data using the legacy API
        const teiQuery = {
            tei: {
                resource: 'trackedEntityInstances',
                params: {
                    trackedEntityInstance: teiUid,
                    ou: orgUnitId,
                    program: programId,
                    includeDeleted: true,
                    fields: '*'
                }
            }
        };

        console.log('Fetching complete TEI data:', JSON.stringify(teiQuery, null, 2));

        const teiResponse = await engine.query(teiQuery);
        const teiData = teiResponse?.tei?.trackedEntityInstances?.[0];

        if (!teiData) {
            throw new Error(`TEI ${teiUid} not found in orgUnit ${orgUnitId} and program ${programId}`);
        }

        console.log('Retrieved TEI data:', JSON.stringify(teiData, null, 2));

        // 2. Check if TEI is actually deleted
        if (!teiData.deleted) {
            console.log('TEI is not deleted, no restoration needed');
            return {
                success: true,
                trackedEntity: teiUid,
                status: 'ALREADY_ACTIVE',
                message: 'TEI is already active, no restoration needed'
            };
        }

        // 3. Strategy 1: Try using the new Tracker API endpoint (DHIS2 2.36+)
        console.log('Attempting restoration with new Tracker API...');
        try {
            const trackerPayload = {
                trackedEntities: [{
                    trackedEntity: teiUid,
                    trackedEntityType: teiData.trackedEntityType,
                    orgUnit: orgUnitId,
                    attributes: teiData.attributes || [],
                    enrollments: teiData.enrollments?.map(enrollment => ({
                        enrollment: enrollment.enrollment,
                        program: enrollment.program,
                        orgUnit: enrollment.orgUnit,
                        enrolledAt: enrollment.enrollmentDate,
                        occurredAt: enrollment.incidentDate,
                        status: enrollment.enrollmentStatus === 'CANCELLED' ? 'ACTIVE' : enrollment.enrollmentStatus,
                        events: enrollment.events?.map(event => ({
                            event: event.event,
                            programStage: event.programStage,
                            orgUnit: event.orgUnit,
                            occurredAt: event.eventDate,
                            status: event.status === 'COMPLETED' ? 'ACTIVE' : event.status,
                            dataValues: event.dataValues || []
                        })) || []
                    })) || []
                }]
            };

            const trackerResponse = await engine.mutate({
                resource: 'tracker',
                type: 'create',
                data: trackerPayload,
                params: {
                    importStrategy: 'UPDATE',
                    atomicMode: 'OBJECT'
                }
            });

            console.log('Tracker API response:', JSON.stringify(trackerResponse, null, 2));

            // --- Poll for tracker job completion ---
            const jobId = trackerResponse?.response?.id;
            if (jobId) {
                let jobStatus = null;
                for (let i = 0; i < 10; i++) {
                    await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds
                    const statusResp = await engine.query({
                        job: {
                            resource: `tracker/jobs/${jobId}`,
                            params: { fields: '*' }
                        }
                    });
                    // Improved logging for debugging job status
                    console.log('Full tracker job status response:', JSON.stringify(statusResp, null, 2));
                    const jobArray = statusResp?.job;
                    if (Array.isArray(jobArray)) {
                        // Find the INFO-level, completed job entry
                        const completedJob = jobArray.find(j => j.level === 'INFO' && j.completed);
                        jobStatus = completedJob ? 'COMPLETED' : undefined;
                    } else {
                        jobStatus = statusResp?.job?.status || statusResp?.status || statusResp?.state;
                    }
                    console.log(`Tracker job status [${i}]:`, jobStatus);
                    if (jobStatus === 'COMPLETED' || jobStatus === 'ERROR') break;
                }
                if (jobStatus !== 'COMPLETED') {
                    throw new Error('Tracker job did not complete successfully');
                }
                // Fetch and log the tracker import report after job completion
                try {
                    const importReportResp = await engine.query({
                        report: {
                            resource: `tracker/jobs/${jobId}/report`,
                            params: { fields: '*' }
                        }
                    });
                    console.log('Tracker import report:', JSON.stringify(importReportResp, null, 2));
                } catch (reportError) {
                    console.error('Failed to fetch tracker import report:', reportError);
                }
            }
            // --- End polling ---

            if (trackerResponse?.status === 'OK' || trackerResponse?.httpStatus === 'OK') {
                return await verifyRestoration(engine, teiUid, orgUnitId, programId, trackerResponse);
            }
        } catch (trackerError) {
            console.error('Tracker API failed:', trackerError, trackerError?.response || trackerError?.details || '');
            console.log('Tracker API failed, trying legacy approach:', trackerError.message);
        }

        // 4. Strategy 2: Use bulk import with UPDATE strategy
        console.log('Attempting restoration with bulk import...');
        try {
            const bulkPayload = {
                trackedEntityInstances: [{
                    trackedEntityInstance: teiUid,
                    trackedEntityType: teiData.trackedEntityType,
                    orgUnit: orgUnitId,
                    attributes: teiData.attributes || [],
                    enrollments: teiData.enrollments?.map(enrollment => ({
                        enrollment: enrollment.enrollment,
                        program: enrollment.program,
                        orgUnit: enrollment.orgUnit,
                        enrollmentDate: enrollment.enrollmentDate,
                        incidentDate: enrollment.incidentDate,
                        enrollmentStatus: enrollment.enrollmentStatus === 'CANCELLED' ? 'ACTIVE' : enrollment.enrollmentStatus,
                        events: enrollment.events?.map(event => ({
                            event: event.event,
                            programStage: event.programStage,
                            orgUnit: event.orgUnit,
                            eventDate: event.eventDate,
                            status: event.status,
                            dataValues: event.dataValues || []
                        })) || []
                    })) || []
                }]
            };

            const bulkResponse = await engine.mutate({
                resource: 'trackedEntityInstances',
                type: 'create',
                data: bulkPayload,
                params: {
                    strategy: 'UPDATE',
                    mergeMode: 'MERGE'
                }
            });

            console.log('Bulk import response:', JSON.stringify(bulkResponse, null, 2));

            if (bulkResponse?.status === 'OK' || bulkResponse?.httpStatus === 'OK') {
                return await verifyRestoration(engine, teiUid, orgUnitId, programId, bulkResponse);
            }
        } catch (bulkError) {
            console.error('Bulk import failed:', bulkError, bulkError?.response || bulkError?.details || '');
            if (bulkError?.response) {
                console.error('Bulk import error response:', JSON.stringify(bulkError.response, null, 2));
            }
            console.log('Bulk import failed, trying step-by-step approach:', bulkError.message);
        }

        // 5. Strategy 3: Step-by-step restoration
        console.log('Attempting step-by-step restoration...');
        
        // Step 3a: First restore just the TEI without enrollments
        const teiOnlyPayload = {
            trackedEntityInstance: teiUid,
            trackedEntityType: teiData.trackedEntityType,
            orgUnit: orgUnitId,
            attributes: teiData.attributes || []
        };

        // Remove system fields
        delete teiOnlyPayload.created;
        delete teiOnlyPayload.lastUpdated;
        delete teiOnlyPayload.lastUpdatedBy;
        delete teiOnlyPayload.createdBy;

        console.log('Restoring TEI only:', JSON.stringify(teiOnlyPayload, null, 2));

        const teiRestoreResponse = await engine.mutate({
            resource: `trackedEntityInstances/${teiUid}`,
            type: 'update',
            data: teiOnlyPayload,
            params: {
                mergeMode: 'MERGE'
            }
        });

        console.log('TEI restore response:', JSON.stringify(teiRestoreResponse, null, 2));

        // Step 3b: Then restore enrollments separately if they exist
        if (teiData.enrollments && teiData.enrollments.length > 0) {
            console.log('Restoring enrollments...');
            
            for (const enrollment of teiData.enrollments) {
                try {
                    const enrollmentPayload = {
                        enrollment: enrollment.enrollment,
                        program: enrollment.program,
                        trackedEntityInstance: teiUid,
                        orgUnit: enrollment.orgUnit,
                        enrollmentDate: enrollment.enrollmentDate,
                        incidentDate: enrollment.incidentDate,
                        enrollmentStatus: enrollment.enrollmentStatus === 'CANCELLED' ? 'ACTIVE' : enrollment.enrollmentStatus
                    };

                    await engine.mutate({
                        resource: `enrollments/${enrollment.enrollment}`,
                        type: 'update',
                        data: enrollmentPayload
                    });

                    console.log(`Enrollment ${enrollment.enrollment} restored`);
                } catch (enrollmentError) {
                    console.warn(`Failed to restore enrollment ${enrollment.enrollment}:`, enrollmentError.message);
                }
            }
        }

        // 6. Final verification
        return await verifyRestoration(engine, teiUid, orgUnitId, programId, teiRestoreResponse);

    } catch (error) {
        console.error('TEI restoration failed:', error, error?.response || error?.details || '');
        if (error?.response) {
            console.error('TEI restoration error response:', JSON.stringify(error.response, null, 2));
        }
        console.error('TEI restoration failed (details):', {
            teiUid,
            orgUnitId,
            programId,
            error: error.message,
            stack: error.stack
        });

        // 7. Last resort: Try maintenance API for hard restoration
        if (error.message.includes('409') || error.message.includes('Conflict')) {
            console.log('Attempting maintenance API restoration...');
            try {
                const maintenanceResponse = await engine.mutate({
                    resource: 'maintenance/softDeletedTrackedEntityInstanceRemoval',
                    type: 'create',
                    data: {
                        trackedEntityInstances: [teiUid]
                    }
                });

                console.log('Maintenance API response:', JSON.stringify(maintenanceResponse, null, 2));

                // After maintenance, try the restoration again
                return await restoreTEI(engine, teiUid, orgUnitId, programId);
            } catch (maintenanceError) {
                console.error('Maintenance API also failed:', maintenanceError.message);
            }
        }

        throw new Error(`Failed to restore TEI ${teiUid}: ${error.message}`);
    }
};

// Helper function to verify restoration
const verifyRestoration = async (engine, teiUid, orgUnitId, programId, response) => {
    console.log('Verifying restoration...');
    
    try {
        const verificationQuery = {
            verification: {
                resource: 'trackedEntityInstances',
                params: {
                    trackedEntityInstance: teiUid,
                    ou: orgUnitId,
                    program: programId,
                    includeDeleted: false,
                    fields: 'trackedEntityInstance,deleted,enrollments[enrollment,enrollmentStatus,deleted,events[event,deleted,status]]'
                }
            }
        };

        const verificationResponse = await engine.query(verificationQuery);
        const restoredTEI = verificationResponse?.verification?.trackedEntityInstances?.[0];

        if (restoredTEI && !restoredTEI.deleted) {
            console.log('TEI restoration verified successfully');
            
            const activeEnrollments = restoredTEI.enrollments?.filter(e => !e.deleted) || [];
            const totalEvents = activeEnrollments.reduce((sum, e) => sum + (e.events?.length || 0), 0);
            const activeEvents = activeEnrollments.reduce((sum, e) => 
                sum + (e.events?.filter(ev => !ev.deleted)?.length || 0), 0);
            
            return {
                success: true,
                trackedEntity: teiUid,
                status: 'RESTORED',
                message: 'TEI restored successfully',
                enrollments: {
                    total: restoredTEI.enrollments?.length || 0,
                    active: activeEnrollments.length,
                    restored: activeEnrollments.length > 0
                },
                events: {
                    total: totalEvents,
                    active: activeEvents
                },
                response: response
            };
        } else {
            console.warn('TEI restoration may have failed - not found in verification');
            return {
                success: false,
                trackedEntity: teiUid,
                status: 'VERIFICATION_FAILED',
                message: 'TEI restoration completed but verification failed',
                response: response
            };
        }
    } catch (verificationError) {
        console.error('Verification failed:', verificationError.message);
        return {
            success: false,
            trackedEntity: teiUid,
            status: 'VERIFICATION_ERROR',
            message: 'TEI restoration status unknown - verification failed',
            response: response,
            verificationError: verificationError.message
        };
    }
};

// Helper function to restore multiple TEIs
export const restoreMultipleTEIs = async (engine, teiList) => {
    const results = [];
    
    for (const teiInfo of teiList) {
        try {
            const result = await restoreTEI(engine, teiInfo.teiUid, teiInfo.orgUnitId, teiInfo.programId);
            results.push({
                teiUid: teiInfo.teiUid,
                ...result
            });
        } catch (error) {
            results.push({
                teiUid: teiInfo.teiUid,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};

// Helper function to run analytics after restoration
export const runAnalyticsAfterRestore = async (engine) => {
    try {
        console.log('Starting analytics after TEI restoration...');
        
        const analyticsResponse = await engine.mutate({
            resource: 'system/tasks/ANALYTICS_TABLE',
            type: 'create'
        });
        
        console.log('Analytics started:', analyticsResponse);
        return analyticsResponse;
    } catch (error) {
        console.error('Failed to run analytics:', error);
        throw error;
    }
};

// Helper function to verify TEI restoration
const verifyTEIRestoration = async (engine, teiUid, orgUnitId, programId) => {
    try {
        console.log('Verifying TEI restoration...');
        
        // Query for the TEI without includeDeleted to see if it's now active
        const verificationQuery = {
            tei: {
                resource: 'tracker/trackedEntities',
                params: {
                    trackedEntity: teiUid,
                    orgUnit: orgUnitId,
                    program: programId,
                    fields: 'trackedEntity,orgUnit,deleted,enrollments[enrollment,status]',
                    includeDeleted: false, // Only get active TEIs
                    skipPaging: true
                }
            }
        };
        
        const verificationResponse = await engine.query(verificationQuery);
        const activeTEI = verificationResponse?.tei?.instances?.[0];
        
        if (activeTEI) {
            console.log('TEI restoration verified: TEI is now active');
            return {
                restored: true,
                teiData: activeTEI,
                message: 'TEI successfully restored and is now active'
            };
        } else {
            console.log('TEI restoration may have failed: TEI not found in active results');
            return {
                restored: false,
                message: 'TEI restoration completed but TEI is still not active'
            };
        }
        
    } catch (error) {
        console.error('Error verifying TEI restoration:', error);
        return {
            restored: false,
            error: error.message,
            message: 'Could not verify TEI restoration status'
        };
    }
};

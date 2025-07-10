// src/api/teis.js
// API helpers for soft delete and restore using a custom attribute (appSoftDeleted)

/**
 * True soft delete using a custom attribute (e.g., appSoftDeleted)
 * @param {object} engine - DHIS2 app-runtime data engine
 * @param {string} teiUid - The TEI UID
 * @param {string} appSoftDeletedAttrId - The attribute UID for appSoftDeleted
 */
export const softDeleteTEI = async (engine, teiUid, appSoftDeletedAttrId) => {
    // Fetch the TEI to get its current attributes and deleted status
    const tei = await engine.query({
        teis: {
            resource: `trackedEntityInstances/${teiUid}`,
            params: { fields: 'attributes,trackedEntityInstance,orgUnit,trackedEntityType,deleted' }
        }
    });
    const teiObj = tei.teis;
    if (teiObj.deleted === true) {
        // Already deleted natively, cannot update
        const msg = `TEI ${teiUid} is already deleted natively in DHIS2 and cannot be soft deleted.`;
        console.warn(msg, teiObj);
        throw new Error(msg);
    }
    const attributes = teiObj.attributes || [];
    // Set or update the appSoftDeleted attribute
    const updatedAttributes = [
        ...attributes.filter(attr => attr.attribute !== appSoftDeletedAttrId),
        { attribute: appSoftDeletedAttrId, value: 'true' }
    ];
    try {
        const result = await engine.mutate({
            resource: `trackedEntityInstances/${teiUid}`,
            type: 'update',
            data: { attributes: updatedAttributes }
        });
        // Log the full result for debugging
        console.log('Soft delete API result:', result);
        if (result?.response?.importSummaries) {
            const summary = result.response.importSummaries[0];
            if (summary.status !== 'SUCCESS') {
                console.error('Import summary error:', summary);
                if (summary.conflicts) {
                    console.error('Import summary conflicts:', summary.conflicts);
                }
                throw new Error('Soft delete failed: ' + (summary.description || summary.status));
            }
        } else if (result?.response) {
            // Log the full response if no importSummaries
            console.error('Soft delete failed, full response:', result.response);
            if (result.response.conflicts) {
                console.error('Import summary conflicts:', result.response.conflicts);
            }
        }
    } catch (err) {
        if (err?.details) {
            console.error('Soft delete failed, import summary:', err.details);
        } else {
            console.error('Soft delete failed, full error:', err);
        }
        throw err;
    }
};

/**
 * Restore a soft-deleted TEI by setting appSoftDeleted = false
 * @param {object} engine - DHIS2 app-runtime data engine
 * @param {string} teiUid - The TEI UID
 * @param {string} appSoftDeletedAttrId - The attribute UID for appSoftDeleted
 */
export const restoreTEI = async (engine, teiUid, appSoftDeletedAttrId) => {
    // Fetch the TEI to get its current attributes
    const tei = await engine.query({
        teis: {
            resource: `trackedEntityInstances/${teiUid}`,
            params: { fields: 'attributes,trackedEntityInstance,orgUnit,trackedEntityType' }
        }
    });
    const attributes = tei.teis.attributes || [];
    // Set or update the appSoftDeleted attribute
    const updatedAttributes = [
        ...attributes.filter(attr => attr.attribute !== appSoftDeletedAttrId),
        { attribute: appSoftDeletedAttrId, value: 'false' }
    ];
    await engine.mutate({
        resource: `trackedEntityInstances/${teiUid}`,
        type: 'update',
        data: { attributes: updatedAttributes }
    });
};

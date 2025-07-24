// Fetch deleted TEIs from DataStore
export async function getDataStoreDeletedTeis(engine) {
    try {
        const { deletedTeis = [] } = await engine.query({
            deletedTeis: { resource: 'dataStore/migration_history/deleted_teis' }
        });
        return deletedTeis;
    } catch (e) {
        return [];
    }
}
// Plain JS utility for managing deleted TEIs in DHIS2 datastore
export async function trackDeletedTei(engine, tei) {
    let current = [];
    try {
        const { deletedTeis = [] } = await engine.query({
            deletedTeis: { resource: 'dataStore/migration_history/deleted_teis' }
        });
        current = deletedTeis;
    } catch (e) {
        current = [];
    }
    // Remove any existing TEI with the same id
    const filtered = current.filter(t => t.id !== tei.id);
    // Build full TEI object with orgUnit, timestamp, user
    const fullTei = {
        ...tei,
        orgUnit: tei.orgUnit || tei.orgUnitName || '',
        timestamp: tei.lastUpdated || tei.created || new Date().toISOString(),
        user: tei.createdBy || tei.storedBy || (tei.lastUpdatedBy && tei.lastUpdatedBy.username) || tei.user || (tei.lastUpdatedByUserInfo && tei.lastUpdatedByUserInfo.username) || '',
    };
    const updated = [...filtered, fullTei];
    await engine.mutate({
        resource: 'dataStore/migration_history/deleted_teis',
        type: 'update', // Always use PUT for create/update
        data: updated,
    });
}

export async function untrackDeletedTei(engine, teiId) {
    let current = []
    try {
        const { deletedTeis = [] } = await engine.query({
            deletedTeis: { resource: 'dataStore/migration_history/deleted_teis' }
        })
        current = deletedTeis
    } catch (e) {
        current = []
    }
    const updated = current.filter(tei => tei.id !== teiId)
    await engine.mutate({
        resource: 'dataStore/migration_history/deleted_teis',
        type: 'update', // Always use PUT for create/update
        data: updated,
    })
}

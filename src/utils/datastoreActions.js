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
// Store a batch of deleted TEIs in DataStore (overwrites previous batch)
export async function trackDeletedTeiBatch(engine, teis) {
    let current = [];
    try {
        const { deletedTeis = [] } = await engine.query({
            deletedTeis: { resource: 'dataStore/migration_history/deleted_teis' }
        });
        current = deletedTeis;
    } catch (e) {
        current = [];
    }
    // Remove any existing TEIs with the same ids
    const deletedIds = teis.map(t => t.trackedEntityInstance || t.id);
    const filtered = current.filter(t => !deletedIds.includes(t.trackedEntityInstance || t.id));
    // Build full TEI objects with orgUnit, timestamp, user
    const fullTeis = teis.map(tei => ({
        ...tei,
        orgUnit: tei.orgUnit || tei.orgUnitName || '',
        timestamp: tei.lastUpdated || tei.created || new Date().toISOString(),
        user: tei.createdBy || tei.storedBy || (tei.lastUpdatedBy && tei.lastUpdatedBy.username) || tei.user || (tei.lastUpdatedByUserInfo && tei.lastUpdatedByUserInfo.username) || '',
    }));
    const updated = [...filtered, ...fullTeis];
    await engine.mutate({
        resource: 'dataStore/migration_history/deleted_teis',
        type: 'update', 
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
        type: 'update',
        data: updated,
    })
}

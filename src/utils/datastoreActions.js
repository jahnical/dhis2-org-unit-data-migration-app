// Plain JS utility for managing deleted TEIs in DHIS2 datastore
export async function trackDeletedTei(engine, tei) {
    let current = []
    try {
        const { deletedTeis = [] } = await engine.query({
            deletedTeis: { resource: 'dataStore/migration_history/deleted_teis' }
        })
        current = deletedTeis
    } catch (e) {
        current = []
    }
    const updated = [...current, tei]
    await engine.mutate({
        resource: 'dataStore/migration_history/deleted_teis',
        type: 'update', // Always use PUT for create/update
        data: updated,
    })
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

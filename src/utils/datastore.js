import { useDataEngine } from '@dhis2/app-runtime'

export function useDatastore() {
    const engine = useDataEngine()

    const getDeletedTeis = async () => {
        try {
            const { deletedTeis = [] } = await engine.query({
                deletedTeis: { resource: 'dataStore/deleted_teis' }
            })
            return deletedTeis
        } catch (e) {
            // If key doesn't exist, return empty array
            return []
        }
    }

    const addDeletedTei = async (tei) => {
        const current = await getDeletedTeis()
        const updated = [...current, tei]
        await engine.mutate({
            resource: 'dataStore/deleted_teis',
            type: 'update',
            data: updated,
        })
    }

    const removeDeletedTei = async (teiId) => {
        const current = await getDeletedTeis()
        const updated = current.filter(tei => tei.id !== teiId)
        await engine.mutate({
            resource: 'dataStore/deleted_teis',
            type: 'update',
            data: updated,
        })
    }

    return { getDeletedTeis, addDeletedTei, removeDeletedTei }
}

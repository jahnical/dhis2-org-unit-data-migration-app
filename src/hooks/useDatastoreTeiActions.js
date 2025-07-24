import { useDatastore } from '../utils/datastore'

export function useDatastoreTeiActions() {
    const { addDeletedTei, removeDeletedTei } = useDatastore()

    // Call this after successful DHIS2 delete
    const trackDeletedTei = async (tei) => {
        await addDeletedTei(tei)
    }

    // Call this after successful restore/clone
    const untrackDeletedTei = async (teiId) => {
        await removeDeletedTei(teiId)
    }

    return { trackDeletedTei, untrackDeletedTei }
}

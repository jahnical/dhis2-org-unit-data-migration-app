import { useEffect, useState } from 'react'
import { getDataStoreDeletedTeis } from '../utils/datastoreActions'
import { useDataEngine } from '@dhis2/app-runtime'

export function useDeletedTeisHistory() {
    const engine = useDataEngine()
    const [deletedTeis, setDeletedTeis] = useState([])

    useEffect(() => {
        getDataStoreDeletedTeis(engine).then(setDeletedTeis)
    }, [engine])

    return deletedTeis
}

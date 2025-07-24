import { useEffect, useState } from 'react'
import { useDatastore } from '../utils/datastore'

export function useDeletedTeisHistory() {
    const { getDeletedTeis } = useDatastore()
    const [deletedTeis, setDeletedTeis] = useState([])

    useEffect(() => {
        getDeletedTeis().then(setDeletedTeis)
    }, [])

    return deletedTeis
}

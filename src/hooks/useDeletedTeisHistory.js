import { useEffect, useState } from 'react'
import { getDataStoreDeletedTeis } from '../utils/datastoreActions'
import { useDataEngine } from '@dhis2/app-runtime'

export function useDeletedTeisHistory() {
    const engine = useDataEngine()
    const [deletedTeis, setDeletedTeis] = useState([])

    useEffect(() => {
        let isMounted = true;
        getDataStoreDeletedTeis(engine).then(data => {
            if (isMounted) setDeletedTeis(data);
        });
        return () => { isMounted = false; };
    }, [engine])

    return deletedTeis
}

import { VALUE_TYPE_DATE, VALUE_TYPE_DATETIME } from '@dhis2/analytics'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    DataTable,
    TableBody,
    DataTableCell,
    TableHead,
    DataTableRow,
    DataTableColumnHeader,
    CircularLoader,
    NoticeBox,
    Checkbox,
} from '@dhis2/ui'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { dataActionCreators } from '../../actions/data_controls.js'
import { filterTeis } from '../../modules/data_control.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import { sGetUiProgramId } from '../../reducers/ui.js'
import classes from './styles/Common.module.css'

const TEIs = () => {
    const loading = useSelector(dataControlSelectors.getDataControlIsLoading)
    const error = useSelector(dataControlSelectors.getDataControlError)
    const dispatch = useDispatch()
    const uiProgramId = useSelector(sGetUiProgramId)
    const programId = useSelector(dataControlSelectors.getDataControlProgram)
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit)
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs)
    const rawTeis = useSelector(dataControlSelectors.getDataControlRawTEIs)
    const filters = useSelector(dataControlSelectors.getDataControlFilters)
    const attributesToDisplay = useSelector(dataControlSelectors.getDataControlAttributesToDisplay)
    const engine = useDataEngine()

    const [displayTeis, setDisplayTeis] = useState([])
    const [initialFilteredTeis, setInitialFilteredTeis] = useState([])
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('default')

    useEffect(() => {
        dispatch(dataActionCreators.setProgram(uiProgramId))
    }, [uiProgramId, dispatch])

    useEffect(() => {
        setDisplayTeis([])
        setInitialFilteredTeis([])
        dispatch(dataActionCreators.setSelectedTEIs([]))
        setSortKey('')
        setSortDirection('default')

        if (programId && orgUnitId) {
            dispatch(
                dataActionCreators.fetchTEIs(orgUnitId, programId, engine)
            )
        }
    }, [programId, orgUnitId, dispatch, engine])

    useEffect(() => {
        const newlyFilteredTeis = filterTeis(rawTeis, filters)
        setInitialFilteredTeis(newlyFilteredTeis)
        setDisplayTeis(newlyFilteredTeis)
        setSortKey('')
        setSortDirection('default')
        dispatch(dataActionCreators.setSelectedTEIs([]))
    }, [filters, rawTeis, dispatch])

    const getColumnValue = (tei, columnName) => {
        switch (columnName) {
            case 'id':
                return tei.id
            case 'created':
                return tei.created
            case 'lastUpdated':
                return tei.lastUpdated
            case 'storedBy':
                return tei.storedBy
            case 'lastUpdatedBy':
                return tei.lastUpdatedBy?.username
            default: {
                const attribute = tei.attributes?.find(a => a.displayName === columnName || a.name === columnName)
                return attribute ? attribute.value : ''
            }
        }
    }

    const handleSort = (columnName) => {
        let newSortDirection

        if (sortKey === columnName) {
            if (sortDirection === 'asc') {
                newSortDirection = 'desc'
            } else if (sortDirection === 'desc') {
                newSortDirection = 'default'
            } else {
                newSortDirection = 'asc'
            }
        } else {
            newSortDirection = 'asc'
        }

        setSortKey(columnName)
        setSortDirection(newSortDirection)

        const dataToProcess = initialFilteredTeis

        if (newSortDirection === 'default') {
            setDisplayTeis([...dataToProcess])
        } else {
            const sortedData = [...dataToProcess].sort((a, b) => {
                const aValue = getColumnValue(a, columnName)
                const bValue = getColumnValue(b, columnName)

                if (aValue === undefined || aValue === null) {return newSortDirection === 'asc' ? 1 : -1}
                if (bValue === undefined || bValue === null) {return newSortDirection === 'asc' ? -1 : 1}

                const isDateColumn = ['created', 'lastUpdated'].includes(columnName) ||
                                     (a.attributes?.find(attr => attr.displayName === columnName || attr.name === columnName)?.valueType === VALUE_TYPE_DATE ||
                                      a.attributes?.find(attr => attr.displayName === columnName || attr.name === columnName)?.valueType === VALUE_TYPE_DATETIME)

                if (isDateColumn) {
                    const dateA = new Date(aValue)
                    const dateB = new Date(bValue)
                    const comparison = dateA.getTime() - dateB.getTime()
                    return newSortDirection === 'asc' ? comparison : -comparison
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    const comparison = aValue - bValue
                    return newSortDirection === 'asc' ? comparison : -comparison
                }

                const comparison = String(aValue).localeCompare(String(bValue))
                return newSortDirection === 'asc' ? comparison : -comparison
            })
            setDisplayTeis(sortedData)
        }
    }

    const handleSelectAll = (checked) => {
        if (checked) {
            const selectedIds = displayTeis.map(tei => tei.id)
            const selectedTeiObjs = displayTeis.map(tei => ({ id: tei.id, ...tei }))
            console.log('[History][TEIs Selected][All]', selectedTeiObjs)
            dispatch(dataActionCreators.setSelectedTEIs(selectedIds))
        } else {
            console.log('[History][TEIs Deselected][All]')
            dispatch(dataActionCreators.setSelectedTEIs([]))
        }
    }

    const handleSelectTei = (teiId) => {
        const isSelected = selectedTeis.includes(teiId)
        const teiObj = displayTeis.find(tei => tei.id === teiId)
        if (isSelected) {
            console.log('[History][TEI Deselected]', teiObj)
            dispatch(dataActionCreators.setSelectedTEIs(selectedTeis.filter(id => id !== teiId)))
        } else {
            console.log('[History][TEI Selected]', teiObj)
            dispatch(dataActionCreators.setSelectedTEIs([...selectedTeis, teiId]))
        }
    }

    if (loading) {
        return <CircularLoader />
    }

    return (
        <div style={{ height: '100%' }}>
            {error ? (
                <NoticeBox error title={i18n.t('Could not load TEIs')}>
                    {error?.message ||
                        i18n.t(
                            "The TEIs couldn't be retrieved. Try again or contact your system administrator."
                        )}
                </NoticeBox>
            ) : (
                <div className={classes.tableWrapper}>
                    <div style={{ color: 'grey', marginBottom: '8px' }}>
                        <h4 style={{ marginLeft: '16px' }}>
                            {i18n.t(
                                `${selectedTeis.length} Selected of ${displayTeis.length} Tracked Entity Instances`
                            )}
                        </h4>
                    </div>

                    <DataTable>
                        <TableHead>
                            <DataTableRow>
                                <DataTableColumnHeader
                                    name="checkbox"
                                    className={classes.checkbox}
                                    key="checkbox-header"
                                >
                                    <Checkbox
                                        checked={selectedTeis.length === displayTeis.length && displayTeis.length > 0}
                                        indeterminate={selectedTeis.length > 0 && selectedTeis.length < displayTeis.length}
                                        onChange={({ checked }) => handleSelectAll(checked)}
                                    />
                                </DataTableColumnHeader>
                                <DataTableColumnHeader
                                    name="id"
                                    onSortIconClick={() => handleSort('id')}
                                    sortDirection={sortKey === 'id' ? sortDirection : 'default'}
                                    sortIconTitle={i18n.t('Sort by Instance ID')}
                                    className={classes.columnInstanceId}
                                >
                                    {i18n.t('Instance ID')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader
                                    name="created"
                                    onSortIconClick={() => handleSort('created')}
                                    sortDirection={sortKey === 'created' ? sortDirection : 'default'}
                                    sortIconTitle={i18n.t('Sort by Created At')}
                                    className={classes.column}
                                >
                                    {i18n.t('Created At')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader
                                    name="lastUpdated"
                                    onSortIconClick={() => handleSort('lastUpdated')}
                                    sortDirection={sortKey === 'lastUpdated' ? sortDirection : 'default'}
                                    sortIconTitle={i18n.t('Sort by Last Updated At')}
                                    className={classes.column}
                                >
                                    {i18n.t('Last Updated At')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader
                                    name="storedBy"
                                    onSortIconClick={() => handleSort('storedBy')}
                                    sortDirection={sortKey === 'storedBy' ? sortDirection : 'default'}
                                    sortIconTitle={i18n.t('Sort by Stored By')}
                                    className={classes.column}
                                >
                                    {i18n.t('Stored By')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader
                                    name="lastUpdatedBy"
                                    onSortIconClick={() => handleSort('lastUpdatedBy')}
                                    sortDirection={sortKey === 'lastUpdatedBy' ? sortDirection : 'default'}
                                    sortIconTitle={i18n.t('Sort by Last Updated By')}
                                    className={classes.column}
                                >
                                    {i18n.t('Last Updated By')}
                                </DataTableColumnHeader>
                                {attributesToDisplay.map((attrName) => (
                                    <DataTableColumnHeader
                                        key={attrName}
                                        name={attrName}
                                        onSortIconClick={() => handleSort(attrName)}
                                        sortDirection={sortKey === attrName ? sortDirection : 'default'}
                                        sortIconTitle={i18n.t(`Sort by ${attrName}`)}
                                        className={classes.column}
                                    >
                                        {attrName}
                                    </DataTableColumnHeader>
                                ))}
                            </DataTableRow>
                        </TableHead>
                        <TableBody>
                            {displayTeis.map((instance) => (
                                <DataTableRow key={instance.id}>
                                    <DataTableCell className={classes.checkbox}>
                                        <Checkbox
                                            checked={selectedTeis.includes(instance.id)}
                                            onChange={() => handleSelectTei(instance.id)}
                                        />
                                    </DataTableCell>
                                    <DataTableCell className={classes.columnInstanceId}>
                                        {instance.id}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {new Date(
                                            instance.created
                                        ).toLocaleString()}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {new Date(
                                            instance.lastUpdated
                                        ).toLocaleString()}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {instance.storedBy || ''}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {instance.lastUpdatedBy?.username || ''}
                                    </DataTableCell>
                                    {attributesToDisplay.map((attrName) => {
                                        const attribute = instance.attributes?.find(
                                            (a) => a.displayName === attrName || a.name === attrName
                                        ) || { value: '', valueType: '' }
                                        return (
                                            <DataTableCell
                                                key={attrName}
                                                className={classes.column}
                                            >
                                                {attribute.valueType === VALUE_TYPE_DATE ||
                                                attribute.valueType === VALUE_TYPE_DATETIME
                                                    ? new Date(attribute.value).toLocaleString()
                                                    : attribute.value}
                                            </DataTableCell>
                                        )
                                    })}
                                </DataTableRow>
                            ))}
                        </TableBody>
                    </DataTable>
                </div>
            )}
        </div>
    )
}

export default TEIs

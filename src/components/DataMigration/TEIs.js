import { VALUE_TYPE_DATE, VALUE_TYPE_DATETIME } from '@dhis2/analytics'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    DataTable,
    TableBody,
    DataTableCell,
    DataTableHead,
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
import { isAppSoftDeleted } from '../../constants/appSoftDeletedAttrId.js'

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

    const [teis, setTeis] = useState([])
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('default')

    useEffect(() => {
        dispatch(dataActionCreators.setProgram(uiProgramId))
    }, [uiProgramId, dispatch])

    useEffect(() => {
        dispatch(dataActionCreators.setSelectedTEIs([]))
        setTeis([])
        setSortKey('')
        setSortDirection('default')

        if (programId && orgUnitId) {
            dispatch(dataActionCreators.fetchTEIs(orgUnitId, programId, engine))
        }
    }, [programId, orgUnitId, dispatch, engine])

    useEffect(() => {
        const filteredAndMappedTeis = filterTeis(
            rawTeis.filter(
                tei =>
                    !isAppSoftDeleted(tei) &&
                    tei.deleted !== true &&
                    (tei.orgUnit === orgUnitId || tei.ou === orgUnitId)
            ),
            filters
        ).map(tei => ({
            ...tei,
            id: tei.trackedEntityInstance || tei.id,
            trackedEntityInstance: tei.trackedEntityInstance || tei.id,
            storedBy: tei.storedBy || tei.createdByUserInfo?.username || '',
            createdBy: tei.createdByUserInfo || {},
            lastUpdatedBy: tei.lastUpdatedByUserInfo || {},
            owner: tei.owner || tei.programOwners?.[0]?.ownerOrgUnit || '',
        }))

        setTeis(filteredAndMappedTeis)
        dispatch(dataActionCreators.setSelectedTEIs([]))
    }, [rawTeis, orgUnitId, filters, dispatch])
    
    const handleSelectAll = (checked) => {
        if (checked) {
            dispatch(dataActionCreators.setSelectedTEIs(teis.map(tei => tei.id)))
        } else {
            dispatch(dataActionCreators.setSelectedTEIs([]))
        }
    }

    const handleSelectTei = (teiId) => {
        const isSelected = selectedTeis.includes(teiId)
        if (isSelected) {
            dispatch(dataActionCreators.setSelectedTEIs(selectedTeis.filter(id => id !== teiId)))
        } else {
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
                    {error?.message || i18n.t("The TEIs couldn't be retrieved. Try again or contact your system administrator.")}
                </NoticeBox>
            ) : (
                <div className={classes.tableWrapper}>
                    <div className={classes.headerTable}>
                        <div style={{ color: 'grey' }}>
                            <h4 style={{ marginLeft: '16px' }}>
                                {i18n.t(`${selectedTeis.length} Selected of ${teis.length} Tracked Entity Instances`)}
                            </h4>
                        </div>
                    </div>

                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader className={classes.checkbox}>
                                    <Checkbox
                                        checked={selectedTeis.length === teis.length && teis.length > 0}
                                        indeterminate={selectedTeis.length > 0 && selectedTeis.length < teis.length}
                                        onChange={({ checked }) => handleSelectAll(checked)}
                                    />
                                </DataTableColumnHeader>
                                <DataTableColumnHeader className={classes.columnInstanceId}>
                                    {i18n.t('Instance ID')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader className={classes.column}>
                                    {i18n.t('Created At')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader className={classes.column}>
                                    {i18n.t('Last Updated At')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader className={classes.column}>
                                    {i18n.t('Stored By')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader className={classes.column}>
                                    {i18n.t('Last Updated By')}
                                </DataTableColumnHeader>
                                {attributesToDisplay.map(attr => (
                                    <DataTableColumnHeader key={attr} className={classes.column}>
                                        {attr}
                                    </DataTableColumnHeader>
                                ))}
                            </DataTableRow>
                        </DataTableHead>
                        <TableBody>
                            {teis.map((instance) => (
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
                                        {new Date(instance.created).toLocaleString()}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {new Date(instance.lastUpdated).toLocaleString()}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {instance.storedBy}
                                    </DataTableCell>
                                    <DataTableCell className={classes.column}>
                                        {instance.lastUpdatedBy?.username || ''}
                                    </DataTableCell>
                                    {attributesToDisplay.map(attr => {
                                        const attribute = instance.attributes?.find(a => a.name === attr) || { value: '', valueType: '' }
                                        return (
                                            <DataTableCell key={attr} className={classes.column}>
                                                {(attribute.valueType === VALUE_TYPE_DATE || attribute.valueType === VALUE_TYPE_DATETIME)
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

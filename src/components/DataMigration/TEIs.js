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
import TeiFilterableFields from './TeiFilterableFields.js'
import { APP_SOFT_DELETED_ATTR_ID, isAppSoftDeleted } from '../../constants/appSoftDeletedAttrId.js'

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
        setTeis(
            filterTeis(
                allTeis.filter(
                    tei =>
                        !isAppSoftDeleted(tei) &&
                        tei.deleted !== true && // Exclude DHIS2-deleted TEIs
                        (tei.orgUnit === orgUnitId || tei.ou === orgUnitId)
                ),
                filters
            ).map(tei => ({
                ...tei,
                id: tei.trackedEntityInstance || tei.id, // Always set both
                trackedEntityInstance: tei.trackedEntityInstance || tei.id, // Always set both
                storedBy: tei.storedBy || tei.createdByUserInfo?.username || '',
                createdBy: tei.createdByUserInfo || {},
                lastUpdatedBy: tei.lastUpdatedByUserInfo || {},
                owner: tei.owner || tei.programOwners?.[0]?.ownerOrgUnit || '',
            }))
        )
        dispatch(dataActionCreators.setSelectedTEIs([])) // Reset selections when filters change
    }, [allTeis, orgUnitId, filters, dispatch])

    // Use filtered TEIs from selector/utility, do not filter in component
    const filteredTeis = teis

    const handleSelectAll = (checked) => {
        if (checked) {
            dispatch(dataActionCreators.setSelectedTEIs(teis.map(tei => tei.trackedEntityInstance || tei.id)))
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
                    {error?.message ||
                        i18n.t(
                            "The TEIs couldn't be retrieved. Try again or contact your system administrator."
                        )}
                </NoticeBox>
            ) : (
                <div className={classes.tableWrapper}>
                    <Table>
                        <div className={classes.headerTable}>
                            <div style={{ color: 'grey' }}>
                                <h4 style={{ marginLeft: '16px' }}>
                                    {i18n.t(
                                        `${selectedTeis.length} Selected of ${filteredTeis.length} Tracked Entity Instances`
                                    )}
                                </h4>
                            </div>
                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead className={classes.checkbox}>
                                        <Checkbox
                                            checked={selectedTeis.includes(instance.id)}
                                            onChange={() => handleSelectTei(instance.id)}
                                        />
                                    </TableCellHead>
                                    <TableCellHead className={classes.columnInstanceId}>
                                        {i18n.t('Instance ID')}
                                    </TableCellHead>
                                    <TableCellHead className={classes.column}>
                                        {i18n.t('Created At')}
                                    </TableCellHead>
                                    <TableCellHead className={classes.column}>
                                        {i18n.t('Last Updated At')}
                                    </TableCellHead>
                                    <TableCellHead className={classes.column}>
                                        {i18n.t('Stored By')}
                                    </TableCellHead>
                                    <TableCellHead className={classes.column}>
                                        {i18n.t('Last Updated By')}
                                    </TableCellHead>
                                    {attributesToDisplay.map((attr) => (
                                        <TableCellHead
                                            key={attr}
                                            className={classes.column}
                                        >
                                            {attr}
                                        </TableCellHead>
                                    ))}
                                </TableRowHead>
                            </TableHead>
                        </div>
                        <div className={classes.bodyTable}>
                            <TableBody>
                                {filteredTeis.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell className={classes.checkbox}>
                                            <Checkbox
                                                checked={selectedTeis.includes(instance.trackedEntityInstance || instance.id)}
                                                onChange={() => handleSelectTei(instance.trackedEntityInstance || instance.id)}
                                            />
                                        </TableCell>
                                        <TableCell className={classes.columnInstanceId}>
                                            {instance.trackedEntityInstance || instance.id}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(
                                                instance.created
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {new Date(
                                                instance.lastUpdated
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.storedBy || ''}
                                        </TableCell>
                                        <TableCell className={classes.column}>
                                            {instance.lastUpdatedBy?.username || ''}
                                        </TableCell>
                                        {attributesToDisplay.map((attr) => {
                                            const attribute = instance.attributes?.find(
                                                (a) => a.name === attr
                                            ) || { value: '', valueType: '' }
                                            return (
                                                <TableCell
                                                    key={attr}
                                                    className={classes.column}
                                                >
                                                    {attribute.valueType === VALUE_TYPE_DATE ||
                                                    attribute.valueType === VALUE_TYPE_DATETIME
                                                        ? new Date(attribute.value).toLocaleString()
                                                        : attribute.value}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </div>
                    </Table>
                </div>
            )}
        </div>
    )
}

export default TEIs
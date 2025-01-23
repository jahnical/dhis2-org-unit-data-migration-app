import { VALUE_TYPE_DATE, VALUE_TYPE_DATETIME } from '@dhis2/analytics'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableCellHead,
    CircularLoader,
    NoticeBox,
    TableRowHead,
} from '@dhis2/ui'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    migrationActionCreators,
    migrationAsyncActions,
} from '../../actions/migration.js'
import { migrationSelectors } from '../../reducers/migration.js'
import { sGetUiProgramId } from '../../reducers/ui.js'
import classes from './styles/Common.module.css'

const TEIs = () => {
    const loading = useSelector(migrationSelectors.getMigrationIsLoading)
    const error = useSelector(migrationSelectors.getMigrationError)
    const dispatch = useDispatch()
    const programId = useSelector(sGetUiProgramId)
    const orgUnitId = useSelector(migrationSelectors.getMigrationOrgUnit)
    const teis = useSelector(migrationSelectors.getMigrationTEIs)
    const filters = useSelector(migrationSelectors.getMigrationFilters)
    const attributesToDisplay = useSelector(
        migrationSelectors.getMigrationAttributesToDisplay
    )
    const engine = useDataEngine()

    useEffect(() => {
        dispatch(migrationActionCreators.setProgram(programId))
        if (programId && orgUnitId) {
            dispatch(
                migrationAsyncActions.fetchTEIs(orgUnitId, programId, engine)
            )
        }
    }, [programId, orgUnitId, dispatch, engine, filters])

    if (loading) {
        return <CircularLoader />
    }

    return (
        <div style={{ height: '100%' }}>
            {loading ? (
                <CircularLoader />
            ) : error ? (
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
                                        `${teis.length} Tracked Entity Instances`
                                    )}
                                </h4>
                            </div>

                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead
                                        className={classes.columnInstanceId}
                                    >
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
                                {teis.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell
                                            className={classes.columnInstanceId}
                                        >
                                            {instance.id}
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
                                            {instance.lastUpdatedBy.username ||
                                                ''}
                                        </TableCell>

                                        {attributesToDisplay.map((attr) => {
                                            const attribute =
                                                instance.attributes.find(
                                                    (a) => a.name === attr
                                                ) || { value: '' }
                                            return (
                                                <TableCell
                                                    key={attribute.attribute}
                                                    className={classes.column}
                                                >
                                                    {attribute.valueType ===
                                                        VALUE_TYPE_DATE ||
                                                    attribute.valueType ===
                                                        VALUE_TYPE_DATETIME
                                                        ? new Date(
                                                              attribute.value
                                                          ).toLocaleString()
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

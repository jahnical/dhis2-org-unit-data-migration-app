import { useCachedDataQuery } from '@dhis2/analytics'
import { OrganisationUnitTree } from '@dhis2/ui'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { dataActionCreators } from '../../actions/data_controls.js'
import { acAddMetadata } from '../../actions/metadata.js'
import { migrationActions } from '../../actions/migration.js'
import { acAddParentGraphMap } from '../../actions/ui.js'
import { removeLastPathSegment } from '../../modules/orgUnit.js'
import { sGetMetadata } from '../../reducers/metadata.js'
import { sGetUiParentGraphMap } from '../../reducers/ui.js'

const OrgUnitSelection = ({
    addMetadata,
    addParentGraphMap,
    isSourceOrgUnit,
}) => {
    const { rootOrgUnits } = useCachedDataQuery()
    const [selected, setSelected] = useState({})
    const dispatch = useDispatch()

    const setValues = (item) => {
        if (item.checked) {
            const forMetadata = {}
            const forParentGraphMap = {}

            forMetadata[item.id] = {
                id: item.id,
                name: item.name || item.displayName,
                displayName: item.displayName,
            }

            if (item.path) {
                const path = removeLastPathSegment(item.path)

                forParentGraphMap[item.id] =
                    path === `/${item.id}` ? '' : path.replace(/^\//, '')
            }

            addMetadata(forMetadata)
            addParentGraphMap(forParentGraphMap)
            setSelected(item)
            if (isSourceOrgUnit) {
                // Log source org unit selection for history/debugging
                console.log('[History][Source OrgUnit Selected]', {
                    id: item.id,
                    name: item.name || item.displayName
                })
                dispatch(dataActionCreators.setSourceOrgUnit(item.id))
            } else {
                dispatch(migrationActions.setTargetOrgUnit(item.id))
            }
        }
    }

    const roots = rootOrgUnits.map((rootOrgUnit) => rootOrgUnit.id)

    return (
        <OrganisationUnitTree
            roots={roots}
            initiallyExpanded={[
                ...(roots.length === 1 ? [`/${roots[0]}`] : []),
                selected?.path?.substring(0, selected.path.lastIndexOf('/')),
            ].filter((path) => path)}
            selected={selected.path && [selected.path]}
            onChange={(item) => setValues(item)}
            dataTest="org-unit-tree"
            singleSelection
        />
    )
}

OrgUnitSelection.propTypes = {
    isSourceOrgUnit: PropTypes.bool.isRequired,
    addMetadata: PropTypes.func,
    addParentGraphMap: PropTypes.func,
}

OrgUnitSelection.defaultProps = {
    rootOrgUnits: [],
}

const mapStateToProps = (state) => ({
    metadata: sGetMetadata(state),
    parentGraphMap: sGetUiParentGraphMap(state),
})

export default connect(mapStateToProps, {
    addMetadata: acAddMetadata,
    addParentGraphMap: acAddParentGraphMap,
})(OrgUnitSelection)

import {useCachedDataQuery} from '@dhis2/analytics'
import {CircularLoader, Input, NoticeBox, OrganisationUnitTree} from '@dhis2/ui'
import PropTypes from 'prop-types'
import React, {useCallback, useEffect, useState} from 'react'
import {useDataEngine} from '@dhis2/app-runtime'
import {connect, useDispatch} from 'react-redux'
import {dataActionCreators} from '../../actions/data_controls.js'
import {acAddMetadata} from '../../actions/metadata.js'
import {migrationActions} from '../../actions/migration.js'
import {acAddParentGraphMap} from '../../actions/ui.js'
import {removeLastPathSegment} from '../../modules/orgUnit.js'
import {sGetMetadata} from '../../reducers/metadata.js'
import {sGetUiParentGraphMap} from '../../reducers/ui.js'

const OrgUnitSelection = ({
                              addMetadata,
                              addParentGraphMap,
                              isSourceOrgUnit,
                          }) => {
    const {rootOrgUnits} = useCachedDataQuery()
    const dataEngine = useDataEngine()
    const [selected, setSelected] = useState({})
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const dispatch = useDispatch()

    // Debounced search function using dataEngine
    const searchOrgUnits = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([])
            setSearchError(null)
            return
        }

        setIsSearching(true)
        setSearchError(null)

        try {
            console.log('Searching for:', query) // Debug log

            const result = await dataEngine.query({
                organisationUnits: {
                    resource: 'organisationUnits',
                    params: {
                        filter: `displayName:ilike:${query}`,
                        fields: 'id,displayName,name,path,level',
                        paging: false,
                        order: 'displayName:asc',
                    },
                },
            })

            console.log('Search result:', result) // Debug log

            const orgUnits = result?.organisationUnits?.organisationUnits || []
            setSearchResults(orgUnits)

            if (orgUnits.length === 0) {
                console.log('No results found for query:', query)
            }

        } catch (error) {
            console.error('Search error details:', error)
            setSearchError(`Search failed: ${error.message || 'Unknown error'}`)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }, [dataEngine])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                ;(async () => {
                    await searchOrgUnits(searchQuery.trim())
                })()
            } else {
                setSearchResults([])
                setSearchError(null)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, searchOrgUnits])


    const setValues = (item) => {
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
            dispatch(dataActionCreators.setSourceOrgUnit(item.id))
        } else {
            dispatch(migrationActions.setTargetOrgUnit(item.id))
        }
    }

    const handleTreeSelection = (item) => {
        if (item.checked) {
            setValues(item)
        }
    }

    const handleSearchSelection = async (orgUnit) => {
        try {
            if (!orgUnit.path) {
                const {organisationUnit} = await dataEngine.query({
                    organisationUnit: {
                        resource: `organisationUnits/${orgUnit.id}`,
                        params: {
                            fields: 'id,displayName,name,path,level'
                        }
                    }
                })
                orgUnit = {...orgUnit, ...organisationUnit}
            }

            setValues({
                ...orgUnit,
                checked: true
            })

            setSearchQuery('')         // Clear the input
            setSearchResults([])       // Hide dropdown
            setSearchError(null)
        } catch (error) {
            console.error('Error fetching org unit path:', error)
            setSearchError('Failed to load full org unit data for selection.')
        }
    }


    const handleSearchChange = ({value}) => {
        setSearchQuery(value)
        // Clear states when input is empty
        if (!value || value.length === 0) {
            setSearchError(null)
            setSearchResults([])
            setIsSearching(false)
        }
    }

    const roots = rootOrgUnits.map((rootOrgUnit) => rootOrgUnit.id)

    return (
        <div>
            {/* Search Section */}
            <div style={{marginBottom: '16px'}}>
                <Input
                    placeholder="Search organization units..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    dataTest="org-unit-search-input"
                />

                {isSearching && (
                    <div style={{textAlign: 'center', margin: '8px 0'}}>
                        <CircularLoader small/>
                        <div style={{fontSize: '0.9em', color: '#666', marginTop: '4px'}}>
                            Searching...
                        </div>
                    </div>
                )}

                {searchError && (
                    <div style={{marginTop: '8px'}}>
                        <NoticeBox error title="Search Error">
                            {searchError}
                        </NoticeBox>
                    </div>
                )}

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div style={{
                        marginTop: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {searchResults.map((orgUnit) => (
                            <div
                                key={orgUnit.id}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    backgroundColor: selected.id === orgUnit.id ? '#e3f2fd' : 'white',
                                    transition: 'background-color 0.2s',
                                }}
                                onClick={() => handleSearchSelection(orgUnit)}
                                dataTest={`search-result-${orgUnit.id}`}
                            >
                                <div style={{fontWeight: 'normal', color: 'inherit'}}>
                                    {orgUnit.displayName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results Message */}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !searchError && (
                    <div style={{marginTop: '8px'}}>
                        <NoticeBox title="No Results">
                            No organization units found matching "{searchQuery}".
                        </NoticeBox>
                    </div>
                )}

                {/* Search Tip */}
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <div style={{marginTop: '8px'}}>
                        <NoticeBox title="Search Tip">
                            Please enter at least 2 characters to search.
                        </NoticeBox>
                    </div>
                )}
            </div>

            <OrganisationUnitTree
                key={selected?.id || 'default-tree'}
                roots={roots}
                selected={selected.path ? [selected.path] : []}
                initiallyExpanded={
                    selected?.path
                        ? selected.path
                            .split('/')
                            .slice(1, -1) // remove the first empty and last segment (selected id)
                            .reduce((acc, _, i, arr) => {
                                acc.push('/' + arr.slice(0, i + 1).join('/'))
                                return acc
                            }, [])
                        : []
                }
                onChange={handleTreeSelection}
                singleSelection
                dataTest="org-unit-tree"
            />

        </div>
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

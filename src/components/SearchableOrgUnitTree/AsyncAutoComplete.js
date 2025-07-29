// AsyncAutoComplete/AsyncAutoComplete.js
import { Input, Menu, MenuItem, Popper, Layer, Card, CircularLoader } from '@dhis2/ui'
import PropTypes from 'prop-types'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import styles from './styles/asyncAutoComplete.module.css'

const MIN_CHAR_LENGTH = 2
const DEBOUNCE_TIME = 375
const PAGE_SIZE = 20

const AsyncAutoComplete = ({ selectHandler, orgUnitType }) => {
    const inputRef = useRef(null)
    const dataEngine = useDataEngine()
    const [searchText, setSearchText] = useState('')
    const [organisationUnits, setOrganisationUnits] = useState([])
    const [fetching, setFetching] = useState(false)
    const [error, setError] = useState(null)

    // Debounced search function
    const searchOrgUnits = useCallback(async (query) => {
        if (!query || query.length < MIN_CHAR_LENGTH) {
            setOrganisationUnits([])
            setError(null)
            return
        }

        setFetching(true)
        setError(null)

        try {
            const result = await dataEngine.query({
                organisationUnits: {
                    resource: 'organisationUnits',
                    params: {
                        filter: `displayName:ilike:${query}`,
                        fields: 'id,displayName,name,path,level',
                        paging: true,
                        pageSize: PAGE_SIZE,
                        order: 'displayName:asc',
                    },
                },
            })

            const orgUnits = result?.organisationUnits?.organisationUnits || []
            setOrganisationUnits(orgUnits)

        } catch (err) {
            console.error('Search error:', err)
            setError('Search failed. Please try again.')
            setOrganisationUnits([])
        } finally {
            setFetching(false)
        }
    }, [dataEngine])

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText.trim()) {
                searchOrgUnits(searchText.trim())
            } else {
                setOrganisationUnits([])
                setError(null)
            }
        }, DEBOUNCE_TIME)

        return () => clearTimeout(timer)
    }, [searchText, searchOrgUnits])

    const selectOrgUnit = useCallback((orgUnit) => {
        setSearchText('')
        setOrganisationUnits([])
        setError(null)
        selectHandler(orgUnit)
    }, [selectHandler])

    const handleInputChange = useCallback(({ value }) => {
        setSearchText(value)
        if (!value || value.length === 0) {
            setOrganisationUnits([])
            setError(null)
            setFetching(false)
        }
    }, [])

    const onBackdropClick = useCallback(() => {
        setSearchText('')
        setOrganisationUnits([])
        setError(null)
    }, [])

    const getValidationText = () => {
        if (fetching || searchText.length === 0) {
            return ''
        }

        if (error) {
            return error
        }

        if (searchText.length < MIN_CHAR_LENGTH) {
            return `Please enter at least ${MIN_CHAR_LENGTH} characters`
        }

        if (organisationUnits.length === 0 && searchText.length >= MIN_CHAR_LENGTH) {
            return 'No matches found'
        }

        return ''
    }

    const inputEl = inputRef.current?.querySelector('input')

    return (
        <>
            <div ref={inputRef}>
                <Input
                    error={!!error}
                    loading={fetching}
                    onChange={handleInputChange}
                    placeholder="Search for an organisation unit"
                    validationText={getValidationText()}
                    value={searchText}
                    dense
                />
            </div>

            {organisationUnits.length > 0 && (
                <Layer onBackdropClick={onBackdropClick}>
                    <Popper placement="bottom-start" reference={inputEl}>
                        <Card>
                            <div className={styles.scrollBox}>
                                <Menu dense>
                                    {organisationUnits.map((orgUnit) => (
                                        <MenuItem
                                            key={orgUnit.id}
                                            label={orgUnit.displayName}
                                            onClick={() => selectOrgUnit(orgUnit)}
                                        />
                                    ))}
                                    {organisationUnits.length === PAGE_SIZE && (
                                        <MenuItem
                                            disabled
                                            label={`Showing ${PAGE_SIZE} results, please refine your search to see more.`}
                                            className={styles.refineSearchWarning}
                                        />
                                    )}
                                </Menu>
                            </div>
                        </Card>
                    </Popper>
                </Layer>
            )}
        </>
    )
}

AsyncAutoComplete.propTypes = {
    orgUnitType: PropTypes.string.isRequired,
    selectHandler: PropTypes.func.isRequired,
}

export default AsyncAutoComplete

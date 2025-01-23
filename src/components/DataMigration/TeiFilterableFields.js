import {
    VALUE_TYPE_DATE,
    VALUE_TYPE_DATETIME,
    VALUE_TYPE_INTEGER,
    VALUE_TYPE_INTEGER_NEGATIVE,
    VALUE_TYPE_INTEGER_POSITIVE,
    VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
    VALUE_TYPE_NUMBER,
    VALUE_TYPE_TEXT,
} from '@dhis2/analytics'
import i18n from '@dhis2/d2-i18n'
import {
    Button,
    ButtonStrip,
    Modal,
    IconFilter24,
    Chip,
    Box,
    ModalTitle,
    ModalContent,
    ModalActions,
    InputField,
    IconAdd24,
    IconSubtractCircle24,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { migrationActionCreators } from '../../actions/migration.js'
import { migrationSelectors } from '../../reducers/migration.js'
import classes from './styles/TeiAttributes.module.css'

const TeiFilterableFields = () => {
    const teis = useSelector(migrationSelectors.getMigrationTEIs)
    const allTEIs = useSelector(migrationSelectors.getMigrationRawTEIs)
    const programId = useSelector(migrationSelectors.getMigrationProgram)
    const orgUnitId = useSelector(migrationSelectors.getMigrationOrgUnit)
    const [fields, setFields] = useState([])
    const [selectedField, setSelectedField] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [storedByOptions, setStoredByOptions] = useState([])
    const [lastUpdatedByOptions, setLastUpdatedByOptions] = useState([])
    const dispatch = useDispatch()
    const filters = useSelector(migrationSelectors.getMigrationFilters)
    const attributesToDisplay = useSelector(
        migrationSelectors.getMigrationAttributesToDisplay
    )

    useEffect(() => {
        setFields([])
        if (teis && teis.length > 0) {
            // Extract attributes from the first TEI
            const firstTei = teis[0]
            const fields = firstTei.filterableFields
            setFields(fields)
        }
    }, [teis, programId, orgUnitId])

    useEffect(() => {
        setStoredByOptions(
            Array.from(
                new Set(
                    allTEIs.map(
                        (tei) =>
                            tei.attributes.find((attr) => attr?.storedBy)
                                ?.storedBy
                    )
                )
            )
        )
        setLastUpdatedByOptions(
            Array.from(
                new Set(
                    allTEIs.map((tei) => tei.lastUpdatedByUserInfo?.username)
                )
            )
        )
    }, [allTEIs])

    const handleFieldClick = (field) => {
        setSelectedField(field)
        const filter = filters.find((filter) => filter.field === field.name)
        if (filter) {
            if (
                [
                    VALUE_TYPE_NUMBER,
                    VALUE_TYPE_INTEGER,
                    VALUE_TYPE_INTEGER_NEGATIVE,
                    VALUE_TYPE_INTEGER_POSITIVE,
                    VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
                ].includes(field.valueType)
            ) {
                setNumberRange({ min: filter.min, max: filter.max })
            } else if (
                field.valueType === VALUE_TYPE_DATE ||
                field.valueType === VALUE_TYPE_DATETIME
            ) {
                setDateRange({ start: filter.startDate, end: filter.endDate })
            } else if (field.valueType === VALUE_TYPE_TEXT) {
                setKeyword(filter.keyword)
            }
        }
        setIsModalOpen(true)
    }

    const addColumn = (columnName) => {
        dispatch(migrationActionCreators.addDisplayAttribute(columnName))
        setIsModalOpen(false)
    }

    const removeColumn = (columnName) => {
        dispatch(migrationActionCreators.removeDisplayAttribute(columnName))
        setIsModalOpen(false)
    }

    const isActiveFilter = (field) =>
        filters.some((filter) => filter.field === field.name)

    const handleFilterChange = (value) => {
        if (isActiveFilter(selectedField)) {
            dispatch(migrationActionCreators.updateFilter(value))
        } else {
            dispatch(migrationActionCreators.addFilter(value))
        }
    }

    const removeFilter = () => {
        dispatch(migrationActionCreators.removeFilter(selectedField))
    }

    const [numberRange, setNumberRange] = useState({ min: null, max: null })
    const [dateRange, setDateRange] = useState({ start: null, end: null })
    const [keyword, setKeyword] = useState(null)

    const resetFilterInputs = () => {
        setNumberRange({ min: null, max: null })
        setDateRange({ start: null, end: null })
        setKeyword(null)
    }

    const cancelFilterModal = () => {
        setIsModalOpen(false)
        setSelectedField(null)
        resetFilterInputs()
    }

    const applyFilters = () => {
        setIsModalOpen(false)

        if (
            [
                VALUE_TYPE_NUMBER,
                VALUE_TYPE_INTEGER,
                VALUE_TYPE_INTEGER_NEGATIVE,
                VALUE_TYPE_INTEGER_POSITIVE,
                VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
            ].includes(selectedField.valueType)
        ) {
            handleFilterChange({
                min: numberRange.min,
                max: numberRange.max,
                field: selectedField.name,
                type: selectedField.valueType,
            })
        } else if (
            selectedField.valueType === VALUE_TYPE_DATE ||
            selectedField.valueType === VALUE_TYPE_DATETIME
        ) {
            handleFilterChange({
                startDate: dateRange.start,
                endDate: dateRange.end,
                field: selectedField.name,
                type: selectedField.valueType,
            })
        } else if (selectedField.valueType === VALUE_TYPE_TEXT) {
            handleFilterChange({
                keyword: keyword,
                field: selectedField.name,
                type: selectedField.valueType,
            })
        }

        resetFilterInputs()
    }

    const renderFilterDialog = () => {
        if (!selectedField) {
            return null
        }

        return (
            <Modal position="middle" hide={!isModalOpen} open={isModalOpen}>
                <ModalTitle>
                    {i18n.t('Filter by "{{name}}"', {
                        name: selectedField.name,
                    })}
                </ModalTitle>

                <ModalContent>
                    <Box padding="8px 0">
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                            }}
                        >
                            {selectedField.attribute &&
                                !attributesToDisplay.includes(
                                    selectedField.name
                                ) && (
                                    <Button
                                        onClick={() =>
                                            addColumn(selectedField.name)
                                        }
                                        primary
                                    >
                                        <IconAdd24 /> {i18n.t('Add Column')}
                                    </Button>
                                )}

                            {selectedField.attribute &&
                                attributesToDisplay.includes(
                                    selectedField.name
                                ) && (
                                    <Button
                                        onClick={() =>
                                            removeColumn(selectedField.name)
                                        }
                                        destructive
                                    >
                                        <IconSubtractCircle24 />{' '}
                                        {i18n.t('Remove Column')}
                                    </Button>
                                )}
                        </div>
                    </Box>
                    {[
                        VALUE_TYPE_NUMBER,
                        VALUE_TYPE_INTEGER,
                        VALUE_TYPE_INTEGER_NEGATIVE,
                        VALUE_TYPE_INTEGER_POSITIVE,
                        VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
                    ].includes(selectedField.valueType) && (
                        <div>
                            <h5>{i18n.t('Select number range')}</h5>
                            <Box margin="8px 0">
                                <InputField
                                    type="number"
                                    label={i18n.t('Min value')}
                                    value={numberRange.min}
                                    onChange={({ value }) =>
                                        setNumberRange({
                                            ...numberRange,
                                            min: value,
                                        })
                                    }
                                />
                                <InputField
                                    type="number"
                                    label={i18n.t('Max value')}
                                    value={numberRange.max}
                                    onChange={({ value }) =>
                                        setNumberRange({
                                            ...numberRange,
                                            max: value,
                                        })
                                    }
                                />
                            </Box>
                        </div>
                    )}
                    {(selectedField.valueType === VALUE_TYPE_DATE ||
                        selectedField.valueType === VALUE_TYPE_DATETIME) && (
                        <div>
                            <h5>{i18n.t('Select date range')}</h5>
                            <Box margin="8px 0">
                                <InputField
                                    type={
                                        selectedField.valueType === 'DATE'
                                            ? 'date'
                                            : 'datetime-local'
                                    }
                                    label={i18n.t('Start date')}
                                    value={dateRange.start}
                                    onChange={({ value }) =>
                                        setDateRange({
                                            ...dateRange,
                                            start: value,
                                        })
                                    }
                                />
                                <InputField
                                    type={
                                        selectedField.valueType === 'DATE'
                                            ? 'date'
                                            : 'datetime-local'
                                    }
                                    label={i18n.t('End date')}
                                    value={dateRange.end}
                                    onChange={({ value }) =>
                                        setDateRange({
                                            ...dateRange,
                                            end: value,
                                        })
                                    }
                                />
                            </Box>
                        </div>
                    )}
                    {(selectedField.name === 'Stored By' ||
                        selectedField.name === 'Last Updated By') && (
                        <SingleSelectField
                            label={i18n.t('Select username')}
                            onChange={({ selected }) => setKeyword(selected)}
                            selected={keyword}
                        >
                            {(selectedField.name === 'Stored By'
                                ? storedByOptions
                                : lastUpdatedByOptions
                            ).map((option) => (
                                <SingleSelectOption
                                    key={option}
                                    value={option}
                                    label={option}
                                />
                            ))}
                        </SingleSelectField>
                    )}
                    {selectedField.valueType === VALUE_TYPE_TEXT &&
                        selectedField.name !== 'Stored By' &&
                        selectedField.name !== 'Last Updated By' && (
                            <InputField
                                label={i18n.t('Enter keyword')}
                                type="text"
                                value={keyword}
                                onChange={({ value }) => setKeyword(value)}
                            />
                        )}
                </ModalContent>
                <ModalActions>
                    <ButtonStrip end>
                        <Button onClick={() => cancelFilterModal()} secondary>
                            {i18n.t('Cancel')}
                        </Button>
                        {isActiveFilter(selectedField) && (
                            <Button onClick={() => removeFilter()} destructive>
                                {i18n.t('Remove Filter')}
                            </Button>
                        )}
                        <Button
                            onClick={() => applyFilters()}
                            primary
                            disabled={
                                !(numberRange.min && numberRange.max) &&
                                !(dateRange.start && dateRange.end) &&
                                !keyword
                            }
                        >
                            {i18n.t('Apply Filter')}
                        </Button>
                    </ButtonStrip>
                </ModalActions>
            </Modal>
        )
    }

    return (
        <div className={classes.container}>
            <Box padding="16px">
                <div className={classes.attributesWrapper}>
                    <span
                        style={{
                            fontSize: '0.8em',
                            padding: '16px',
                            fontWeight: '500',
                            color: 'grey',
                        }}
                    >
                        {i18n.t('Filterable Fields:')}
                    </span>
                    {fields.map((field) => (
                        <Chip
                            key={field.name}
                            onClick={() => handleFieldClick(field)}
                            icon={<IconFilter24 />}
                            selected={isActiveFilter(field)}
                        >
                            {field.name}
                        </Chip>
                    ))}
                </div>
            </Box>
            {renderFilterDialog()}
        </div>
    )
}

export default TeiFilterableFields

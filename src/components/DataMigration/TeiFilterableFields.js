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
import { dataActionCreators } from '../../actions/data_controls.js'
import { dataControlSelectors } from '../../reducers/data_controls.js'
import classes from './styles/TeiAttributes.module.css'

const TeiFilterableFields = () => {
    const teis = useSelector(dataControlSelectors.getDataControlTEIs)
    const allTEIs = useSelector(dataControlSelectors.getDataControlRawTEIs)
    const programId = useSelector(dataControlSelectors.getDataControlProgram)
    const orgUnitId = useSelector(dataControlSelectors.getDataControlOrgUnit)
    const [fields, setFields] = useState([])
    const [selectedField, setSelectedField] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [storedByOptions, setStoredByOptions] = useState([])
    const [lastUpdatedByOptions, setLastUpdatedByOptions] = useState([])
    const dispatch = useDispatch()
    const filters = useSelector(dataControlSelectors.getDataControlFilters)
    const attributesToDisplay = useSelector(
        dataControlSelectors.getDataControlAttributesToDisplay
    )

    // Unified conditions state
    const [conditions, setConditions] = useState({})

    useEffect(() => {
        setFields([])
        if (teis && teis.length > 0) {
            const firstTei = teis[0]
            const fields = firstTei.filterableFields
            setFields(fields)
        }
    }, [teis, programId, orgUnitId])

    useEffect(() => {
        setStoredByOptions(
            Array.from(
                new Set(
                    allTEIs
                        .map(tei => tei.attributes.find(attr => attr?.storedBy)?.storedBy)
                        .filter(Boolean) // remove undefined/null
                )
            )
        )
        setLastUpdatedByOptions(
            Array.from(
                new Set(
                    allTEIs
                        .map(tei => tei.lastUpdatedByUserInfo?.username)
                        .filter(Boolean)
                )
            )
        )
    }, [allTEIs])

    // Get available users based on field type
    const availableUsers = selectedField?.name === 'Stored By' 
        ? storedByOptions 
        : lastUpdatedByOptions

    // Check if user is already selected in other conditions
    const isUserAlreadySelected = (user, currentIndex) => {
        return (conditions[selectedField?.name] || [])
            .some((cond, idx) => idx !== currentIndex && cond.username === user)
    }

    const handleFieldClick = (field) => {
        setSelectedField(field)
        
        // Initialize conditions from existing filters
        const fieldFilters = filters.filter(f => f.field === field.name)
        
        if (fieldFilters.length > 0) {
            const newConditions = fieldFilters.map(filter => {
                if ([
                    VALUE_TYPE_NUMBER,
                    VALUE_TYPE_INTEGER,
                    VALUE_TYPE_INTEGER_NEGATIVE,
                    VALUE_TYPE_INTEGER_POSITIVE,
                    VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
                ].includes(field.valueType)) {
                    return { 
                        type: field.valueType, 
                        min: filter.min?.toString() || '', 
                        max: filter.max?.toString() || '' 
                    }
                } else if ([VALUE_TYPE_DATE, VALUE_TYPE_DATETIME].includes(field.valueType)) {
                    return { 
                        type: field.valueType, 
                        start: filter.startDate || '', 
                        end: filter.endDate || '' 
                    }
                } else if (field.valueType === VALUE_TYPE_TEXT) {
                    return { 
                        type: field.valueType, 
                        keyword: filter.keyword || '' 
                    }
                } else if (field.name === 'Stored By' || field.name === 'Last Updated By') {
                    return { 
                        type: 'user', 
                        username: filter.username || '' 
                    }
                }
                return createEmptyCondition(field)
            })
            
            setConditions(prev => ({
                ...prev,
                [field.name]: newConditions
            }))
        } else {
            // Ensure at least one empty condition exists
            setConditions(prev => ({
                ...prev,
                [field.name]: [createEmptyCondition(field)]
            }))
        }
        
        setIsModalOpen(true)
    }

    const addColumn = (columnName) => {
        dispatch(dataActionCreators.addDisplayAttribute(columnName))
        setIsModalOpen(false)
    }

    const removeColumn = (columnName) => {
        dispatch(dataActionCreators.removeDisplayAttribute(columnName))
        setIsModalOpen(false)
    }

    const isActiveFilter = (field) => {
        return filters.some(filter => filter.field === field.name)
    }

    const removeFilter = () => {
        dispatch(dataActionCreators.removeFilter(selectedField))
        setConditions(prev => ({
            ...prev,
            [selectedField.name]: []
        }))
    }

    const addCondition = () => {
        setConditions(prev => ({
            ...prev,
            [selectedField.name]: [
                ...(prev[selectedField.name] || []),
                createEmptyCondition(selectedField)
            ]
        }))
    }

    const removeCondition = (index) => {
        setConditions(prev => ({
            ...prev,
            [selectedField.name]: prev[selectedField.name].filter((_, i) => i !== index)
        }))
    }

    const updateCondition = (index, key, value) => {
        setConditions(prev => ({
            ...prev,
            [selectedField.name]: prev[selectedField.name].map((cond, i) => 
                i === index ? { ...cond, [key]: value } : cond
            )
        }))
    }

    const createEmptyCondition = (field) => {
        switch(field.valueType) {
            case VALUE_TYPE_DATE:
            case VALUE_TYPE_DATETIME:
                return { type: field.valueType, start: '', end: '' }
            case VALUE_TYPE_NUMBER:
            case VALUE_TYPE_INTEGER:
            case VALUE_TYPE_INTEGER_POSITIVE:
            case VALUE_TYPE_INTEGER_NEGATIVE:
            case VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE:
                return { type: field.valueType, min: '', max: '' }
            case VALUE_TYPE_TEXT:
                return { type: field.valueType, keyword: '' }
            case 'user':
                return { type: 'user', username: '' }
            default:
                return {}
        }
    }

    const cancelFilterModal = () => {
        setIsModalOpen(false)
        setSelectedField(null)
    }

    const applyFilters = () => {
        const newFilters = []
        
        Object.entries(conditions).forEach(([fieldName, fieldConditions]) => {
            fieldConditions.forEach(condition => {
                if (!condition.type) return
                
                const baseFilter = {
                    field: fieldName,
                    type: condition.type
                }
                
                if ([
                    VALUE_TYPE_NUMBER,
                    VALUE_TYPE_INTEGER,
                    VALUE_TYPE_INTEGER_POSITIVE,
                    VALUE_TYPE_INTEGER_NEGATIVE,
                    VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE
                ].includes(condition.type)) {
                    if (condition.min !== '' && condition.max !== '') {
                        newFilters.push({
                            ...baseFilter,
                            min: Number(condition.min),
                            max: Number(condition.max)
                        })
                    }
                } 
                else if ([VALUE_TYPE_DATE, VALUE_TYPE_DATETIME].includes(condition.type)) {
                    if (condition.start && condition.end) {
                        newFilters.push({
                            ...baseFilter,
                            startDate: condition.start,
                            endDate: condition.end
                        })
                    }
                }
                else if (condition.type === VALUE_TYPE_TEXT && condition.keyword) {
                    newFilters.push({
                        ...baseFilter,
                        keyword: condition.keyword
                    })
                }
                else if (condition.type === 'user' && condition.username) {
                    newFilters.push({
                        ...baseFilter,
                        username: condition.username
                    })
                }
            })
        })

        dispatch(dataActionCreators.setFilters(newFilters))
        setIsModalOpen(false)

        console.log('Current conditions:', conditions)
        console.log('Generated filters:', newFilters)
    }

    const isValidCondition = (condition) => {
        switch(condition.type) {
            case VALUE_TYPE_DATE:
            case VALUE_TYPE_DATETIME:
                return condition.start && condition.end
            case VALUE_TYPE_NUMBER:
            case VALUE_TYPE_INTEGER:
            case VALUE_TYPE_INTEGER_POSITIVE:
            case VALUE_TYPE_INTEGER_NEGATIVE:
            case VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE:
                return condition.min !== '' && condition.max !== ''
            case VALUE_TYPE_TEXT:
                return condition.keyword !== ''
            case 'user':
                return condition.username !== ''
            default:
                return false
        }
    }

    const hasValidConditions = () => {
        if (!selectedField) return false
        
        const fieldConditions = conditions[selectedField.name] || []
        return fieldConditions.some(condition => {
            switch(condition.type) {
                case VALUE_TYPE_DATE:
                case VALUE_TYPE_DATETIME:
                    return condition.start && condition.end
                case VALUE_TYPE_NUMBER:
                case VALUE_TYPE_INTEGER:
                case VALUE_TYPE_INTEGER_POSITIVE:
                case VALUE_TYPE_INTEGER_NEGATIVE:
                case VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE:
                    return condition.min !== '' && condition.max !== '' && 
                        !isNaN(condition.min) && !isNaN(condition.max)
                case VALUE_TYPE_TEXT:
                case 'user':
                    return condition.keyword || condition.username
                default:
                    return false
            }
        })
    }

    const renderFilterDialog = () => {
        if (!selectedField) return null

        return (
            <Modal position="middle" hide={!isModalOpen} open={isModalOpen}>
                <ModalTitle>
                    {i18n.t('Filter by "{{name}}"', { name: selectedField.name })}
                </ModalTitle>

                <ModalContent>
                    <Box padding="8px 0">
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {selectedField.attribute && !attributesToDisplay.includes(selectedField.name) && (
                                <Button onClick={() => addColumn(selectedField.name)} primary>
                                    <IconAdd24 /> {i18n.t('Add Column')}
                                </Button>
                            )}

                            {selectedField.attribute && attributesToDisplay.includes(selectedField.name) && (
                                <Button onClick={() => removeColumn(selectedField.name)} destructive>
                                    <IconSubtractCircle24 /> {i18n.t('Remove Column')}
                                </Button>
                            )}
                        </div>
                    </Box>

                    {/* Number Range Filters */}
                    {[
                        VALUE_TYPE_NUMBER,
                        VALUE_TYPE_INTEGER,
                        VALUE_TYPE_INTEGER_NEGATIVE,
                        VALUE_TYPE_INTEGER_POSITIVE,
                        VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE
                    ].includes(selectedField.valueType) && (
                        <div>
                            <h5>{i18n.t('Number Ranges')}</h5>
                            <Button onClick={addCondition} icon={<IconAdd24 />}>
                                {i18n.t('Add Range')}
                            </Button>

                            {(conditions[selectedField.name] || []).map((cond, index) => (
                                <Box key={index} margin="8px 0" padding="8px" border="1px dashed #ddd">
                                    <InputField
                                        type="number"
                                        label={i18n.t('Min value')}
                                        value={cond.min}
                                        onChange={({ value }) => updateCondition(index, 'min', value)}
                                    />
                                    <InputField
                                        type="number"
                                        label={i18n.t('Max value')}
                                        value={cond.max}
                                        onChange={({ value }) => updateCondition(index, 'max', value)}
                                    />
                                    <Button 
                                        small 
                                        destructive 
                                        onClick={() => removeCondition(index)}
                                    >
                                        {i18n.t('Remove')}
                                    </Button>
                                </Box>
                            ))}
                        </div>
                    )}

                    {/* Date Range Filters */}
                    {(selectedField.valueType === VALUE_TYPE_DATE ||
                      selectedField.valueType === VALUE_TYPE_DATETIME) && (
                        <div>
                            <h5>{i18n.t('Date Ranges')}</h5>
                            <Button onClick={addCondition} icon={<IconAdd24 />}>
                                {i18n.t('Add Range')}
                            </Button>

                            {(conditions[selectedField.name] || []).map((cond, index) => (
                                <Box key={index} margin="8px 0" padding="8px" border="1px dashed #ddd">
                                    <InputField
                                        type="date"
                                        label={i18n.t('Start date')}
                                        value={cond.start}
                                        onChange={({ value }) => updateCondition(index, 'start', value)}
                                    />
                                    <InputField
                                        type="date"
                                        label={i18n.t('End date')}
                                        value={cond.end}
                                        onChange={({ value }) => updateCondition(index, 'end', value)}
                                    />
                                    <Button 
                                        small 
                                        destructive 
                                        onClick={() => removeCondition(index)}
                                    >
                                        {i18n.t('Remove')}
                                    </Button>
                                </Box>
                            ))}
                        </div>
                    )}

                    {/* User Selection Filters */}
                    {(selectedField.name === 'Stored By' || selectedField.name === 'Last Updated By') && (
                        <div>
                            <h5>{i18n.t('Select Users')}</h5>
                            <Button 
                                onClick={addCondition} 
                                icon={<IconAdd24 />}
                                disabled={availableUsers.length === 0}
                            >
                                {i18n.t('Add User Filter')}
                            </Button>

                            {(conditions[selectedField.name] || []).map((cond, index) => (
                                <Box key={index} margin="8px 0" padding="8px" border="1px dashed #ddd">
                                    <SingleSelectField
                                        label={i18n.t('Select user')}
                                        onChange={({ selected }) => updateCondition(index, 'username', selected)}
                                        selected={cond.username}
                                        filterable
                                    >
                                        {availableUsers.map((user) => (
                                            <SingleSelectOption
                                                key={user}
                                                value={user}
                                                label={user}
                                                disabled={isUserAlreadySelected(user, index)}
                                            />
                                        ))}
                                    </SingleSelectField>
                                    <Button 
                                        small 
                                        destructive 
                                        onClick={() => removeCondition(index)}
                                        style={{ marginTop: '8px' }}
                                    >
                                        {i18n.t('Remove')}
                                    </Button>
                                </Box>
                            ))}
                        </div>
                    )}

                    {/* Text Filters */}
                    {selectedField.valueType === VALUE_TYPE_TEXT &&
                     selectedField.name !== 'Stored By' &&
                     selectedField.name !== 'Last Updated By' && (
                        <div>
                            <h5>{i18n.t('Keywords')}</h5>
                            <Button onClick={addCondition} icon={<IconAdd24 />}>
                                {i18n.t('Add Keyword')}
                            </Button>

                            {(conditions[selectedField.name] || []).map((cond, index) => (
                                <Box key={index} margin="8px 0" padding="8px" border="1px dashed #ddd">
                                    <InputField
                                        label={i18n.t('Keyword')}
                                        type="text"
                                        value={cond.keyword}
                                        onChange={({ value }) => updateCondition(index, 'keyword', value)}
                                    />
                                    <Button 
                                        small 
                                        destructive 
                                        onClick={() => removeCondition(index)}
                                        style={{ marginTop: '8px' }}
                                    >
                                        {i18n.t('Remove')}
                                    </Button>
                                </Box>
                            ))}
                        </div>
                    )}
                </ModalContent>

                <ModalActions>
                    <ButtonStrip end>
                        <Button onClick={cancelFilterModal} secondary>
                            {i18n.t('Cancel')}
                        </Button>
                        {isActiveFilter(selectedField) && (
                            <Button onClick={removeFilter} destructive>
                                {i18n.t('Remove Filter')}
                            </Button>
                        )}
                        <Button
                            onClick={applyFilters}
                            primary
                            disabled={!hasValidConditions()}
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
                    <span style={{ fontSize: '0.8em', padding: '16px', fontWeight: '500', color: 'grey' }}>
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
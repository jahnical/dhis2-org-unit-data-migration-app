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

export const FILTERABLE_TYPES = [
    VALUE_TYPE_DATE,
    VALUE_TYPE_DATETIME,
    VALUE_TYPE_TEXT,
    VALUE_TYPE_NUMBER,
    VALUE_TYPE_INTEGER,
    VALUE_TYPE_INTEGER_NEGATIVE,
    VALUE_TYPE_INTEGER_POSITIVE,
    VALUE_TYPE_INTEGER_ZERO_OR_POSITIVE,
]

export const filterTeis = (teis, filters) => {
    teis = teis.map((tei) => {
                const attributes =
                    tei.attributes?.map((attr) => ({
                        attribute: attr.attribute,
                        name: attr.displayName,
                        valueType: attr.valueType,
                        value: attr.value,
                    })) ?? []

                const storedBy = tei.attributes?.find(
                    (attr) => attr?.storedBy
                )?.storedBy

                return {
                    id: tei.trackedEntityInstance,
                    created: tei.created,
                    lastUpdated: tei.lastUpdated,
                    createdBy: tei.createdByUserInfo ?? {},
                    storedBy: storedBy,
                    lastUpdatedBy: tei.lastUpdatedByUserInfo ?? {},
                    attributes,
                    filterableFields: [
                        ...[
                            {
                                name: 'Created At',
                                value: tei.created,
                                valueType: VALUE_TYPE_DATETIME,
                            },
                            {
                                name: 'Last Updated At',
                                value: tei.lastUpdated,
                                valueType: VALUE_TYPE_DATETIME,
                            },
                            {
                                name: 'Stored By',
                                value: storedBy,
                                valueType: VALUE_TYPE_TEXT,
                            },
                            {
                                name: 'Last Updated By',
                                value: tei.lastUpdatedByUserInfo?.username,
                                valueType: VALUE_TYPE_TEXT,
                            },
                        ],
                        ...attributes,
                    ].filter((field) =>
                        FILTERABLE_TYPES.includes(field.valueType)
                    ),
                }
            })

    if (!filters || filters.length === 0) {
        return teis
    }

    const filtersByField = filters.reduce((acc, filter) => {
        if (!acc[filter.field]) acc[filter.field] = []
        acc[filter.field].push(filter)
        return acc
    }, {})

    const filteredTeis = teis.filter(tei => {
        return Object.entries(filtersByField).every(([field, fieldFilters]) => {
            return fieldFilters.some(filter => {
                let value

                    if (filter.field === 'Stored By') {
                        value = tei.storedBy || tei.filterableFields.find(f => f.name === 'Stored By')?.value
                    } else if (filter.field === 'Last Updated By') {
                        value = tei.lastUpdatedBy?.username || tei.filterableFields.find(f => f.name === 'Last Updated By')?.value
                    } else {
                        value = tei.filterableFields.find(f => f.name === filter.field)?.value
                    }

                    if (filter.type === VALUE_TYPE_TEXT && filter.username) {
                        if (!value || !filter.username) return false
                        return value.trim().toLowerCase() === filter.username.trim().toLowerCase()
                    }
                    if (filter.min && value < filter.min) {
                        return false
                    }
                    if (filter.max && value > filter.max) {
                        return false
                    }
                    if (filter.startDate) {
                        let filterStart = filter.startDate
                        if (/^\d{4}-\d{2}-\d{2}$/.test(filterStart)) {
                            filterStart = filterStart + 'T00:00:00.000'
                        }
                        if (value < filterStart) {
                            return false
                        }
                    }
                    if (filter.endDate) {
                        let filterEnd = filter.endDate
                        if (/^\d{4}-\d{2}-\d{2}$/.test(filterEnd)) {
                            filterEnd = filterEnd + 'T23:59:59.999'
                        }
                        if (value > filterEnd) {
                            return false
                        }
                    }
                    if (
                        filter.keyword &&
                        !value?.toLowerCase().includes(filter.keyword.toLowerCase())
                    ) {
                        return false
                    }
                return true
            })
        })

    })
    return filteredTeis
}



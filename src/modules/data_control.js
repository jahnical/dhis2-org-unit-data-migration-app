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

    const filteredTeis = teis.filter((tei) => {
        return filters.every((filter) => {
            const value = tei.filterableFields.find(
                (field) => field.name === filter.field
            )?.value
            if (filter.min && value < filter.min) {
                return false
            }
            if (filter.max && value > filter.max) {
                return false
            }
            if (filter.startDate && value < filter.startDate) {
                return false
            }
            if (filter.endDate && value > filter.endDate) {
                return false
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

    return filteredTeis
}

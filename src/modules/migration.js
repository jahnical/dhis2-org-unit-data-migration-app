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
                !value.toLowerCase().includes(filter.keyword.toLowerCase())
            ) {
                return false
            }
            return true
        })
    })

    return filteredTeis
}

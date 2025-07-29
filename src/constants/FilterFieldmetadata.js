export const FIELD_METADATA = {
    Sex: {
        inputType: 'select',
        options: ['Male', 'Female', 'Other'],
        exactMatch: true,
    },

       'Household head gender': {
        inputType: 'select',
        options: ['Male', 'Female', 'Other'],
        exactMatch: true,
    },

    Status: {
        inputType: 'select',
        options: ['Active', 'Inactive'],
        exactMatch: true,
    },

    'Stored By': {
        inputType: 'storedByOptions',
    },

    'Last Updated By': {
        inputType: 'lastUpdatedByOptions',
    },

    'Created At': {
        inputType: 'date-range',
        valueType: 'DATE',
    },

    'Last Updated At': {
        inputType: 'date-range',
        valueType: 'DATE', 
    },

    'Traditional Authority': {
        inputType: 'text',
        valueType: 'TEXT',
    },

    'Group Village Head': {
        inputType: 'text',
        valueType: 'TEXT',
    },

    'Household Code': {
        inputType: 'number',
        valueType: 'NUMBER',
    },

    'Household Member Number': {
    inputType: 'NUMBER',
    }
};
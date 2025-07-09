export const APP_SOFT_DELETED_ATTR_ID = 'SoY0Cw9UXBL';

// Helper to check if a TEI is soft deleted by app attribute (Boolean Yes/No)
export const isAppSoftDeleted = (tei) => {
    const attr = tei.attributes?.find(a => a.attribute === APP_SOFT_DELETED_ATTR_ID);
    // Accept both string and boolean true for Yes/No
    return attr && (attr.value === true || attr.value === 'true' || attr.value === 'Yes');
};

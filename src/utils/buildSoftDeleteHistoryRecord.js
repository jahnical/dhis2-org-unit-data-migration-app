// src/utils/buildSoftDeleteHistoryRecord.js
// Utility to build a migration history record for soft-deleted TEIs
export function buildSoftDeleteHistoryRecord({ programId, programName, orgUnitId, orgUnitName, user, teis }) {
    return {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString(),
        program: { id: programId, name: programName },
        sourceOrgUnit: { id: orgUnitId, name: orgUnitName },
        targetOrgUnit: null,
        user: {
            id: (user && user.id) ? user.id : '',
            name: (user && user.name) ? user.name : '',
        },
        action: 'soft-deleted',
        teis: teis.map(tei => ({
            id: tei.trackedEntityInstance,
            created: tei.created,
            lastUpdated: tei.lastUpdated,
            storedBy: tei.storedBy,
            lastUpdatedBy: tei.lastUpdatedBy,
            attributes: tei.attributes,
        })),
    }
}

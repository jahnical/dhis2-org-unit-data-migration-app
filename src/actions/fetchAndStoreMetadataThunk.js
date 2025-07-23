// src/actions/metadata.js

import { useDataEngine } from '@dhis2/app-runtime';

export const fetchAndStoreMetadataThunk = (deletedTeis, engine) => async (dispatch) => {
    if (!deletedTeis || deletedTeis.length === 0) return;
    const programIds = new Set();
    const orgUnitIds = new Set();
    deletedTeis.forEach(tei => {
        if (tei.enrollments && tei.enrollments.length > 0) {
            tei.enrollments.forEach(enr => {
                if (enr.program) programIds.add(enr.program);
            });
        }
        if (tei.program) programIds.add(tei.program);
        if (tei.orgUnit) orgUnitIds.add(tei.orgUnit);
        if (tei.orgUnitId) orgUnitIds.add(tei.orgUnitId);
    });

    // Log all program and org unit IDs being requested
    console.log('Requesting program IDs:', Array.from(programIds));
    console.log('Requesting orgUnit IDs:', Array.from(orgUnitIds));

    // Fetch program names using DHIS2 data engine
    const programNames = {};
    for (const id of programIds) {
        try {
            const progRes = await engine.query({
                program: {
                    resource: `programs/${id}`,
                }
            });
            const prog = progRes.program;
            programNames[id] = { name: prog.displayName || prog.name || id };
        } catch (e) {
            console.warn('Failed to fetch program', id, e);
        }
    }

    // Fetch org unit names using DHIS2 data engine
    const orgUnitNames = {};
    for (const id of orgUnitIds) {
        try {
            const ouRes = await engine.query({
                orgUnit: {
                    resource: `organisationUnits/${id}`,
                }
            });
            const ou = ouRes.orgUnit;
            orgUnitNames[id] = { name: ou.displayName || ou.name || id };
        } catch (e) {
            console.warn('Failed to fetch orgUnit', id, e);
        }
    }

    console.log('Fetched programNames:', programNames);
    console.log('Fetched orgUnitNames:', orgUnitNames);
    const metadataPayload = { programs: programNames, orgUnits: orgUnitNames };
    dispatch({ type: 'SET_METADATA', payload: metadataPayload });
};

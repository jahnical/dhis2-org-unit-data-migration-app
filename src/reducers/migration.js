// Action Types
export const MIGRATION_TYPES = {
    MIGRATE_TEIS_START: 'MIGRATE_TEIS_START',
    MIGRATE_TEIS_SUCCESS: 'MIGRATE_TEIS_SUCCESS',
    MIGRATE_TEIS_ERROR: 'MIGRATE_TEIS_ERROR',
    SET_TARGET_ORG_UNIT: 'DATA_CONTROL_SET_TARGET_ORG_UNIT',
    RESET: 'MIGRATE_TEIS_RESET',
}

const migrationInitialState = {
    loading: false,
    error: null,
    targetOrgUnitId: null,
    migrationStatus: null
}

// Migration Process Reducer
export function migration(state = migrationInitialState, action) {
    switch (action.type) {
        case MIGRATION_TYPES.SET_TARGET_ORG_UNIT:
            return { ...state, targetOrgUnitId: action.payload };

        case MIGRATION_TYPES.MIGRATE_TEIS_START:
            return { ...state, loading: true, error: null, migrationStatus: null };

        case MIGRATION_TYPES.MIGRATE_TEIS_SUCCESS:
            return {
                ...state,
                loading: false,
                migrationStatus: 'success',
                teis: [],
            };

        case MIGRATION_TYPES.MIGRATE_TEIS_ERROR:
            return { ...state, loading: false, error: action.payload, migrationStatus: null };

        case MIGRATION_TYPES.RESET:
            return migrationInitialState;

        default:
            return state;
    }
}

// Selectors
export const migrationSelectors = {
    getMigrationIsLoading: (state) => state.migration.loading,
    getMigrationError: (state) => state.migration.error,
    getMigrationMigrationStatus: (state) => state.migration.migrationStatus,
    getMigrationTargetOrgUnitId: (state) => state.migration.targetOrgUnitId,
}

// __demoHistoryData.js
// Example demo data for MigrationHistoryTable/History UI development
export const DEMO_HISTORY = [
  {
    id: 'batch-1',
    timestamp: '2025-07-10T12:00:00Z',
    date: '2025-07-10',
    time: '12:00:00',
    program: { id: 'abc123', name: 'Malaria Program' },
    sourceOrgUnit: { id: 'ou123', name: 'Lilongwe DHO' },
    targetOrgUnit: { id: 'ou456', name: 'Area 25 Clinic' },
    user: { id: 'usr789', name: 'Jane Banda' },
    action: 'migrated',
    teis: [
      {
        id: 'TEI123',
        created: '2025-07-09T10:00:00Z',
        lastUpdated: '2025-07-10T11:00:00Z',
        storedBy: 'userA',
        lastUpdatedBy: { username: 'userB' },
        attributes: [
          { attribute: 'eRsJABP4maZ', value: 'Brad', displayName: 'First Name', valueType: 'TEXT' },
          { attribute: 'imKbcSFoXYW', value: 'Pitt', displayName: 'Last Name', valueType: 'TEXT' }
        ]
      },
      {
        id: 'TEI124',
        created: '2025-07-08T09:00:00Z',
        lastUpdated: '2025-07-09T10:00:00Z',
        storedBy: 'userC',
        lastUpdatedBy: { username: 'userD' },
        attributes: []
      }
    ]
  },
  {
    id: 'batch-2',
    timestamp: '2025-07-11T13:00:00Z',
    date: '2025-07-11',
    time: '13:00:00',
    program: { id: 'abc123', name: 'Malaria Program' },
    sourceOrgUnit: { id: 'ou123', name: 'Lilongwe DHO' },
    targetOrgUnit: { id: 'ou789', name: 'Area 18 Clinic' },
    user: { id: 'usr789', name: 'Jane Banda' },
    action: 'soft-deleted',
    teis: [
      {
        id: 'TEI125',
        created: '2025-07-10T10:00:00Z',
        lastUpdated: '2025-07-11T11:00:00Z',
        storedBy: 'userE',
        lastUpdatedBy: { username: 'userF' },
        attributes: [
          { attribute: 'eRsJABP4maZ', value: 'Alice', displayName: 'First Name', valueType: 'TEXT' },
          { attribute: 'imKbcSFoXYW', value: 'Smith', displayName: 'Last Name', valueType: 'TEXT' }
        ]
      }
    ]
  },
  {
    id: 'batch-3',
    timestamp: '2025-07-12T14:00:00Z',
    date: '2025-07-12',
    time: '14:00:00',
    program: { id: 'abc123', name: 'Malaria Program' },
    sourceOrgUnit: { id: 'ou456', name: 'Area 25 Clinic' },
    targetOrgUnit: { id: 'ou123', name: 'Lilongwe DHO' },
    user: { id: 'usr789', name: 'Jane Banda' },
    action: 'undone',
    teis: [
      {
        id: 'TEI123',
        created: '2025-07-09T10:00:00Z',
        lastUpdated: '2025-07-12T13:00:00Z',
        storedBy: 'userA',
        lastUpdatedBy: { username: 'userB' },
        attributes: [
          { attribute: 'eRsJABP4maZ', value: 'Brad', displayName: 'First Name', valueType: 'TEXT' },
          { attribute: 'imKbcSFoXYW', value: 'Pitt', displayName: 'Last Name', valueType: 'TEXT' }
        ]
      }
    ]
  },
  {
    id: 'batch-4',
    timestamp: '2025-07-12T15:00:00Z',
    date: '2025-07-12',
    time: '15:00:00',
    program: { id: 'abc123', name: 'Malaria Program' },
    sourceOrgUnit: { id: 'ou789', name: 'Area 18 Clinic' },
    targetOrgUnit: { id: 'ou123', name: 'Lilongwe DHO' },
    user: { id: 'usr789', name: 'Jane Banda' },
    action: 'restored',
    teis: [
      {
        id: 'TEI125',
        created: '2025-07-10T10:00:00Z',
        lastUpdated: '2025-07-12T14:30:00Z',
        storedBy: 'userE',
        lastUpdatedBy: { username: 'userF' },
        attributes: [
          { attribute: 'eRsJABP4maZ', value: 'Alice', displayName: 'First Name', valueType: 'TEXT' },
          { attribute: 'imKbcSFoXYW', value: 'Smith', displayName: 'Last Name', valueType: 'TEXT' }
        ]
      }
    ]
  }
]

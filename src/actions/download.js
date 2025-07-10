import { DOWNLOAD_TYPES } from '../reducers/download.js'

// Helper function to convert TEIs to CSV
const convertTeisToCsv = (teis, metadata) => {
  if (!teis?.length) {return '';}

  // Step 1: Collect all unique attributes with their names
  const attributeMap = new Map();

  teis.forEach(tei => {
    tei.attributes?.forEach(attr => {
      if (!attributeMap.has(attr.attribute)) {
        attributeMap.set(attr.attribute, {
          id: attr.attribute,
          name: attr.displayName || attr.attribute // Fallback to ID if no display name
        });
      }
    });
  });

  // Convert to array for consistent ordering
  const attributes = Array.from(attributeMap.values());

  // Step 2: Prepare headers
  const headers = [
    'Organisation Unit',
    ...attributes.map(attr => attr.name), // Use display names for headers
  ].join(',');

  // Step 3: Prepare rows
  const rows = teis.map(tei => {
    // Create a quick lookup for attribute values
    const attributeValues = {};
    tei.attributes?.forEach(attr => {
      attributeValues[attr.attribute] = `"${String(attr.value || '').replace(/"/g, '""')}"`;
    });

    return [
      metadata[tei.orgUnit].name || '', // Use org unit name or empty string
      ...attributes.map(attr => attributeValues[attr.id] || '""'), // Match values to headers
    ].join(',');
  });

  return [headers, ...rows].join('\n');
};

// Helper to trigger download
const downloadCsv = (csvData, filename = 'teis-export.csv') => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const downloadActions = {
  setTargetOrgUnit: (orgUnitId) => ({
              type: DOWNLOAD_TYPES.SET_TARGET_ORG_UNIT,
              payload: orgUnitId,
          }),

      resetDownload: () => ({
              type: DOWNLOAD_TYPES.RESET,
          }),


  downloadTEIsAsCsv:
    ({ teis, selectedTeis, metadata, onProgress, filename }) =>
    async (dispatch) => {
      if (!teis?.length || !selectedTeis?.length) {
        throw new Error('Missing required parameters')
      }

      dispatch({ type: DOWNLOAD_TYPES.DOWNLOAD_TEIS_START })

      try {
        // Filter selected TEIs
        const filteredTeis = teis.filter(tei =>
          selectedTeis.includes(tei.trackedEntityInstance))

        // Convert to CSV
        const csvData = convertTeisToCsv(filteredTeis, metadata)

        // Trigger download
        downloadCsv(csvData, filename)

        // Update progress (if needed)
        if (onProgress) {
          onProgress({
            step: 1,
            total: filteredTeis.length,
            completed: filteredTeis.length
          })
        }

        dispatch({
          type: DOWNLOAD_TYPES.DOWNLOAD_TEIS_SUCCESS,
          payload: { count: filteredTeis.length }
        })

        return { count: filteredTeis.length }
      } catch (error) {
        dispatch({
          type: DOWNLOAD_TYPES.DOWNLOAD_TEIS_ERROR,
          payload: error.message
        })
        throw error
      }
    }
}

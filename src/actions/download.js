import { DOWNLOAD_TYPES } from '../reducers/download.js'

// Helper function to convert TEIs to CSV
const convertTeisToCsv = (teis) => {
  try {
  if (!teis?.length) return ''
  
  // Extract all unique attribute keys (for CSV headers)
  const allAttributes = teis.flatMap(tei => tei.attributes || [])
  const attributeKeys = [...new Set(allAttributes.map(attr => attr.attribute))]
  
  // CSV headers
  const headers = [
    'trackedEntityInstance',
    'orgUnit',
    ...attributeKeys,
    'enrollmentsCount',
    'eventsCount'
  ].join(',')
  
  // Process each TEI
  const rows = teis.map(tei => {
    const attributes = {}
    ;(tei.attributes || []).forEach(attr => {
      attributes[attr.attribute] = `"${attr.value?.replace(/"/g, '""')}"` // Escape quotes in CSV
    })
    
    return [
      tei.trackedEntityInstance,
      tei.orgUnit,
      ...attributeKeys.map(key => attributes[key] || '""'),
      (tei.enrollments || []).length,
      (tei.enrollments || []).reduce((sum, e) => sum + (e.events || []).length, 0)
    ].join(',')
  })
  
  return [headers, ...rows].join('\n')
} catch (error) {
    console.error('CSV conversion error:', error)
    throw new Error('Failed to convert TEIs to CSV')
  }
}

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
  // ... keep existing actions like setTargetOrgUnit, resetMigration ...
  
  downloadTEIsAsCsv:
    ({ teis, selectedTeis, onProgress, filename }) =>
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
        const csvData = convertTeisToCsv(filteredTeis)
        
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
import { DELETION_TYPES } from "../reducers/deletion.js"
import { softDeleteTEI } from '../api/teis.js'
import { APP_SOFT_DELETED_ATTR_ID } from '../constants/appSoftDeletedAttrId.js'

export const deletionAsyncActions = {
    softDeleteTEIs: ({ teis, engine }) => async (dispatch) => {
        if (!teis?.length || !engine) {
            throw new Error('Missing required parameters')
        }
        dispatch({ type: DELETION_TYPES.DELETE_TEIS_START })
      try {
          await Promise.all(teis.map((teiId) => softDeleteTEI(engine, teiId, APP_SOFT_DELETED_ATTR_ID)));
          dispatch({ type: DELETION_TYPES.SOFT_DELETE_TEIS, payload: teis });
      } catch (error) {
          dispatch({
              type: DELETION_TYPES.DELETE_TEIS_ERROR,
              payload: error.message,
          });
          throw error;
      }
    },
    
    softDeleteTEIsWithRetry: ({ teis, engine, maxRetries = 3 }) => async (dispatch) => {
      if (!teis?.length || !engine) {
          throw new Error('Missing required parameters');
      }
      console.log('[softDeleteTEIsWithRetry] Called with TEIs:', teis);
      dispatch({ type: DELETION_TYPES.DELETE_TEIS_START });
  
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
              await Promise.all(teis.map((teiId) => softDeleteTEI(engine, teiId, APP_SOFT_DELETED_ATTR_ID)));
              console.log(`[softDeleteTEIsWithRetry] Success on attempt ${attempt} for TEIs:`, teis);
              dispatch({ type: DELETION_TYPES.SOFT_DELETE_TEIS, payload: teis });
              return; // Success, exit the retry loop
          } catch (error) {
              console.error(`Attempt ${attempt} to delete TEIs failed:`, error);
              if (attempt === maxRetries) {
                  dispatch({ type: DELETION_TYPES.DELETE_TEIS_ERROR, payload: error.message });
                  return; // All retries failed
              }
              await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000)); // Exponential backoff
          }
      }
    }
}
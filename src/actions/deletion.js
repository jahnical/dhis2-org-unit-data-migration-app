import { DELETION_TYPES } from "../reducers/deletion.js"

export const deletionAsyncActions = {
    deleteTEIs: ({teis, deleteTEI}) => async (dispatch) => {
        console.log('deleteTEIs called with:', teis, deleteTEI)
        if (!teis?.length || !deleteTEI) {
            throw new Error('Missing required parameters')
        }

        dispatch({ type: DELETION_TYPES.DELETE_TEIS_START })

        try {
            const deletionPromises = teis.map((tei) => {
                deleteTEI({id: tei})
            })

            await Promise.all(deletionPromises)

            dispatch({ type: DELETION_TYPES.DELETE_TEIS_SUCCESS })
        } catch (error) {
            dispatch({
                type: DELETION_TYPES.DELETE_TEIS_ERROR,
                payload: error.message,
            })
            throw error
        }
    }
}

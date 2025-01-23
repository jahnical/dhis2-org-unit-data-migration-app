import i18n from '@dhis2/d2-i18n'
import PropTypes from 'prop-types'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { tSetUiInput } from '../../../actions/ui.js'
import {
    OUTPUT_TYPE_EVENT,
    OUTPUT_TYPE_ENROLLMENT,
    OUTPUT_TYPE_TRACKED_ENTITY,
} from '../../../modules/visualization.js'
import { sGetUiInput } from '../../../reducers/ui.js'
import { ProgramSelect } from '../ProgramDimensionsPanel/ProgramSelect.js'
import { InputOption } from './InputOption.js'
import styles from './InputPanel.module.css'

export const getLabelForInputType = (type) => {
    switch (type) {
        case OUTPUT_TYPE_EVENT:
            return i18n.t('Event')
        case OUTPUT_TYPE_ENROLLMENT:
            return i18n.t('Enrollment')
        case OUTPUT_TYPE_TRACKED_ENTITY:
            return i18n.t('Tracked entity')
        default:
            throw new Error('No input type specified')
    }
}

export const InputPanel = ({ visible }) => {
    const dispatch = useDispatch()
    const selectedInput = useSelector(sGetUiInput)?.type

    if (!visible) {
        return null
    }

    const setSelectedInput = (input) => {
        if (selectedInput !== input) {
            dispatch(tSetUiInput({ type: input }))
        }
    }

    if (selectedInput !== OUTPUT_TYPE_ENROLLMENT) {
        setSelectedInput(OUTPUT_TYPE_ENROLLMENT)
    }

    return (
        <div className={styles.container} data-test="input-panel">
            <InputOption
                dataTest="input-enrollment"
                header="Program Selection"
                description={i18n.t('Select program to migrate data.')}
                onClick={() => setSelectedInput(OUTPUT_TYPE_ENROLLMENT)}
                selected={selectedInput === OUTPUT_TYPE_ENROLLMENT}
            >
                {selectedInput === OUTPUT_TYPE_ENROLLMENT && <ProgramSelect />}
            </InputOption>
        </div>
    )
}

InputPanel.propTypes = {
    visible: PropTypes.bool.isRequired,
}

import { IconChevronUp16, IconChevronDown16, colors } from '@dhis2/ui'
import cx from 'classnames'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { acSetShowExpandedLayoutPanel } from '../../actions/ui.js'
import {
    sGetUiLayoutPanelHidden,
    sGetUiShowExpandedLayoutPanel,
} from '../../reducers/ui.js'
import TeiFilterableFields from '../DataMigration/TeiFilterableFields.js'
import classes from './styles/Layout.module.css'

const Layout = () => {
    const isExpanded = useSelector((state) =>
        sGetUiShowExpandedLayoutPanel(state)
    )
    const isHidden = useSelector(sGetUiLayoutPanelHidden)
    const dispatch = useDispatch()
    const toggleExpanded = () =>
        dispatch(acSetShowExpandedLayoutPanel(!isExpanded))

    const ButtonIcon = isExpanded ? IconChevronUp16 : IconChevronDown16

    return (
        <div
            className={cx(classes.container, {
                [classes.hidden]: isHidden,
            })}
            data-test="layout-container"
        >
            <div
                className={cx(classes.overflowContainer, {
                    [classes.expanded]: isExpanded,
                })}
            >
                <TeiFilterableFields />
            </div>
            <button
                className={classes.button}
                onClick={toggleExpanded}
                data-test="layout-height-toggle"
            >
                <ButtonIcon color={colors.grey700} />
            </button>
        </div>
    )
}

export default Layout

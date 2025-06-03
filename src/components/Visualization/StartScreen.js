import i18n from '@dhis2/d2-i18n'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { acSetLoadError } from '../../actions/loader.js'
import { GenericError } from '../../assets/ErrorIcons.js'
import { genericErrorTitle, isVisualizationError } from '../../modules/error.js'
import { sGetLoadError } from '../../reducers/loader.js'
import styles from './styles/StartScreen.module.css'



const StartScreen = ({ error }) => {

    return (
        <div className={styles.outer}>
            <div className={styles.inner}>
                {error ? (
                    <div
                        className={styles.errorContainer}
                        data-test={'error-container'}
                    >
                        {isVisualizationError(error) ? (
                            <>
                                <div className={styles.errorIcon}>
                                    {error.icon()}
                                </div>
                                <p className={styles.errorTitle}>
                                    {error.title}
                                </p>
                                <p className={styles.errorDescription}>
                                    {error.description}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className={styles.errorIcon}>
                                    {GenericError()}
                                </div>
                                <p className={styles.errorTitle}>
                                    {genericErrorTitle}
                                </p>
                                <p className={styles.errorDescription}>
                                    {error.message || error}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className={styles.section}>
                            <h3 className={styles.title}>
                                {i18n.t('Getting started')}
                            </h3>
                            <ul className={styles.guide}>
                                <li className={styles.guideItem}>
                                    {i18n.t(
                                        'Select program and organisation unit in the left sidebar to retrive and TEIs and migrate them.'
                                    )}
                                </li>
                                <li className={styles.guideItem}>
                                    {i18n.t(
                                        'Apply necessary filters to remain with the only data you want to migrate.'
                                    )}
                                </li>
                                <li className={styles.guideItem}>
                                    {i18n.t(
                                        'Click an attribute to add or remove a filter.'
                                    )}
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

StartScreen.propTypes = {
    error: PropTypes.object,
}

const mapStateToProps = (state) => ({
    error: sGetLoadError(state),
})

const mapDispatchToProps = (dispatch) => ({
    setLoadError: (error) => dispatch(acSetLoadError(error)),
})

export default connect(mapStateToProps, mapDispatchToProps)(StartScreen)

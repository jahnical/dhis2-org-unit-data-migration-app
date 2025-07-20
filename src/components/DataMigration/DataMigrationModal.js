import { useDataEngine } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { Modal, ModalContent, ModalActions, ButtonStrip, ModalTitle, Button, CircularLoader, NoticeBox } from '@dhis2/ui';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dataActionCreators } from '../../actions/data_controls.js';
import { migrationActions } from '../../actions/migration.js';
import { dataControlSelectors } from '../../reducers/data_controls.js';
import { sGetMetadata } from '../../reducers/metadata.js';
import { migrationSelectors } from '../../reducers/migration.js';
import OrgUnitSelection from '../SearchableOrgUnitTree/OrgUnitSelection.js';

const DataMigrationModal = _ref => {
    let {
        onClose
    } = _ref;
    const [step, setStep] = useState('selection'); // selection, preview, migrating
    const [migrationProgress, setMigrationProgress] = useState({
        step: 0
    });
    const [preservedOrgUnit, setPreservedOrgUnit] = useState(null); // Store org unit when going to preview

    const dispatch = useDispatch();
    const targetOrgUnit = useSelector(migrationSelectors.getMigrationTargetOrgUnitId);
    const selectedTeis = useSelector(dataControlSelectors.getSelectedTEIs);
    const allTeis = useSelector(dataControlSelectors.getDataControlRawTEIs);
    const loading = useSelector(migrationSelectors.getMigrationIsLoading);
    const error = useSelector(migrationSelectors.getMigrationError);
    const migrationStatus = useSelector(migrationSelectors.getMigrationMigrationStatus);
    const metadata = useSelector(sGetMetadata);
    const engine = useDataEngine();

    useEffect(() => {
        // Clear target org unit when modal opens
        dispatch(migrationActions.setTargetOrgUnit(null));
        setPreservedOrgUnit(null);
    }, [dispatch]);

    console.log('targetOrgUnit value:', targetOrgUnit);

    const migrateData = async () => {
        setStep('migrating');
        setMigrationProgress({
            step: 0
        });

        // Simulating progress updates
        const updateProgress = progress => {
            setMigrationProgress(progress);
        };
        dispatch(migrationActions.migrateTEIs({
            teis: allTeis,
            selectedTeis: selectedTeis,
            targetOrgUnit: targetOrgUnit,
            targetOrgUnitName: metadata[targetOrgUnit].name,
            engine: engine,
            onProgress: updateProgress
        }));
    };

    const onCloseClicked = () => {
        if (migrationStatus === 'success') {
            dispatch(dataActionCreators.reset());
            dispatch(migrationActions.resetMigration());
        }
        onClose();
    };

    const handleNextClick = () => {
        // Store the current org unit before going to preview
        setPreservedOrgUnit(targetOrgUnit);
        setStep('preview');
    };

    const handleBackClick = () => {
        // Restore the preserved org unit when going back
        if (preservedOrgUnit) {
            dispatch(migrationActions.setTargetOrgUnit(preservedOrgUnit));
        }
        setStep('selection');
    };

    const renderPreview = () => /*#__PURE__*/React.createElement("div", {
        style: {
            padding: '16px'
        }
    }, /*#__PURE__*/React.createElement(NoticeBox, {
        title: i18n.t('Migration Preview'),
        warning: true
    }, /*#__PURE__*/React.createElement("p", null, i18n.t('You are about to migrate:')), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, i18n.t('{{count}} TEIs', {
        count: selectedTeis.length
    })), /*#__PURE__*/React.createElement("li", null, i18n.t('To {{orgUnit}}', {
        orgUnit: metadata[targetOrgUnit].displayName
    }))), /*#__PURE__*/React.createElement("p", null, i18n.t('Are you sure you want to continue?'))));

    const renderProgress = () => {
        var _migrationProgress$su, _migrationProgress$fa, _migrationProgress$su2, _migrationProgress$fa2;
        return /*#__PURE__*/React.createElement("div", {
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '16px'
            }
        }, /*#__PURE__*/React.createElement(CircularLoader, null), migrationProgress.step == 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, i18n.t("Updating Organisation Units"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, i18n.t('Transferring Ownerships {{success}} successes and {{failure}} failures of {{total}} TEIs...', {
            success: ((_migrationProgress$su = migrationProgress.successfulTeis) === null || _migrationProgress$su === void 0 ? void 0 : _migrationProgress$su.length) || 0,
            failure: ((_migrationProgress$fa = migrationProgress.failedTeis) === null || _migrationProgress$fa === void 0 ? void 0 : _migrationProgress$fa.length) || 0,
            total: migrationProgress.total
        })), /*#__PURE__*/React.createElement("div", null, Math.round(((((_migrationProgress$su2 = migrationProgress.successfulTeis) === null || _migrationProgress$su2 === void 0 ? void 0 : _migrationProgress$su2.length) || 0) + (((_migrationProgress$fa2 = migrationProgress.failedTeis) === null || _migrationProgress$fa2 === void 0 ? void 0 : _migrationProgress$fa2.length) || 0)) / migrationProgress.total * 100), "%")));
    };

    return /*#__PURE__*/React.createElement(Modal, {
        onClose: onClose,
        position: "middle",
        large: true
    }, /*#__PURE__*/React.createElement(ModalTitle, null, "Data Migration"), loading && step === 'migrating' ? /*#__PURE__*/React.createElement(ModalContent, null, renderProgress()) : error ? /*#__PURE__*/React.createElement(ModalContent, null, /*#__PURE__*/React.createElement(NoticeBox, {
        error: true,
        title: i18n.t('Could not migrate TEIs')
    }, (error === null || error === void 0 ? void 0 : error.message) || i18n.t("The TEIs couldn't be migrated. Try again or contact your system administrator."))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ModalContent, null, migrationStatus === 'success' ? /*#__PURE__*/React.createElement(NoticeBox, {
        success: true,
        title: i18n.t('Migration successful')
    }, i18n.t('All TEIs have been successfully migrated to the selected org unit.')) : step === 'selection' ? /*#__PURE__*/React.createElement("div", {
        style: {
            marginBottom: '20px'
        }
    }, /*#__PURE__*/React.createElement("h4", null, "Select Target Organisation Unit"), /*#__PURE__*/React.createElement(OrgUnitSelection, {
        isSourceOrgUnit: false
    })) : step === 'preview' ? renderPreview() : null), /*#__PURE__*/React.createElement(ModalActions, null, migrationStatus === 'success' ? /*#__PURE__*/React.createElement(ButtonStrip, null, /*#__PURE__*/React.createElement(Button, {
        secondary: true,
        onClick: onCloseClicked,
        dataTest: "data-migration-modal-confirm"
    }, i18n.t('Close'))) : /*#__PURE__*/React.createElement(ButtonStrip, null, step === 'preview' ? /*#__PURE__*/React.createElement(Button, {
        secondary: true,
        onClick: handleBackClick,
        dataTest: "data-migration-modal-back"
    }, i18n.t('Back')) : /*#__PURE__*/React.createElement(Button, {
        secondary: true,
        onClick: onCloseClicked,
        dataTest: "data-migration-modal-cancel"
    }, i18n.t('Cancel')), step === 'selection' && /*#__PURE__*/React.createElement(Button, {
        disabled: !targetOrgUnit,
        primary: true,
        onClick: handleNextClick,
        dataTest: "data-migration-modal-next"
    }, i18n.t('Next')), step === 'preview' && /*#__PURE__*/React.createElement(Button, {
        primary: true,
        onClick: migrateData,
        dataTest: "data-migration-modal-confirm"
    }, i18n.t('Confirm Migration'))))));
};

DataMigrationModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default DataMigrationModal;

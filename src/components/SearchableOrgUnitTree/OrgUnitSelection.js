import { useCachedDataQuery } from '@dhis2/analytics';
import { OrganisationUnitTree } from '@dhis2/ui';
import PropTypes from 'prop-types';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { dataActionCreators } from '../../actions/data_controls.js';
import { acAddMetadata } from '../../actions/metadata.js';
import { migrationActions } from '../../actions/migration.js';
import { migrationSelectors } from '../../reducers/migration.js';
import { acAddParentGraphMap } from '../../actions/ui.js';
import { removeLastPathSegment } from '../../modules/orgUnit.js';
import { sGetMetadata } from '../../reducers/metadata.js';
import { sGetUiParentGraphMap } from '../../reducers/ui.js';
import AsyncAutoComplete from './AsyncAutoComplete';
import { useDeepMemo } from "./useDeepMemo";
import styles from './styles/SearchableOrgUnitTree.module.css';

// Memoized tree component to prevent unnecessary rerenders
const MemoedOrganisationUnitTree = React.memo(OrganisationUnitTree);

const OrgUnitSelection = ({
                              addMetadata,
                              addParentGraphMap,
                              isSourceOrgUnit,
                              title,
                              description,
                              compact = false,
                              maxHeight,
                              showSelectedText = true,
                              selectedTextPrefix = "Selected:"
                          }) => {
    const { rootOrgUnits } = useCachedDataQuery();
    const [selected, setSelected] = useState({});
    const [expanded, setExpanded] = useState([]);
    const dispatch = useDispatch();

    // Move the useSelector hooks inside the component
    const currentTargetOrgUnit = useSelector(migrationSelectors.getMigrationTargetOrgUnitId);
    const metadata = useSelector(sGetMetadata);

    // Default titles and descriptions
    const defaultTitle = isSourceOrgUnit ? 'Select Source Organization Unit' : 'Select Target Organization Unit';
    const defaultDescription = 'Search for or browse the organization unit hierarchy below';
    const displayTitle = title || defaultTitle;
    const displayDescription = description || defaultDescription;

    // Dynamic styling based on props
    const containerClass = compact ? styles.compactWrapper : styles.innerWrapper;
    const scrollBoxClass = compact ? styles.compactScrollBox : styles.scrollBox;
    const customScrollBoxStyle = maxHeight ? { maxHeight } : {};

    const rootIds = useDeepMemo(() => rootOrgUnits.map(rootOrgUnit => rootOrgUnit.id), [rootOrgUnits]);

    // Helper function to get all parent paths from a full path
    const getAllParentPaths = useCallback(fullPath => {
        if (!fullPath) return [];
        const pathSegments = fullPath.split('/').filter(Boolean);
        const parentPaths = [];
        for (let i = 1; i < pathSegments.length; i++) {
            const parentPath = '/' + pathSegments.slice(0, i).join('/');
            parentPaths.push(parentPath);
        }
        return parentPaths;
    }, []);

    // Sync local state with Redux state changes - NOW INSIDE THE COMPONENT
    useEffect(() => {
        if (!isSourceOrgUnit && currentTargetOrgUnit && currentTargetOrgUnit !== selected.id) {
            // Target org unit was set externally (like when coming back from preview)
            const orgUnitFromRedux = metadata[currentTargetOrgUnit];
            if (orgUnitFromRedux) {
                const item = {
                    id: currentTargetOrgUnit,
                    name: orgUnitFromRedux.name,
                    displayName: orgUnitFromRedux.displayName,
                    path: orgUnitFromRedux.path || `/${currentTargetOrgUnit}`, // Fallback path
                    checked: true
                };

                setSelected(item);

                // Expand tree to show the selected item
                if (item.path) {
                    const allParentPaths = getAllParentPaths(item.path);
                    setExpanded(prev => {
                        const newExpanded = [...prev];
                        allParentPaths.forEach(parentPath => {
                            if (!newExpanded.includes(parentPath)) {
                                newExpanded.push(parentPath);
                            }
                        });
                        return newExpanded;
                    });
                }
            }
        }
    }, [currentTargetOrgUnit, isSourceOrgUnit, selected.id, metadata, getAllParentPaths]);

    // Memoize selected paths for tree component
    const selectedPaths = useMemo(() => selected.path ? [selected.path] : [], [selected.path]);

    // Function to update metadata, parent graph map, and dispatch actions
    const updateSelection = useCallback(item => {
        const forMetadata = {};
        const forParentGraphMap = {};
        forMetadata[item.id] = {
            id: item.id,
            name: item.name || item.displayName,
            displayName: item.displayName
        };
        if (item.path) {
            const path = removeLastPathSegment(item.path);
            forParentGraphMap[item.id] = path === `/${item.id}` ? '' : path.replace(/^\//, '');
        }
        addMetadata(forMetadata);
        addParentGraphMap(forParentGraphMap);
        setSelected(item);
        if (isSourceOrgUnit) {
            dispatch(dataActionCreators.setSourceOrgUnit(item.id));
        } else {
            dispatch(migrationActions.setTargetOrgUnit(item.id));
        }
    }, [addMetadata, addParentGraphMap, isSourceOrgUnit, dispatch]);

    // Handle tree selection
    const handleTreeSelection = useCallback(item => {
        if (item.checked) {
            updateSelection(item);
        }
    }, [updateSelection]);

    // Handle search selection - expand tree to show selected item
    const handleSearchSelection = useCallback(orgUnit => {
        updateSelection({
            ...orgUnit,
            checked: true
        });

        // Expand all parent paths to make the selected item visible
        if (orgUnit.path) {
            const allParentPaths = getAllParentPaths(orgUnit.path);

            // Add all parent paths to expanded array
            setExpanded(prev => {
                const newExpanded = [...prev];
                allParentPaths.forEach(parentPath => {
                    if (!newExpanded.includes(parentPath)) {
                        newExpanded.push(parentPath);
                    }
                });
                return newExpanded;
            });
        }
    }, [updateSelection, getAllParentPaths]);

    // Handle tree expansion
    const handleExpand = useCallback(({ path }) => {
        if (!expanded.includes(path)) {
            setExpanded(prev => [...prev, path]);
        }
    }, [expanded]);

    // Handle tree collapse
    const handleCollapse = useCallback(({ path }) => {
        const pathIndex = expanded.indexOf(path);
        if (pathIndex !== -1) {
            setExpanded(prev => [...prev.slice(0, pathIndex), ...prev.slice(pathIndex + 1)]);
        }
    }, [expanded]);

    // Calculate initially expanded paths based on selection
    const initiallyExpanded = useMemo(() => {
        const baseExpanded = [...(rootIds.length === 1 ? [`/${rootIds[0]}`] : []), ...expanded].filter(Boolean);
        if (selected?.path) {
            const allParentPaths = getAllParentPaths(selected.path);
            allParentPaths.forEach(parentPath => {
                if (!baseExpanded.includes(parentPath)) {
                    baseExpanded.push(parentPath);
                }
            });
        }
        return baseExpanded;
    }, [rootIds, expanded, selected?.path, getAllParentPaths]);

    return (
        <div className={containerClass}>
            {(!compact || title || description) && (
                <div className={styles.header}>
                    <h2 className={styles.headerText}>{displayTitle}</h2>
                    {displayDescription && (
                        <p className={styles.headerDescription}>{displayDescription}</p>
                    )}
                </div>
            )}
            <div className={styles.searchFilterWrapper}>
                <AsyncAutoComplete
                    orgUnitType="organisationUnits"
                    selectHandler={handleSearchSelection}
                />
            </div>
            {showSelectedText && selected.id && (
                <div className={styles.selectedOrgUnitWrapper} data-test="selected-org-unit-text">
                    <span className={styles.selectedPrefix}>{selectedTextPrefix}</span>
                    <span className={styles.selectedName}>
                        {selected.displayName || selected.name}
                    </span>
                </div>
            )}
            <div className={scrollBoxClass} style={customScrollBoxStyle}>
                <MemoedOrganisationUnitTree
                    key={selected?.id || 'default-tree'}
                    roots={rootIds}
                    selected={selectedPaths}
                    expanded={initiallyExpanded}
                    handleExpand={handleExpand}
                    handleCollapse={handleCollapse}
                    onChange={handleTreeSelection}
                    singleSelection={true}
                    dataTest="org-unit-tree"
                />
            </div>
        </div>
    );
};

OrgUnitSelection.propTypes = {
    isSourceOrgUnit: PropTypes.bool.isRequired,
    addMetadata: PropTypes.func,
    addParentGraphMap: PropTypes.func,
    title: PropTypes.string,
    description: PropTypes.string,
    compact: PropTypes.bool,
    maxHeight: PropTypes.string,
    showSelectedText: PropTypes.bool,
    selectedTextPrefix: PropTypes.string
};

OrgUnitSelection.defaultProps = {
    rootOrgUnits: [],
    showSelectedText: true,
    selectedTextPrefix: "Selected:"
};

const mapStateToProps = state => ({
    metadata: sGetMetadata(state),
    parentGraphMap: sGetUiParentGraphMap(state)
});

export default connect(mapStateToProps, {
    addMetadata: acAddMetadata,
    addParentGraphMap: acAddParentGraphMap
})(OrgUnitSelection);

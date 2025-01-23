import { Toolbar as AnalyticsToolbar } from '@dhis2/analytics'
import React from 'react'
import { AppLogo } from './AppLogo.js'
//import { InterpretationsAndDetailsToggler } from './InterpretationsAndDetailsToggler.js'
//import { MenuBar } from './MenuBar.js'

export const Toolbar = () => (
    <AnalyticsToolbar>
        <AppLogo />
    </AnalyticsToolbar>
)

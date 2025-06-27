import { InputField } from '@dhis2/ui'
import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { dataActionCreators } from '../../actions/data_controls.js'

const HSACredentialsForm = () => {
    const dispatch = useDispatch()
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
    })

    const handleInputChange = (data) => {
        const { name, value } = data
        setCredentials((prev) => ({
            ...prev,
            [name]: value,
        }))
        dispatch(dataActionCreators.setCredentials({ [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        dispatch(dataActionCreators.setCredentials(credentials))
    }

    return (
        <form onSubmit={handleSubmit}>
            <h4>HSA Credentials</h4>
            <InputField
                type="text"
                label="Username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Enter HSA username"
                required
            />
            <br />
            <InputField
                type="password"
                label="Password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Enter HSA password"
                required
            />
        </form>
    )
}

export default HSACredentialsForm

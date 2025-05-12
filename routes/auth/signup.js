const signupRouter = require('express').Router()
const config = require('../../utils/config')

signupRouter.post('/', async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body

  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  try {
    // Connect to the database
    const pool = await config.poolPromise

    // Execute the stored procedure
    const result = await pool.request()
      .input('first_name', config.sql.NVarChar(50), first_name)
      .input('last_name', config.sql.NVarChar(50), last_name)
      .input('username', config.sql.NVarChar(50), username)
      .input('email', config.sql.NVarChar(100), email)
      .input('password', config.sql.NVarChar(255), password)
      .execute('RegisterUser')

    const newUserId = result.recordset[0]?.new_user_id

    res.status(201).json({ message: 'User registered successfully.', user_id: newUserId })
  } catch (error) {
    console.error('Error during user registration:', error)
    res.status(500).json({ error: 'An error occurred while registering the user.' })
  }
})

module.exports = signupRouter
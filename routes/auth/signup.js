const signupRouter = require('express').Router()
const config = require('../../utils/config')
const bcrypt = require('bcryptjs')

signupRouter.post('/', async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body


  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.', body: req.body })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    // Connect to the database
    const pool = await config.poolPromise

    // Execute the stored procedure
    await pool.request()
      .input('first_name', config.sql.NVarChar(50), firstName)
      .input('last_name', config.sql.NVarChar(50), lastName)
      .input('username', config.sql.NVarChar(50), username)
      .input('email', config.sql.NVarChar(100), email)
      .input('password', config.sql.NVarChar(255), passwordHash)
      .execute('RegisterUser')


    res.status(201).json({ message: 'User registered successfully.' })
  } catch (error) {
    console.error('Error during user registration:', error)
    res.status(500).json({ error: 'An error occurred while registering the user.' })
  }
})

module.exports = signupRouter
const signinRouter = require('express').Router()
const config = require('../../utils/config')
const bcrypt = require('bcryptjs')

signinRouter.post('/', async (req, res) => {
  const { username, password } = req.body

  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('username', config.sql.VarChar, username)
      .query('SELECT * FROM Users WHERE username = @username')

    // Check if user exists
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const user = result.recordset[0]

    // Compare the provided password with the stored hash
    const passwordCorrect = await bcrypt.compare(password, user.password)

    if (!passwordCorrect) {
      return res.status(401).json({ error: 'password' })
    }

    // Remove password from the user object before sending to client
    delete user.password

    res.json(user)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = signinRouter

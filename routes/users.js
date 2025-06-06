const userRouter = require('express').Router()
const config = require('../utils/config')
const bcrypt = require('bcryptjs')

userRouter.get('/', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request().query('SELECT * FROM Users')
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

userRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('userId', config.sql.Int, req.params.id)
      .query('SELECT * FROM Users WHERE user_id = @userId')

    if (result.recordset.length === 0) {
      return res.status(404).send({ message: 'User not found' })
    }

    res.json(result.recordset[0])
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Update user's first name
userRouter.put('/:id/firstName', async (req, res) => {
  const { firstName } = req.body
  const userId = req.params.id

  if (!firstName) {
    return res.status(400).send({ message: 'First name is required' })
  }

  try {
    const pool = await config.poolPromise
    await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .input('firstName', config.sql.NVarChar(50), firstName)
      .query(
        'UPDATE Users SET first_name = @firstName WHERE user_id = @userId'
      )

    res.json({ message: 'First name updated successfully' })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Update user's last name
userRouter.put('/:id/lastName', async (req, res) => {
  const { lastName } = req.body
  const userId = req.params.id

  if (!lastName) {
    return res.status(400).send({ message: 'Last name is required' })
  }

  try {
    const pool = await config.poolPromise
    await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .input('lastName', config.sql.NVarChar(50), lastName)
      .query('UPDATE Users SET last_name = @lastName WHERE user_id = @userId')

    res.json({ message: 'Last name updated successfully' })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Update username
userRouter.put('/:id/username', async (req, res) => {
  const { username } = req.body
  const userId = req.params.id

  if (!username) {
    return res.status(400).send({ message: 'Username is required' })
  }

  try {
    // First check if username is already taken
    const pool = await config.poolPromise
    const checkResult = await pool
      .request()
      .input('username', config.sql.NVarChar(50), username)
      .query(
        'SELECT COUNT(*) as count FROM Users WHERE username = @username AND user_id != @userId'
      )

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).send({ message: 'Username is already taken' })
    }

    // Update username
    await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .input('username', config.sql.NVarChar(50), username)
      .query('UPDATE Users SET username = @username WHERE user_id = @userId')

    res.json({ message: 'Username updated successfully' })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Update email
userRouter.put('/:id/email', async (req, res) => {
  const { email } = req.body
  const userId = req.params.id

  if (!email) {
    return res.status(400).send({ message: 'Email is required' })
  }

  try {
    // First check if email is already taken
    const pool = await config.poolPromise
    const checkResult = await pool
      .request()
      .input('email', config.sql.NVarChar(100), email)
      .input('userId', config.sql.Int, userId)
      .query(
        'SELECT COUNT(*) as count FROM Users WHERE email = @email AND user_id != @userId'
      )

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).send({ message: 'Email is already taken' })
    }

    // Update email
    await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .input('email', config.sql.NVarChar(100), email)
      .query('UPDATE Users SET email = @email WHERE user_id = @userId')

    res.json({ message: 'Email updated successfully' })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Update password
userRouter.put('/:id/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const userId = req.params.id

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .send({ message: 'Current password and new password are required' })
  }

  try {
    const pool = await config.poolPromise

    // First verify current password
    const userResult = await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .query('SELECT password FROM Users WHERE user_id = @userId')

    if (userResult.recordset.length === 0) {
      return res.status(404).send({ message: 'User not found' })
    }

    const passwordCorrect = await bcrypt.compare(
      currentPassword,
      userResult.recordset[0].password
    )

    if (!passwordCorrect) {
      return res.status(401).send({ message: 'Current password is incorrect' })
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await pool
      .request()
      .input('userId', config.sql.Int, userId)
      .input('password', config.sql.NVarChar(255), passwordHash)
      .query('UPDATE Users SET password = @password WHERE user_id = @userId')

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = userRouter

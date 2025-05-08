const userRouter = require('express').Router()
const config = require('../utils/config')

userRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request().query('SELECT * FROM Users')
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = userRouter
const drillRouter = require('express').Router()
const config = require('../utils/config')

drillRouter.get('/', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request().query(`
        SELECT * FROM Drills;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = drillRouter
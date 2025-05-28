const drillRouter = require('express').Router()
const config = require('../utils/config')

drillRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('skillId', config.sql.Int, req.params.id).query(`
        SELECT * FROM Drills WHERE skill_id = @skillId;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

drillRouter.get('/', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request().query(`
        SELECT  d.*, s.skill_name
FROM drills d
JOIN skills s ON d.skill_id = s.skill_id;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = drillRouter

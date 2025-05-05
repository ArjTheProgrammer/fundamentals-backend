const userRouter = require('express').Router()
const config = require('../utils/config')

userRouter.get('/', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request().query(`
        SELECT 
            w.workout_name,
            d.drill_name,
            s.skill_name,
            wd.drill_order
        FROM Workout_Drills wd
        JOIN Workouts w ON wd.workout_id = w.workout_id
        JOIN Drills d ON wd.drill_id = d.drill_id
        JOIN Skills s ON d.skill_id = s.skill_id
        ORDER BY w.workout_name, wd.drill_order;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = userRouter
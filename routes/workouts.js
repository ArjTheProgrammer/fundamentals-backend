const workoutRouter = require('express').Router()
const config = require('../utils/config')

// Get all workouts for a user
workoutRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request()
      .input('userId', config.sql.Int, req.params.id)
      .query(`
        SELECT 
            *
        FROM Workouts w
        WHERE w.user_id = @userId
        AND w.workout_name IN (
          SELECT workout_name 
          FROM Workouts 
          WHERE user_id IS NULL
        )
        ORDER BY w.workout_name;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Get drills for a specific workout
workoutRouter.get('/:workoutId/drills', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request()
      .input('workoutId', config.sql.Int, req.params.workoutId)
      .query(`
        SELECT 
            d.drill_name,
            s.skill_name,
            wd.instructions,
            wd.drill_order
        FROM Workout_Drills wd
        JOIN Drills d ON wd.drill_id = d.drill_id
        JOIN Skills s ON d.skill_id = s.skill_id
        WHERE wd.workout_id = @workoutId
        ORDER BY wd.drill_order;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = workoutRouter
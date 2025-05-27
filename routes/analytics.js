const analyticsRouter = require('express').Router()
const config = require('../utils/config')

analyticsRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool.request()
      .input('userId', config.sql.Int, req.params.id)
      .query(`
        SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    SUM(CASE WHEN s.skill_name = 'Dribbling' THEN dt.completed_count ELSE 0 END) as dribbling_count,
    SUM(CASE WHEN s.skill_name = 'Passing' THEN dt.completed_count ELSE 0 END) as passing_count,
    SUM(CASE WHEN s.skill_name = 'Shooting' THEN dt.completed_count ELSE 0 END) as shooting_count,
    SUM(CASE WHEN s.skill_name = 'Rebounding' THEN dt.completed_count ELSE 0 END) as rebounding_count,
    SUM(CASE WHEN s.skill_name = 'Defense' THEN dt.completed_count ELSE 0 END) as defense_count,
    SUM(dt.completed_count) as total_practice_count
    FROM Users u
    LEFT JOIN Drill_Tracking dt ON u.user_id = dt.user_id
    LEFT JOIN Drills d ON dt.drill_id = d.drill_id
    LEFT JOIN Skills s ON d.skill_id = s.skill_id
    WHERE u.user_id = @userid
    GROUP BY u.user_id, u.first_name, u.last_name;
        `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = analyticsRouter
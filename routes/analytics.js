const analyticsRouter = require('express').Router()
const config = require('../utils/config')

analyticsRouter.get('/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('userId', config.sql.Int, req.params.id).query(`
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          SUM(CASE WHEN st.skill_id = 1 THEN st.completed_count ELSE 0 END) as dribbling_count,
          SUM(CASE WHEN st.skill_id = 2 THEN st.completed_count ELSE 0 END) as passing_count,
          SUM(CASE WHEN st.skill_id = 3 THEN st.completed_count ELSE 0 END) as shooting_count,
          SUM(CASE WHEN st.skill_id = 4 THEN st.completed_count ELSE 0 END) as rebounding_count,
          SUM(CASE WHEN st.skill_id = 5 THEN st.completed_count ELSE 0 END) as defense_count,
          SUM(st.completed_count) as total_practice_count
        FROM Users u
        LEFT JOIN Skill_Tracking st ON u.user_id = st.user_id
        WHERE u.user_id = @userId
        GROUP BY u.user_id, u.first_name, u.last_name;
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = analyticsRouter

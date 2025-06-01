const skillRouter = require('express').Router()
const config = require('../utils/config')

// Update skill tracking by incrementing completed count
skillRouter.put('/track', async (req, res) => {
  try {
    const { userId, skillId } = req.body

    if (!userId || !skillId) {
      return res
        .status(400)
        .json({ error: 'User ID and Skill ID are required' })
    }

    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('UserId', config.sql.Int, userId)
      .input('SkillId', config.sql.Int, skillId).query(`
        UPDATE Skill_Tracking
        SET completed_count = completed_count + 1
        WHERE user_id = @UserId AND skill_id = @SkillId;
        
        SELECT @@ROWCOUNT AS affected_rows;
      `)

    res.json({ message: 'Skill tracking updated successfully', data: result.recordset })
  } catch (err) {
    console.error('Error updating skill tracking:', err)
    res
      .status(500)
      .json({ error: 'An error occurred while updating skill tracking.' })
  }
})

module.exports = skillRouter

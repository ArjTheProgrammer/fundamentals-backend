const workoutRouter = require('express').Router()
const config = require('../utils/config')

// Get ready workouts for a user
workoutRouter.get('/ready/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('userId', config.sql.Int, req.params.id).query(`
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

workoutRouter.get('/own/:id', async (req, res) => {
  try {
    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('userId', config.sql.Int, req.params.id).query(`
        SELECT 
            *
        FROM Workouts w
        WHERE w.user_id = @userId
        AND w.workout_name NOT IN (
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
    const result = await pool
      .request()
      .input('workoutId', config.sql.Int, req.params.workoutId).query(`
        SELECT 
            wd.drill_id,
            s.skill_id,
            d.drill_name,
            s.skill_name,
            wd.instructions,
            d.youtube_url,
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

// Create a new workout
workoutRouter.post('/', async (req, res) => {
  try {
    const { user_id, workout_name, description, is_default } = req.body

    const pool = await config.poolPromise
    const result = await pool
      .request()
      .input('user_id', config.sql.Int, user_id)
      .input('workout_name', config.sql.VarChar, workout_name)
      .input('description', config.sql.VarChar, description)
      .input('is_default', config.sql.Bit, is_default || 0).query(`
        INSERT INTO Workouts (user_id, workout_name, is_default, description)
        OUTPUT INSERTED.workout_id, INSERTED.user_id, 
               INSERTED.workout_name, INSERTED.is_default, INSERTED.description
        VALUES (@user_id, @workout_name, @is_default, @description);
      `)

    res.status(201).json(result.recordset[0])
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

// Create a new workout with drills
workoutRouter.post('/with-drills', async (req, res) => {
  const { user_id, workout_name, description, is_default, drills } = req.body

  if (!user_id || !workout_name) {
    return res
      .status(400)
      .send({ message: 'User ID and workout name are required' })
  }

  if (!drills || !Array.isArray(drills) || drills.length === 0) {
    return res.status(400).send({ message: 'Valid drills array is required' })
  }

  const pool = await config.poolPromise
  const transaction = new config.sql.Transaction(pool)

  try {
    await transaction.begin()

    // Step 1: Create the workout
    const workoutRequest = new config.sql.Request(transaction)
    workoutRequest.input('user_id', config.sql.Int, user_id)
    workoutRequest.input('workout_name', config.sql.VarChar, workout_name)
    workoutRequest.input('description', config.sql.VarChar, description || '')
    workoutRequest.input('is_default', config.sql.Bit, is_default || 0)

    const workoutResult = await workoutRequest.query(`
      INSERT INTO Workouts (user_id, workout_name, is_default, description)
      OUTPUT INSERTED.workout_id, INSERTED.user_id, 
             INSERTED.workout_name, INSERTED.is_default, INSERTED.description
      VALUES (@user_id, @workout_name, @is_default, @description);
    `)

    const workoutId = workoutResult.recordset[0].workout_id

    // Step 2: Add all drills to the workout
    for (let i = 0; i < drills.length; i++) {
      const drill = drills[i]
      const drillRequest = new config.sql.Request(transaction)
      drillRequest.input('workout_id', config.sql.Int, workoutId)
      drillRequest.input('drill_id', config.sql.Int, drill.drill_id)
      drillRequest.input(
        'drill_order',
        config.sql.Int,
        drill.drill_order || i + 1
      )
      drillRequest.input(
        'instructions',
        config.sql.NVarChar,
        drill.instructions || ''
      )

      await drillRequest.query(`
        INSERT INTO Workout_Drills (workout_id, drill_id, drill_order, instructions)
        VALUES (@workout_id, @drill_id, @drill_order, @instructions)
      `)
    }

    await transaction.commit()

    // Return the created workout with its drills
    const response = {
      ...workoutResult.recordset[0],
      drills: drills.map((drill) => ({
        drill_id: drill.drill_id,
        drill_order: drill.drill_order,
        instructions: drill.instructions || '',
      })),
    }

    res.status(201).json(response)
  } catch (error) {
    await transaction.rollback()
    res.status(500).send({
      message: `Error creating workout with drills: ${error.message}`,
    })
  }
})

// Update workout with drills
workoutRouter.put('/:workoutId', async (req, res) => {
  const { workoutId } = req.params
  const { workout_name, description, drills } = req.body

  if (!drills || !Array.isArray(drills)) {
    return res.status(400).send({ message: 'Valid drills array is required' })
  }

  const pool = await config.poolPromise
  const transaction = new config.sql.Transaction(pool)

  try {
    await transaction.begin()

    // Step 1: Update the workout details (name, description, etc.)
    if (workout_name || description !== undefined) {
      const updateWorkoutRequest = new config.sql.Request(transaction)
      updateWorkoutRequest.input('workoutId', config.sql.Int, workoutId)

      let updateFields = []
      if (workout_name) {
        updateWorkoutRequest.input(
          'workoutName',
          config.sql.VarChar,
          workout_name
        )
        updateFields.push('workout_name = @workoutName')
      }

      if (description !== undefined) {
        updateWorkoutRequest.input(
          'description',
          config.sql.VarChar,
          description
        )
        updateFields.push('description = @description')
      }

      if (updateFields.length > 0) {
        await updateWorkoutRequest.query(`
          UPDATE Workouts 
          SET ${updateFields.join(', ')}
          WHERE workout_id = @workoutId
        `)
      }
    }

    // Step 2: Get current drills for this workout
    const currentDrillsRequest = new config.sql.Request(transaction)
    currentDrillsRequest.input('workoutId', config.sql.Int, workoutId)
    const currentDrillsResult = await currentDrillsRequest.query(`
      SELECT drill_id, instructions, drill_order
      FROM Workout_Drills
      WHERE workout_id = @workoutId
    `)

    const currentDrills = currentDrillsResult.recordset

    // Create mappings for efficient operations
    const currentDrillMap = new Map()
    currentDrills.forEach((drill) => {
      currentDrillMap.set(parseInt(drill.drill_id), drill)
    })

    const newDrillMap = new Map()
    drills.forEach((drill) => {
      newDrillMap.set(parseInt(drill.drill_id), {
        drill_id: parseInt(drill.drill_id),
        instructions: drill.instructions || '',
        drill_order: drill.drill_order,
      })
    })

    // Step 3: Determine drills to add, update, or delete
    const drillsToAdd = []
    const drillsToUpdate = []
    const drillIdsToKeep = []

    // Find drills to add or update
    newDrillMap.forEach((newDrill) => {
      const currentDrill = currentDrillMap.get(newDrill.drill_id)

      if (!currentDrill) {
        // Drill doesn't exist in the workout yet - add it
        drillsToAdd.push(newDrill)
      } else if (
        currentDrill.instructions !== newDrill.instructions ||
        currentDrill.drill_order !== newDrill.drill_order
      ) {
        // Drill exists but instructions or order changed - update it
        drillsToUpdate.push(newDrill)
      }

      drillIdsToKeep.push(newDrill.drill_id)
    })

    // Find drills to delete (in current but not in new)
    const drillsToDelete = Array.from(currentDrillMap.keys()).filter(
      (id) => !drillIdsToKeep.includes(id)
    )

    // Step 4: Execute the changes in batch operations

    // Delete drills that are no longer needed
    if (drillsToDelete.length > 0) {
      const deleteRequest = new config.sql.Request(transaction)
      deleteRequest.input('workoutId', config.sql.Int, workoutId)

      // Build the IN clause for drill_ids to delete
      const deleteParams = drillsToDelete
        .map((id, idx) => {
          const paramName = `deleteId${idx}`
          deleteRequest.input(paramName, config.sql.Int, id)
          return `@${paramName}`
        })
        .join(',')

      await deleteRequest.query(`
        DELETE FROM Workout_Drills
        WHERE workout_id = @workoutId 
        AND drill_id IN (${deleteParams})
      `)
    }

    // Update existing drills
    for (const drill of drillsToUpdate) {
      const updateRequest = new config.sql.Request(transaction)
      updateRequest.input('workoutId', config.sql.Int, workoutId)
      updateRequest.input('drillId', config.sql.Int, drill.drill_id)
      updateRequest.input(
        'instructions',
        config.sql.NVarChar,
        drill.instructions
      )
      updateRequest.input('drillOrder', config.sql.Int, drill.drill_order)

      await updateRequest.query(`
        UPDATE Workout_Drills
        SET instructions = @instructions,
            drill_order = @drillOrder
        WHERE workout_id = @workoutId
        AND drill_id = @drillId
      `)
    }

    // Add new drills
    for (const drill of drillsToAdd) {
      const addRequest = new config.sql.Request(transaction)
      addRequest.input('workoutId', config.sql.Int, workoutId)
      addRequest.input('drillId', config.sql.Int, drill.drill_id)
      addRequest.input('instructions', config.sql.NVarChar, drill.instructions)
      addRequest.input('drillOrder', config.sql.Int, drill.drill_order)

      await addRequest.query(`
        INSERT INTO Workout_Drills (workout_id, drill_id, drill_order, instructions)
        VALUES (@workoutId, @drillId, @drillOrder, @instructions)
      `)
    }

    await transaction.commit()

    // Return the full updated workout with drills
    const workoutResult = await pool
      .request()
      .input('workoutId', config.sql.Int, workoutId).query(`
        SELECT workout_id, user_id, workout_name, is_default, description
        FROM Workouts
        WHERE workout_id = @workoutId
      `)

    const drillsResult = await pool
      .request()
      .input('workoutId', config.sql.Int, workoutId).query(`
        SELECT 
          wd.drill_id,
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

    // Format response to match frontend expectations
    const response = {
      ...workoutResult.recordset[0],
      drills: drillsResult.recordset,
    }

    res.json(response)
  } catch (error) {
    await transaction.rollback()
    res.status(500).send({
      message: `Error updating workout: ${error.message}`,
    })
  }
})

module.exports = workoutRouter

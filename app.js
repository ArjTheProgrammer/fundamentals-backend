const express = require('express')
const userRouter = require('./routes/users')
const workoutRouter = require('./routes/workouts')
const drillRouter = require('./routes/drills')
const signinRouter = require('./routes/auth/signin')
const signupRouter = require('./routes/auth/signup')
const cors = require('cors')
const app = express()


app.use(cors())
app.use(express.json())

app.use('/api/signin', signinRouter)
app.use('/api/signup', signupRouter)
app.use('/api/drills', drillRouter)
app.use('/api/workouts', workoutRouter)
app.use('/api/users', userRouter)

module.exports = app
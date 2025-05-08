// const signupRouter = require('express').Router()
// const config = require('../../utils/config')

// signupRouter.post('/', async (req, res) => {
//   const { firstname, lastname, username, email, password } = req.body
//   try {
//     const pool = await config.poolPromise
//     const result = await pool.request()
//       .input('password', config.sql.VarChar, password)
//       .input('username', config.sql.VarChar, username)
//       .query(`SELECT * FROM Users
//         WHERE username = @username
//         AND password = @password`)
//     res.json(result.recordset)
//   } catch (err) {
//     res.status(500).send({ message: err.message })
//   }
// })

// module.exports = signupRouter
const socketServer = require('./modules/server')

const config = {
  port: 65432,
}

const server = socketServer()
const { startServer } = server
const serverStream = startServer(config.port)

serverStream
  .subscribe(
    ({ data, socket }) => {
      console.log(data.action,'this is action')
      console.log(socket,'this is socket')
    }
  )
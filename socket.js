const net = require('net')
const { Server } = require('uws')
const socketServer = new Server({ port: 8080 })

const client = net.createConnection({ port: 65432 }, () => {
  function onMessage(message) {
    console.log('received: ' + message);
  }
  
  socketServer.on('connection', function(socket) {
    socket.on('message', onMessage)
    client.on('data', (data) => {
      socket.send(data.toString())
    })
  })
  
  //'connect' listener
  console.log('connected to server!')
  client.write(JSON.stringify({
    data: {
      action: 'REGISTER_WORKER',
      payload: {
        register_to: ['ALL']
      }
    }
  }))
})
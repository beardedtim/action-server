const net = require('net')
const Rx = require('rxjs')
const { v4: uuid } = require('uuid')
const socketServer = require('./modules/server')
const workerService = require('./modules/workers')
const cacheService = require('./modules/cache')


const makeParser = require('./modules/parser')
const parser = makeParser()

// Utility to send messages to socket
const send = (socket, message) => socket && socket.write(parser.encode(message))

// We set up our server
const { startServer, getId, getSocket, setSocket, socketStream } = socketServer()

// Then we start the server and get a stream of sockets back
const serverStream = startServer()

// We also want to be able to handle workers in this file
const workers = workerService({
  serverStream,
  getSocket,
})

// And of course a cache
const cache = cacheService()

const { 
  workerUnRegisteration,
  workerRegisteration
} = workers

// We add every item this server sees to the log
const logSubscription = serverStream
  .subscribe(({ data, socket }) => {
    const logItem = {
      data,
      socket,
      at: Date.now()
    }

    cache.add(logItem)
  })

// We update any registered workers when we get a message
const workerUpdateSubscription = serverStream
  .subscribe(
  ({ data, socket: _id }) => {
    // Grab all of the workers for this action
    const workerIds = workers.getWorkers(data.action)

    // And for each of them
    workerIds.forEach(socketId => {
      // Get the worker socket
      const socket = getSocket(socketId)

      // Then send this message to the worker
      send(socket, ({ data, sender: _id }))
    })
  })

// We tell any worker that registered all of the past
// events that have happened before they registered
const pastEventsSubscription = workerRegisteration
  // Only if this is a REGISTER_WORKER action and
  // that action included a `get_history` value
  .filter(({ data: { get_history } }) => get_history)
  .subscribe(
    ({ data, socket: _id }) => {
      // Get the socket by the ID of the sender
      const worker = getSocket(_id)

      // Get the history of all of the actions they requested
      const history = (data.payload.register_to || [])
        // Since it's an array of arrays, we can reduce it
        .reduce((acc, key) => acc.concat(cache.get(key)), [])
      
      // Finally send the worker all of the messages
      // that you have up until that point
      send(worker, ({
        data: {
          action: 'HISTORY',
          payload: history
        }
      }))
    }
  )

// We allow workers to register to ALL events
// i.e. - shared master/duplication, WebSocket, logging
const allEventsSubscriptions = workerRegisteration
  // Only REGISTER_WORKER action types that also have `ALL` inside of their
  // registered actions
  .filter(({ data: { payload: { register_to } }}) => register_to.indexOf('ALL') >= 0)
  // Take each time that emits and return a new stream
  .flatMap(({ socket: _id }) => 
    // of all server actions
    serverStream
      // that we map to point towards the worker's ID
      .map(({ data }) => ({ data, worker: _id }))
  )
  .subscribe(
    // and for each time we get a message, let's tell the worker!
    ({ data, worker }) => send(getSocket(worker), data)
  )
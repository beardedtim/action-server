const net = require('net')
const Rx = require('rxjs')
const { v4: uuid } = require('uuid')
const socketServer = require('./modules/server')
const workerService = require('./modules/workers')

const { startServer, getId, getSocket, setSocket, socketStream } = socketServer()

const makeParser = require('./modules/parser')
const parser = makeParser()

const send = (socket, message) => socket && socket.write(parser.encode(message))

const cache = (() => {
  const history = {}

  const add = (log) => {
    const { action } = log.data
    const pastEvents = history[action] || []

    history[action] = pastEvents.concat(log)
  }

  return ({
    add,
    get: key => history[key] || []
  })
})()

const serverStream = startServer()

const workers = workerService({
  serverStream,
  getSocket,
})

const { 
  workerUnRegisteration,
  workerRegisteration
} = workers

const logSubscription = serverStream
  .subscribe(({ data, socket }) => {
    const logItem = {
      data,
      socket,
      at: Date.now()
    }

    cache.add(logItem)
  })

const workerUpdateSubscription = serverStream
  .subscribe(
  ({ data, socket: _id }) => {
    const workerIds = workers.getWorkers(data.action)

    workerIds.forEach(socketId => {
      const socket = getSocket(socketId)

      send(socket, ({ data, sender: _id }))
    })
  })

const pastEventsSubscription = workerRegisteration
  .filter(({ data: { get_history } }) => get_history)
  .subscribe(
    ({ data, socket: _id }) => {
      const worker = getSocket(_id)
      const history = (data.payload.register_to || [])
        .reduce((acc, key) => acc.concat(cache.get(key)), [])
      
      send(worker, ({
        data: {
          action: 'HISTORY',
          payload: history
        }
      }))
    }
  )

const allEventsSubscriptions = workerRegisteration
  .map(d => console.log(d) || d)
  .filter(({ data: { payload: { register_to } }}) => register_to.indexOf('ALL') >= 0)
  .flatMap(({ socket: _id }) => 
    serverStream
      .map(({ data, socket }) => ({ data, socket, worker: _id }))
  )
  .subscribe(
    ({ data, worker }) => console.log(worker,'worker') || send(getSocket(worker), data)
  )
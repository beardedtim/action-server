const net = require('net')

const Rx = require('rxjs')
const { v4: uuid } = require('uuid')

const socketServer = require('./server')
const workerService = require('./workers')
const cacheService = require('./cache')
const makeParser = require('./parser')
const { ensure } = require('./utils')
const parser = makeParser()

const send = (socket, message) => socket && socket.write(parser.encode(message))

const DEFAULT_OPTS = {
  port: 65432,
  send
}

/**
 * Creates a new server that has a cache and workers
 * 
 * @param {MasterOpts} opts - Options for creating a Master 
 * @return {Master}
 */
const makeMaster = (opts = {}) => {
  const config = ensure(DEFAULT_OPTS, opts)

  const server = socketServer()
  const { startServer, getId, getSocket, setSocket, socketStream } = server
  const serverStream = startServer(config.port)

  const workers = workerService({
    serverStream,
    getSocket,
    send
  })

  const cache = cacheService()

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

  const pastEventsSubscription = workerRegisteration
    .filter(({ data: { get_history } }) => get_history)
    .subscribe(
      ({ data, socket: _id }) => {
        const worker = getSocket(_id)

        const history = (data.payload.register_to || [])
          .reduce((acc, key) => acc.concat(cache.get(key)), [])

        config.send(worker, ({
          data: {
            action: 'HISTORY',
            payload: history
          }
        }))
      }
    )

  const allEventsSubscriptions = workerRegisteration
    .filter(({ data: { payload: { register_to } } }) => register_to.indexOf('ALL') >= 0)
    .flatMap(({ socket: _id }) =>
      serverStream
        .map(({ data }) => ({ data, worker: _id }))
    )
    .subscribe(
      ({ data, worker }) => config.send(getSocket(worker), data)
    )

  const subscriptions = [
    logSubscription,
    pastEventsSubscription,
    allEventsSubscriptions
  ]

  return ({
    stop: () => {
      subscriptions.forEach(o => o.unsubscribe())
      server.stop()
    },
    streams: {
      worker: {
        registration: workerRegisteration,
        unregistration: workerUnRegisteration
      },
      server: serverStream,
      sockets: socketStream
    },
    cache
  })
}

module.exports = makeMaster

/**
 * @typedef {Object} WorkerStreams
 * 
 * @property {Observable} registration - Stream of worker registrations
 * @property {Observable} unregistrations -Stream of workers unregistering
 */

/**
 * Our streams from Master
 * 
 * @typedef {Object} Streams - The streams returned from Master
 * @property {WorkerStreams} worker - The Worker streams object
 * @property {Observable} server - A stream of server requests
 * @property {Observable} sockets - A stream of socket messages
 */

/**
 * Our Master options
 * 
 * @typedef {Object} MasterOpts
 * @property {number} port - The port to listen on
 * @property {function(string, string): void} send - A function to send a message to a socket 
 */

/**
 * Our Master instance
 * @typedef {Object} Master
 * @property {function(): void} stop - Stops the server
 * @property {Streams} streams - Our streams from master
 */

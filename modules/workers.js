const { inspectWith } = require('./utils')
const workers = new Map()

const inspectOpts = {
  serverStream: {
    message: 'You must give `workers` a serverStream',
    valid: a => a,
  },
  getSocket: {
    message: 'You must give `workers` a way to get the streams by id',
    valid: a => typeof a === 'function'
  }
}

const inspect = inspectWith(inspectOpts)

module.exports = opts => {
  const config = inspect(opts)

  const { serverStream, getSocket } = config

  const workerRegisteration = serverStream
    .filter(({ data: { action } }) => action === 'REGISTER_WORKER')

  const workerUnRegisteration = serverStream
    .filter(({ data: { action } }) => action === 'UNREGISTER_WORKER')

  const startWorkers = () => ([
    serverStream
    .subscribe(
    ({ data, socket: _id }) => {
      const workerIds = workers.has(data.action) ? workers.get(data.action) : []

      workerIds.forEach(socketId => {
        const socket = getSocket(socketId)

        send(socket, ({ data, sender: _id }))
      })
    }),

  workerRegisteration
    .subscribe(
    ({ data, socket }) => {
      data.payload.register_to.forEach(action => {
        const oldSockets = workers.get(action) || []
        workers.set(action, oldSockets.concat(socket))
      })
    }
    ),

  workerUnRegisteration
    .subscribe(
    ({ data, socket }) => {
      data.payload.register_to.forEach(action => {
        const oldSockets = workers.get(action) || []

        workers.set(oldSockets.filter(s => s !== socket))
      })
    }
    ),
  ])

  let unsubscribeObjs = startWorkers()

  const stop = () => {
    unsubscribeObjs.forEach(obj => {
      obj.unsubscribe()
    })

    unsubscribeObjs = []
  }

  const start = () => {
    stop()
    unsubscribeObjs = startWorkers()
  }

  return ({
    getWorkers: action => workers.has(action) ? workers.get(action) : [],
    clear: () => workers.clear(),
    stop,
    start,
    workerRegisteration,
    workerUnRegisteration
  })
}
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

/**
 * Creates a worker handler instance
 * 
 * @param {WorkerOptions} opts - The options for this instance
 * @return {WorkerInstance} - An instance of these workers
 */
const makeWorkers = opts => {
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

module.exports = makeWorkers

/**
 * Our SingleOptions Object
 * 
 * @typedef {Object} SingleOpts
 * @property {string} message - The message the throw if not valid
 * @property {function(any): boolean} valid - The function to check if valid 
 */


/**
 * Our Worker Options
 * 
 * @typedef {Object<string, SingleOpts>} WorkerOptions
 */

/**
 * Our Worker Instance
 * 
 * @typedef {Object} WorkerInstance
 * @property {function(string): [string]} getWorkers - Given an action, get all attached workers
 * @property {function} clear - How we clear all workers
 * @property {function} stop - How we stop all workers
 * @property {function} start - How we re-create the instance
 * @property {Observable} workerRegistration - An observable of workers registering
 * @property {Observable} workerUnregisteration - An observable of workers unregistering
 */

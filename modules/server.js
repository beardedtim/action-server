const net = require('net')
const Rx = require('rxjs')
const { v4: uuid } = require('uuid')
const { ensure } = require('./utils')

const makeParser = require('./parser')
const parser = makeParser()

const DEFAULT_OPTS = {
  parser
}

/**
 * Server Factory
 * 
 * Creates a new net server instance returns streams
 * 
 * @param {ServerOptions} opts - Our options object
 * @return {Server} - An instance of our server
 */
const makeServer = (opts = {}) => {
  const config = ensure(DEFAULT_OPTS, opts)

  const sockets = new Map()
  const ids = new Map()

  const getSocket = id => sockets.get(id)
  const getId = socket => ids.get(socket)

  const setSocket = socket => {
    socket.setEncoding('utf8')

    const _id = uuid()
    sockets.set(_id, socket)
    ids.set(socket, _id)

    return _id
  }

  const server = net.createServer({ allowHalfOpen: true })
  const socketStream = Rx.Observable.fromEvent(server, 'connection')

  const removeSocket = socket => () => {
    const id = ids.get(socket)
    sockets.delete(id)
    ids.delete(socket)
  }
  
  const socketObservable = socket => setSocket(socket) && Rx.Observable
    .of({
      data: {
        action: 'CONNECTION',
        socket: getId(socket)
      }
    }).merge(
      Rx.Observable
        .fromEvent(socket, 'data')
        .map(config.parser.decode)
        .map(message => Object.assign({}, message, {
          socket: getId(socket),
        }))
    )
    .takeUntil(
      Rx.Observable.fromEvent(socket, 'close')
        .map(removeSocket(socket))
    )

  const startServer = (port = 65432) => server.listen(port) &&
    socketStream
      .flatMap(socketObservable)

  return ({
    startServer,
    getId,
    getSocket,
    setSocket,
    socketStream,
    stop: () => server.close()
  })
}

module.exports = makeServer

/**
 * A parser object
 * 
 * @typedef {Object} Parser
 * @property {Function} encode - Encode a message
 * @property {Function} decode - Decode a message
 */

/**
 * makeServer Options Object
 * 
 * @typedef {Object} ServerOptions
 * @property {Parser} parser
 */


/**
 * A Net Socket
 * 
 * @typedef {Object} Socket
 * 
 * @property {function(string): void} write - How we send messages to the socket
 */


/**
 * An RxJs Observable
 * 
 * @typedef {Object} Observable
 */


/**
 * Our Server Instance
 * 
 * @typedef {Object} Server
 * @property {function(number): Observable} startServer - A function that binds to the given port
 * @property {function(Object): string} getId - A function that returns the id given a socket
 * @property {function(string): Object} getSocket - A function that returns the socket given an id
 * @property {function(Socket): string} setSocket - Sets a socket into the server cache and returns the id
 * @property {Observable} socketStream - A stream of socket connections
 */

const net = require('net')
const Rx = require('rxjs')

const { ensure } = require('./utils')
const makeParser = require('./parser')
const parser = makeParser()

const DEFAULT_OPTS = {
  parser,
  port: 65432,
  host: 'localhost',
  useStdIn: true
}

const setupStdIn = (send) => {
  process.stdin.on('data', d => {
    const message = d.toString()

    send({
      data: parser.decode(message)
    })
  })
}

/**
 * Creates a Client instance
 * 
 * @param {ClientConfig} opts - Our client options
 * @return {Client}
 */
const makeClient = (opts = {}) => {
  const config = ensure(DEFAULT_OPTS, opts)

  const client = net.createConnection({ port: config.port }, () => {})

  const getData = msg => config.parser.decode(msg.toString())

  const stream = Rx.Observable
    .of({
      data: {
        action: 'CONNECTED'
      }
    })
    .merge(
      Rx.Observable
        .fromEvent(client, 'data')
        .map(getData)
        .takeUntil(
          Rx.Observable.fromEvent(client, 'error')
            .merge(
              Rx.Observable.fromEvent(client, 'close')
            )
        )
    )
  
  const send = msg => client.write(
    parser.encode(msg)
  )

  if (config.useStdIn) {
    setupStdIn(send)
  }

  return ({
    stream,
    send, 
  })
}

module.exports = makeClient

/**
 * Our config
 * 
 * @typedef {Object} ClientConfig
 * @property {number} port - The port to connect to
 * @property {Parser} parser - The parser to use for this service
 */

/**
 * Our Client instance
 * 
 * @typedef {Object} Client
 * @property {function(string): void} send - Sends a message to the server from client
 * @property {Observable} stream - An observable of responses from the server
 */
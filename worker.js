const net = require('net')
const Rx = require('rxjs')

const makeParser = require('./modules/parser')
const parser = makeParser()

// Connect to master
const client = net.createConnection({ port: 65432 })

// We are reading strings for now
client.setEncoding('utf8')

// Listen for work messages
const workerStream = Rx.Observable.fromEvent(client, 'data')
  .takeUntil(
    Rx.Observable.fromEvent(client, 'error')
      .merge(Rx.Observable.fromEvent(client, 'close'))
  )

// Register for work messages
client.write(
  parser.encode({
    data: {
      action: 'REGISTER_WORKER',
      payload: {
        register_to: ['CONNECTION']
      },
      get_history: true
    }
  })
)

workerStream.subscribe(
  msg => {
    console.log(msg)
  }
)
const net = require('net')
const Rx = require('rxjs')

const makeParser = require('./modules/parser')
const makeClient = require('./modules/client')

const { stream, send } = makeClient()

send({
  data: {
    action: 'REGISTER_WORKER',
    payload: {
      register_to: ['SOME_ACTION']
    },
    get_history: true
  }
})

stream.subscribe(
  msg => {
    console.log('worker message!')
    console.log(msg)
  }
)
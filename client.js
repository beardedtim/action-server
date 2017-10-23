const makeClient = require('./modules/client')
const makeParser = require('./modules/parser')

const config = {
  parser: makeParser(),
  port: 65432
}

const { stream, send } = makeClient()

stream
  .subscribe(
    (data) => console.log('New message!', data)
  )

send({
  data: {
    action: 'Message from the client!'
  }
})
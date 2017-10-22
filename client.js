const makeClient = require('./modules/client')

const { stream, send } = makeClient()

stream
  .subscribe(
    (data) => console.log('New message!', data)
  )
const makeClient = require('./modules/client')

const { stream, send } = makeClient()

stream
  .subscribe(
    (data) => console.log('New message!', data)
  )


// We can also register to events from the client
// and turn into a 'worker'
// send({
//   data: {
//     action: 'REGISTER_WORKER',
//     payload: {
//       register_to: ['ALL']
//     }
//   }
// })
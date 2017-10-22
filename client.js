const net = require('net')

const makeParser = require('./modules/parser')
const parser = makeParser()


const client = net.createConnection({ port: 65432 }, () => {
  //'connect' listener
  console.log('connected to server!')
  client.write(parser.encode({
    data: {
      type: 'SOME_ACTION'
    }
  }))
})

client.on('data', (data) => {
  console.log(parser.decode(data.toString()));
})

process.stdin.on('data', d => {
  const message = d.toString()
  client.write(parser.encode({
    data: parser.decode(message)
  }))
})
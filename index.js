const masterService = require('./modules/master')

const master = masterService()

master
  .streams
  .server
  .subscribe(
    data => console.log(data,'data from server!')
  )
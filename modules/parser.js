const DEFAULT_OPTS = {
  encoder: msg => JSON.stringify(msg),
  decoder: msg => JSON.parse(msg)
}

module.exports = (opts) => {
  const config = Object.assign({}, DEFAULT_OPTS, opts)

  return ({
    encode: config.encoder,
    decode: config.decoder
  })
}
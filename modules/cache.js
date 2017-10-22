/**
 * Returns a new cache instance
 * 
 * @return {Cache}
 */
const createCache = () => {
  const history = {}

  const add = (log) => {
    const { action } = log.data
    const pastEvents = history[action] || []

    history[action] = pastEvents.concat(log)
  }

  return ({
    add,
    get: key => history[key]
  })
}

module.exports = createCache

/**
 * A cache instance
 * 
 * @typedef {Object} Cache
 * @property {function(Object): void} add - How we add to the log
 * @property {function(string): Array<Object>} get - How we get the history of an action
 */
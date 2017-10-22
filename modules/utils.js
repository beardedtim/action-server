/**
 * Ensures the returned object has at least the defautls
 * 
 * @param {Object} defaults - An object of default values 
 * @param {Object} obj - The input object that may or may not have values 
 */
const ensure = (defaults, obj) => Object.assign({}, defaults, obj)

/**
 * Our inspection object
 * 
 * @typedef {Object} InspectionObject
 * @property {string} message - The message to throw
 * @property {function(a: *): boolean} valid - Function to validate
 */

/**
 * Our inspection schema
 * 
 * @typedef {Object<string, InspectionObject>} InspectionSchema
 */


/**
 * Makes sure the incoming object passes inspection
 * with regards to opts
 * 
 * @param {InspectionSchema} opts - Our configuration object
 * @return {function(Object): Object} - A function that takes an object and returns the object or throws 
 */
const inspectWith = opts => obj => {
  for(let key in opts) {
    const isValid = () => opts[key].valid(obj[key])
    if (!(key in obj) || !isValid()) {
      console.log('uh oh')
      throw new Error(opts.message)
    }
  }

  return obj
}

module.exports = {
  ensure,
  inspectWith
}
const express = require('express')
const router = express.Router()

class Router {
    
  constructor(router) {
    this.router = router
    this.actions = {}
    this.prefix = ''
  }
  get = (...args) => {
    const params = this.getParams(args)
    return this.router.get(...params)
  }
  post = (...args) => {
    const params = this.getParams(args)
    return this.router.post(...params)
  }

  getAction = action => {
    if (this.actions[action]) {
      console.log('CACHED controller: ' + action)
      return this.actions[action]
    }
    let [controllerName, method] = action.split('@')
    if (!method) {
      method = '_invoke'
    }
    const controller = require('@pages/' + controllerName)
    console.log(
      'REQUIRING controller: ' + controllerName + ', method: ' + method
    )
    return (this.actions[action] = controller[method])
  }

  getParams = args => {
    if (typeof prefix !== 'undefined') {
      console.log(prefix)
    }
    const path = this.prefix + args.shift()
    const action = args.pop()
    return [path, ...args, this.getAction(action)]
  }

  setPrefix = (prefix, callback) => {
    this.prefix = prefix
    callback()
  }
}

module.exports = new Router(router)
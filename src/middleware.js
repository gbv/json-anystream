const { make } = require("./anystream")

/**
 * Middleware for POST requests to add a `anystream` property to the request object.
 * That `anystream` property will be a stream that only emits JSON objects, no matter what the input was.
 *
 * If the query parameter `url` is given, data will be loaded from that URL. Optionally the `type` parameter can be provided as well (one of multipart, json, ndjson). If no `url` is given, the input data of the request will be used.
 *
 * Can either be used as a middleware directly, or it can be called with a single parameter representing an adjustment method first:
 * ```js
 *  // either
 *  app.use(anystream.addStream)
 *  // or
 *  app.use(anystream.addStream(object => { return object }))
 * ```
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function addStream(...params) {
  let adjust
  if (params.length <= 1) {
    adjust = params[0]
    return _addStream
  } else {
    return _addStream(...params)
  }
  function _addStream(req, res, next) {
    let { url, type } = req.query, input
    if (!url) {
      input = req
      if (req.is("multipart")) {
        type = "multipart"
      } else if (req.is("json")) {
        type = "json"
      } else if (req.is("application/x-ndjson")) {
        type = "ndjson"
      }
    } else {
      input = url
    }

    if (!url && !type) {
      // TODO: Proper error
      req.anystream = null
      next()
    } else {
      make(input, type, adjust).then(stream => {
        req.anystream = stream
        next()
      }).catch(() => {
        // TODO: Proper error handling
        req.anystream = null
        next()
      })
    }
  }
}

module.exports = {
  addStream,
}

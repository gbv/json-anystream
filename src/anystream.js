const Busboy = require("busboy")
const ndjson = require("ndjson")
const { parser } = require("stream-json")
const StreamAnyObject = require("./StreamAnyObject")
const ObjectFilterTransform = require("./ObjectFilterTransform")
const errors = require("./errors")
// Used for reading files
const fs = require("fs")
// Used for consuming URLs
const http = require("http")
const https = require("https")

/**
 * This is a workaround for the case that we only attach data handlers on the next tick, which would cause the stream to continue and we'd lose events.
 *
 * If this is wrapped around a stream and its piped result, it will wait until another handler is attached to the piped result.
 *
 * Usage: `let newStream = waitForNextHandler(stream, stream.pipe(someTransform)); await someAsyncThing(); newStream.on("data", dataHandler)`
 *
 * @param {stream} originalStream original Readable stream
 * @param {stream} newStream new stream after piping into Transfors
 */
function waitForNextHandler(originalStream, newStream) {
  originalStream.pause()
  const superOn = newStream.on
  newStream.on = function (eventName) {
    // Support for data (.on("data", ...)) and read (e.g. for async (let data of stream) { ... })
    if (["data", "readable"].includes(eventName)) {
      originalStream.resume()
    }
    return superOn.apply(this, arguments)
  }
  return newStream
}

/**
 * Function that converts an existing stream to a JSON element stream.
 *
 * The resulting stream will emit single elements (usually objects, but can be other types if the input was a JSON array) via the `data` event.
 * If the input was a single JSON object, it will be assembled as a whole. Then, the `isSingleObject` event will be emitted, the assembled object will be emitted via `data`, and the stream ends (`end`).
 *
 * For multipart data, the file needs to be in the field `data` and has to end either in `.json` or `.ndjson`. The content type is ignored.
 *
 * @param {stream} stream existing stream object
 * @param {string} type one of multipart, json, ndjson
 * @param {Function} adjust optional adjustment method through which all objects are adjusted
 */
async function convert(stream, type, adjust) {
  switch (type) {
    case "multipart":
      // Handle multipart stream via busboy
      return await new Promise((resolve, reject) => {
        // Here we are assuming that "stream" refers to the request object
        const busboy = new Busboy({ headers: stream.headers })
        busboy.on("file", (fieldname, file, filename) => {
          // Only use fieldname `data`
          if (fieldname == "data") {
            if (filename.endsWith(".ndjson")) {
              resolve(waitForNextHandler(file, file.pipe(ndjson.parse()).pipe(new ObjectFilterTransform({ adjust }))))
            } else if (filename.endsWith(".json")) {
              resolve(waitForNextHandler(file, file.pipe(parser()).pipe(new StreamAnyObject({ adjust }))))
            } else {
              file.resume()
              reject(new errors.InvalidOrMissingDataFieldError("multipart/form-data requires a file in field `data` with a file ending of either .json or .ndjson."))
            }
          } else {
            file.resume()
          }
        })
        busboy.on("finish", function () {
          reject(new errors.InvalidOrMissingDataFieldError("multipart/form-data requires a file in field `data`"))
        })
        stream.pipe(busboy)
      })
    case "json":
      // Handle JSON via stream-json and custom streamer above
      return waitForNextHandler(stream, stream.pipe(parser()).pipe(new StreamAnyObject({ adjust })))
    case "ndjson":
      // Handle NDJSON via ndjson module
      return waitForNextHandler(stream, stream.pipe(ndjson.parse()).pipe(new ObjectFilterTransform({ adjust })))
    default:
      throw new errors.MissingTypeError()
  }
}

/**
 * A function that takes an existing read stream or a file path or a URL, and returns a JSON element stream via `convert`.
 *
 * @param {stream|string} input either an existing input stream supported by `convert`, or a string containing a file path or URL
 * @param {string} type optional type which is necessary for an input stream and might be necessary for URLs if they don't contain a file ending or content type
 * @param {Function} adjust optional adjustment method through which all objects are adjusted
 */
async function make(input, type, adjust) {
  if (typeof input === "string") {
    if (input.endsWith(".json")) {
      type = type || "json"
    }
    if (input.endsWith(".ndjson")) {
      type = type || "ndjson"
    }
    if (input.startsWith("http://") || input.startsWith("https://")) {
      const isHttps = input.startsWith("https://")
      // Handle input as URL
      return (new Promise((resolve, reject) => {
        (isHttps ? https : http).get(input, (res) => {
          // Check status code
          if (res.statusCode !== 200) {
            const error = new errors.UrlRequestError(`Requesting data from URL ${input} failed; status code ${res.statusCode}`)
            error.statusCode = res.statusCode
            reject(error)
            return
          }
          // Check content type and adjust `type` if possible
          const contentType = res.headers["content-type"]
          if (/^application\/json/.test(contentType)) {
            type = "json"
          }
          if (/^application\/x-ndjson/.test(contentType)) {
            type = "ndjson"
          }
          resolve(convert(res, type, adjust))
        })
      }))
    } else {
      // Handle input as file
      return convert(fs.createReadStream(input, "utf-8"), type, adjust)
    }
  } else {
    return convert(input, type, adjust)
  }
}

module.exports = {
  convert,
  make,
}

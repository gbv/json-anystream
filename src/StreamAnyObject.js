/**
 * Streamer for stream-json that streams objects or arrays.
 * - If it's an object: Only a single value (the full assembled object) will be emitted.
 * - If it's an array: Values of the array will be emitted.
 *
 * The code is basically combining StreamArray and StreamObject and adjusted to our needs.
 */
module.exports = class StreamAnyObject extends require("stream-json/streamers/StreamBase") {

  constructor(options) {
    super(options)
    this._level = 1
  }

  _wait(chunk, _, callback) {
    if (chunk.name === "startObject") {
      this._lastKey = null
      // We're assembling the object in this._object
      this._object = {}
    } else if (chunk.name === "startArray") {
      this._counter = 0
    } else {
      return callback(new Error("Top-level object should be an array or object."))
    }
    this._transform = this._filter
    return this._transform(chunk, _, callback)
  }

  _push(discard) {
    if (this._object) {
      // Object in this._object
      if (this._lastKey === null) {
        this._lastKey = this._assembler.key
      } else {
        if (!discard) {
          // Assemble object from keys and values
          this._object[this._lastKey] = this._assembler.current[this._lastKey]
        }
        this._assembler.current = {}
        this._lastKey = null
      }
    } else {
      // Otherwise we're streaming an array
      if (this._assembler.current.length) {
        this._counter += 1
        if (discard) {
          this._assembler.current.pop()
        } else {
          // Push array values directly
          const value = this._assembler.current.pop()
          if (value && typeof value === "object") {
            this.push(value)
          } else {
            this.emit("error", new Error(`Unexpected non-object: ${value}`))
          }
        }
      }
    }
  }

  _flush(callback) {
    // Push single object before end of stream
    this._object && this.emit("isSingleObject")
    this._object && this.push(this._object)
    callback()
  }
}

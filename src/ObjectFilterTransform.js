const { Transform } = require("stream")

module.exports = class ObjectFilterTransform extends Transform {
  constructor(options = {}) {
    options.objectMode = true
    super(options)
  }
  _transform(value, _, callback) {
    if (value && typeof value === "object") {
      this.push(value)
    } else {
      this.emit("error", new Error(`Unexpected non-object: ${value}`))
    }
    callback()
  }
}

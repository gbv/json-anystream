const { Transform } = require("stream")
const errors = require("./errors")

module.exports = class ObjectFilterTransform extends Transform {
  constructor(options = {}) {
    options.objectMode = true
    super(options)
  }
  _transform(value, _, callback) {
    if (value && typeof value === "object") {
      this.push(value)
    } else {
      this.emit("error", new errors.UnexpectedNonObjectValueError())
    }
    callback()
  }
}

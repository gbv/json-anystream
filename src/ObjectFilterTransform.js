import { Transform } from "node:stream"
import * as errors from "./errors.js"

export default class ObjectFilterTransform extends Transform {
  constructor({ adjust, ...options } = {}) {
    options.objectMode = true
    super(options)
    this.adjust = adjust || (object => object)
  }
  _transform(value, _, callback) {
    if (value && typeof value === "object") {
      this.push(this.adjust(value))
    } else {
      this.emit("error", new errors.UnexpectedNonObjectValueError())
    }
    callback()
  }
}

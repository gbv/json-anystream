import assert from "node:assert"
import * as anystream from "../src/index.js"

const properties = [
  "make",
  "convert",
  "addStream",
  "MissingTypeError",
  "InvalidOrMissingDataFieldError",
  "UrlRequestError",
  "UnexpectedNonObjectValueError",
  "StreamAnyObject",
]

describe("index.js", () => {
  for (const property of properties) {
    it(`should export property ${property}`, () => {
      assert(!!anystream[property], `Property ${property} is not exported by index.js.`)
    })
  }
})

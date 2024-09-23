import assert from "node:assert"

import StreamAnyObject from "../../src/StreamAnyObject.js"
import streamJson from "stream-json"
const parser = streamJson.parser

// Use stream.Readable to create streams from JSON objects
import { Readable } from "node:stream"

import fs from "node:fs"
const tests = JSON.parse(fs.readFileSync("./test/src/test-cases.json"))
import * as errors from "../../src/errors.js"

describe("StreamAnyObject", () => {

  for (let test of tests) {
    const isArray = Array.isArray(test)
    const testString = JSON.stringify(test)
    it("should pass test for " + testString, (done) => {
      let hasReceivedIsSingleObject = false
      let index = 0
      const inputStream = Readable.from(testString)
      const stream = inputStream.pipe(parser()).pipe(new StreamAnyObject())
      stream.on("data", object => {
        if (isArray) {
          assert.deepStrictEqual(object, test[index])
          index += 1
        } else {
          assert.deepStrictEqual(object, test)
        }
      })
      stream.on("error", (error) => {
        const toCheck = isArray ? test[index] : test
        if (typeof toCheck !== "object" || !toCheck) {
          assert(error instanceof errors.UnexpectedNonObjectValueError)
          done()
        } else {
          assert.fail("got error when none was expected")
        }
      })
      stream.on("isSingleObject", () => {
        hasReceivedIsSingleObject = true
      })
      stream.on("end", () => {
        assert.strictEqual(hasReceivedIsSingleObject, !isArray)
        if (isArray) {
          assert.strictEqual(index, test.length)
        }
        done()
      })
      stream.on("test", () => console.log("test"))
    })
  }

})

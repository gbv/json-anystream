// TODO: Tests for functions exported by anystream.js

// for multipart data tests, use https://www.npmjs.com/package/form-data

const assert = require("assert")

const { convert } = require("../../src/anystream")

// Use stream.Readable to create streams from JSON objects
const { Readable } = require("stream")

describe("convert", () => {
  // Note that when we're using Readable and we don't immediately attach event handlers (which we can't because `convert` returns a Promise), we are getting undefined behavior. To work around this, we pause after calling `convert` and then resume after we attached the event handlers.
  const tests = [
    { object: true },
    [
      { arrayWithOne: "object" },
    ],
    [
      { array: 1 },
      { of: "1" },
      { objects: null },
    ],
  ]
  for (let ndjson of [false, true]) {
    for (let test of tests) {
      const isObject = !Array.isArray(test)
      if (isObject && ndjson) {
        continue
      }
      const testString = ndjson ? test.map(object => JSON.stringify(object)).join("\n") : JSON.stringify(test)
      it(`should pass test for ${testString} ${ndjson ? "(ndjson)" : ""}`, (done) => {
        let hasReceivedIsSingleObject = false
        let index = 0
        const inputStream = Readable.from(testString)
        const stream = convert(inputStream, ndjson ? "ndjson" : "json")
        inputStream.pause()
        stream.then((stream) => {
          stream.on("data", object => {
            if (isObject) {
              assert.deepStrictEqual(object, test)
            } else {
              assert.deepStrictEqual(object, test[index])
              index += 1
            }
          })
          stream.on("error", () => {
            assert.fail("got error when none was expected")
          })
          stream.on("isSingleObject", () => {
            hasReceivedIsSingleObject = true
          })
          stream.on("end", () => {
            assert.strictEqual(hasReceivedIsSingleObject, isObject)
            if (!isObject) {
              assert.strictEqual(index, test.length)
            }
            done()
          })
          inputStream.resume()
        })
      })
    }
  }
})

describe("make", () => {
  // For make, test input as URL or file only
})

const assert = require("assert")

const StreamAnyObject = require("../../src/StreamAnyObject")
const { parser } = require("stream-json")

// Use stream.Readable to create streams from JSON objects
const { Readable } = require("stream")

const tests = require("./test-cases.json")

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
      stream.on("error", () => {
        const toCheck = isArray ? test[index] : test
        if (typeof toCheck !== "object" || !toCheck) {
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

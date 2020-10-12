const assert = require("assert")

const StreamAnyObject = require("../../src/StreamAnyObject")
const { parser } = require("stream-json")

// Use stream.Readable to create streams from JSON objects
const { Readable } = require("stream")

const tests = [
  {
    a: 1,
  },
  {
    with: {
      deep: {
        property: 2,
      },
    },
  },
  [
    {
      a: 1,
    },
    {
      a: 2,
    },
  ],
  null,
  "test",
  false,
  2,
]

describe("StreamAnyObject", () => {

  for (let test of tests) {
    const isObject = !Array.isArray(test)
    const expectError = typeof test !== "object" || !test
    const testString = JSON.stringify(test)
    it("should pass test for " + testString, (done) => {
      let hasReceivedIsSingleObject = false
      let index = 0
      const inputStream = Readable.from(testString)
      const stream = inputStream.pipe(parser()).pipe(new StreamAnyObject())
      stream.on("data", object => {
        if (isObject) {
          assert.deepStrictEqual(object, test)
        } else {
          assert.deepStrictEqual(object, test[index])
          index += 1
        }
      })
      stream.on("error", () => {
        if (expectError) {
          done()
        } else {
          assert.fail("got error when none was expected")
        }
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
      stream.on("test", () => console.log("test"))
    })
  }

})

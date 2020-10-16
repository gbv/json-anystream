// TODO: Tests for functions exported by anystream.js

// for multipart data tests, use https://www.npmjs.com/package/form-data

const assert = require("assert")

const { convert } = require("../../src/anystream")

// Use stream.Readable to create streams from JSON objects
const { Readable } = require("stream")

const FormData = require("form-data")

describe("convert", () => {

  const tests = require("./test-cases.json")
  // Run all tests as normal stream/form-data as well as json/ndjson
  for (let multipart of [false, true]) {
    for (let ndjson of [false, true]) {
      for (let test of tests) {
        const isArray = Array.isArray(test)
        if (!isArray && ndjson) {
          continue
        }
        const testString = ndjson ? test.map(object => JSON.stringify(object)).join("\n") : JSON.stringify(test)
        it(`should pass test for ${testString} ${ndjson ? "(ndjson)" : ""}${multipart ? "(form-data)" : ""}`, (done) => {
          let hasReceivedIsSingleObject = false
          let index = 0
          let inputStream = Readable.from(testString)
          if (multipart) {
            const form = new FormData()
            form.append("data", inputStream, {
              filename: `test.${ndjson ? "ndjson" : "json"}`,
            })
            // Add HTTP headers for Busboy
            form.headers = form.getHeaders()
            inputStream = form
          }
          const stream = convert(inputStream, multipart ? "multipart" : (ndjson ? "ndjson" : "json"))
          stream.then((stream) => {
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
              // Note: For ndjson, a `null` value simply stops the stream
              if (isArray && (!ndjson || !test.includes(null))) {
                assert.strictEqual(index, test.length)
              }
              done()
            })
          })
        })
      }
    }
  }

  it("should fail for multipart request if data field is not given", async () => {
    const form = new FormData()
    form.headers = form.getHeaders()
    let stream
    try {
      stream = await convert(form, "multipart")
    } catch (error) {
      stream = null
    }
    stream && assert.fail("expected stream conversion to fail")
  })

})

describe("make", () => {
  // For make, test input as URL or file only
})

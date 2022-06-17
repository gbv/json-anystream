// TODO: Tests for functions exported by anystream.js

// for multipart data tests, use https://www.npmjs.com/package/form-data

const assert = require("assert")

const { make, convert } = require("../../src/anystream")

// Use stream.Readable to create streams from JSON objects
const { Readable } = require("stream")

const FormData = require("form-data")
const nock = require("nock")
const fs = require("fs")
const errors = require("../../src/errors")

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
          let inputStream
          if (testString) {
            inputStream = Readable.from(testString)
          } else {
            // Node.js 10: Create an empty stream and end it immediately
            inputStream = new Readable({ read() { } })
            inputStream.push(null)
          }
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
    // Add some random data in a different field
    form.append("notdata", Readable.from(""), {})
    form.headers = form.getHeaders()
    let stream
    try {
      stream = await convert(form, "multipart")
    } catch (error) {
      assert(error instanceof errors.InvalidOrMissingDataFieldError)
      stream = null
    }
    stream && assert.fail("expected stream conversion to fail")
  })

  it("should fail for multipart request if data field contains filename that doesn't end on json/ndjson", async () => {
    const form = new FormData()
    // Add some random data in a different field
    form.append("data", Readable.from("{}"), {
      filename: "test.txt",
    })
    form.headers = form.getHeaders()
    let stream
    try {
      stream = await convert(form, "multipart")
    } catch (error) {
      assert(error instanceof errors.InvalidOrMissingDataFieldError)
      stream = null
    }
    stream && assert.fail("expected stream conversion to fail")
  })

})

describe("make", () => {

  const hostname = "http://example.com"
  const path = "/"
  const url = `${hostname}${path}`

  for (let ndjson of [false, true]) {
    for (let data of [
      { a: 1 },
      [
        { a: 1 },
      ],
    ]) {
      const isArray = Array.isArray(data)
      if (!isArray && ndjson) {
        continue
      }
      it("should pass test for URL", async () => {
        const dataAsString = ndjson ? data.map(o => JSON.stringify(o)).join("\n") : JSON.stringify(data)
        const scope = nock(hostname)
          .get(path)
          .reply(200, dataAsString, {
            "Content-Type": `application/${ndjson ? "x-ndjson" : "json"}`,
          })
        let index = 0
        const stream = await make(url)
        for await (let object of stream) {
          if (isArray) {
            assert.deepStrictEqual(object, data[index])
          } else {
            assert(index == 0)
            assert.deepStrictEqual(object, data)
          }
          index += 1
        }
        assert(scope.isDone())
      })

    }
  }

  it("should read JSON from file", async () => {
    const file = __dirname + "/test.json"
    const stream = await make(file)
    const data = JSON.parse(fs.readFileSync(file, "utf-8"))
    let index = 0
    for await (let object of stream) {
      assert.deepStrictEqual(object, data[index])
      index += 1
    }
  })

  it("should read NDJSON from file", async () => {
    const file = __dirname + "/test.ndjson"
    const stream = await make(file)
    const data = fs.readFileSync(file, "utf-8").split("\n").filter(o => o).map(o => JSON.parse(o))
    let index = 0
    for await (let object of stream) {
      assert.deepStrictEqual(object, data[index])
      index += 1
    }
  })

})

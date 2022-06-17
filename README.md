# json-anystream

![Tests](https://github.com/gbv/json-anystream/workflows/Test/badge.svg)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/json-anystream.svg?label=version)](https://github.com/gbv/json-anystream)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Takes any stream that provides JSON objects (array of objects or single object) or newline delimited JSON objects (NDJSON) and turns it into a JSON objects emitting stream.

This module is motivated by a need to read a set of JSON objects, which can be given in different forms. The module

- provide a stream that emits single JSON objects via the `data` event.
- supports JSON objects, JSON arrays of objects, NDJSON, as well as mutlipart/form-data with a file containing one of those.
- supports reading from local files (using `fs`). Content type is determined via file ending.
- supports reading from URLs (using `http`/`https`). Content type is determined via Content-Type header or file ending.
- provides an express middleware that wraps the above functionality and adds the stream as `res.anystream`.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Install](#install)
- [Usage](#usage)
  - [Import](#import)
  - [`anystream.make`](#anystreammake)
  - [`anystream.convert`](#anystreamconvert)
  - [`anystream.StreamAnyObject`](#anystreamstreamanyobject)
  - [`anystream.addStream`](#anystreamaddstream)
- [Errors](#errors)
- [Maintainers](#maintainers)
- [Publish](#publish)
- [Contribute](#contribute)
- [License](#license)

## Install
```bash
npm i json-anystream
```

## Usage

### Import
```js
const anystream = require("json-anystream")
```

### `anystream.make`
`async function make(input, type, adjust)`

Takes an `input` (URL, file path, or existing stream) and makes a JSON object stream out of it. `type` can have one of the values "json", "ndjson", or "multipart", and is optional if the type can be inferred from the file ending or content type header. `adjust` is an optional adjustment method that is called for each object in the resulting stream before it is emitted.

Example:
```js
const stream = await anystream.make("https://example.com/test.json")
stream.on("data", object => {
  // object contains single JSON objects
})
stream.on("end", () => {
  // stream is done
})
stream.on("error", error => {
  // an error occurred, see below for error types
})
```

You can also use for async:
```js
const stream = await anystream.make("https://example.com/api/test") // assuming content type header is set
for await (let object of stream) {
  // object contains single JSON objects
}
```

For existing streams, `anystream.make` as simply a wrapper over `anystream.convert`. For URLs, `http.get` or `https.get` are used and the resulting stream is wrapped by `anystream.convert`. For files, `fs.createReadStream` is used and the resulting stream is wrapped by `anystream.convert`.

### `anystream.convert`
`async function convert(stream, type, adjust)`

Takes an existing stream and returns a JSON object stream. The `type` parameter is required and is determined by the data of the stream:
- `json`: Any JSON stream (single object or array of object) that is compatible with [stream-json](https://www.npmjs.com/package/stream-json).
- `ndjson`: Any stream of JSON objects compatible with [ndjson](https://www.npmjs.com/package/ndjson).
- `multipart`: A request object containing `multipart/form-data` data that contains the field `data` with a compatible .json or .ndjson file ([busboy](https://www.npmjs.com/package/busboy) is used for parsing the form data).

 `adjust` is an optional adjustment method that is called for each object in the resulting stream before it is emitted.

### `anystream.StreamAnyObject`
A custom streamer for [stream-json](https://www.npmjs.com/package/stream-json) that takes a stream of either a single JSON object or an array of JSON objects and transforms it into a stream that emits only JSON objects. I.e. if the input stream contains a single JSON object, that object is assembled and then emitted as a whole, if the input stream contains an array of JSON objects, the objects are emitted as direct JSON objects.

```js
const { parser } = require("stream-json")
const pipeline = stream.pipe(parser()).pipe(new anystream.StreamAnyObject())
pipeline.on("data", object => {
  // ...
})
pipeline.on("end", () => {
  // ...
})
```

There is also a custom event in case the input was in fact a single JSON object:
```js
pipeline.on("isSingleObject", () => {
  // if this event is called, the input stream contained a single object and NOT an array of objects
})
```

The constructur takes an options objects that can optionally contain a `adjust` method that is called for each object in the resulting stream before it is emitted.

### `anystream.addStream`
A middleware for [express](https://www.npmjs.com/package/express) that provides the result of `anystream.make` as `req.anystream`. The input can be one of the following:
- A compatible data stream directly via POST data.
- A `multipart/form-data` request containing a .json or .ndjson file in the field `data`.
- A URL provided by the query parameter `url`.

An additional query parameter `type`, containing one of "multipart", "json", or "ndjson", may be provided if the type can't be inferred.

```js
const express = require("express")
const app = express()
const anystream = require("json-anystream")
app.use((req, res, next) => {
  if (req.method == "POST") {
    // For POST requests, parse body with json-anystream middleware -> provides req.anystream property
    anystream.addStream(req, res, next)
  } else {
    // For all other requests, parse as JSON -> provides req.body property
    express.json()(req, res, next)
  }
})
```

`anystream.addStream` can also be called with an adjustment method first which is then forwarded into `anystream.make` (see above):
```js
anystream.addStream(object => {
  // Adjust object
  return object
})(req, res, next)
```

## Errors
`json-anystream` defines some custom errors:

- `MissingTypeError` - thrown when the `type` parameter is omitted and the type could not be inferred
- `InvalidOrMissingDataFieldError` - thrown for multipart/form-data when the required `data` field is missing or doesn't contain a .json or .ndjson file
- `UrlRequestError` - thrown when the input is a URL and there's an error during the request
- `UnexpectedNonObjectValueError` - thrown by the stream (i.e. for `on("error")`) when the stream did not contain a valid JSON object or array of objects; note that it is possible that this error is thrown after some values were already emitted in case that one of the later elements in an array is not an object

## Maintainers
- [@stefandesu](https://github.com/stefandesu)

## Publish
To publish a new version on npm after committing your changes, make sure you committed/merged all your changes to `main` successfully and then run:

```bash
npm run release:patch
# or for minor release:
# npm run release:minor
# or for major release:
# npm run release:major
```

A new version will be published to npm automatically via GitHub Actions.

## Contribute
PRs accepted. Please make sure the tests complete with your change. Add new tests if applicable.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT Copyright (c) 2022 Verbundzentrale des GBV (VZG)

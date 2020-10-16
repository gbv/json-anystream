
class MissingTypeError extends Error {
  constructor(message) {
    message = message || "The `type` argument (string with value multipart, json, or ndjson) is required."
    super(message)
  }
}

class InvalidOrMissingDataFieldError extends Error { }

class UrlRequestError extends Error { }

class UnexpectedNonObjectValueError extends Error {
  constructor(message) {
    message = message || "Data array contained a value that is not an object."
    super(message)
  }
}

module.exports = {
  MissingTypeError,
  InvalidOrMissingDataFieldError,
  UrlRequestError,
  UnexpectedNonObjectValueError,
}

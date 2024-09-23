
export class MissingTypeError extends Error {
  constructor(message) {
    message = message || "The `type` argument (string with value multipart, json, or ndjson) is required."
    super(message)
  }
}

export class InvalidOrMissingDataFieldError extends Error { }

export class UrlRequestError extends Error { }

export class UnexpectedNonObjectValueError extends Error {
  constructor(message) {
    message = message || "Data array contained a value that is not an object."
    super(message)
  }
}

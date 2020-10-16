module.exports = Object.assign(
  {
    StreamAnyObject: require("./src/StreamAnyObject"),
  },
  require("./src/anystream"),
  require("./src/middleware"),
  require("./src/errors"),
)

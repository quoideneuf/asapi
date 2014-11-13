var winston = require('winston');

module.exports = function() {
  return new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: 'debug' })
    ]
  });
};

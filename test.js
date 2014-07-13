
var Api = require('./index.js')
var api = new Api({backend_url:'http://localhost:4567'})

exports.ping = function(test) {
  test.expect(1);

  api.ping(function(err, json) {
    test.ok(json.archivesSpaceVersion);
    test.done();
  });
}

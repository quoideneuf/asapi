
var Api = require('./index.js')
var api = new Api({
  url:'http://localhost:4567',
  active_repo: 2
})

exports.setUp = function(cb) {
  api.login({user:'admin',password:'admin'}, function() {
    cb();
  });
}


exports.ping = function(test) {
  test.expect(1);

  api.ping(function(err, json) {
    test.ok(json.archivesSpaceVersion);
    test.done();
  });
};


exports.createRepo = function(test) {
  test.expect(1);

  var repo = {
    repo_code: Math.random().toString(36).substring(7),
    name: Math.random().toString(36).substring(7)
  };

  api.createRepository(repo, function(err, json) {
    test.ok(json.uri);
    test.done();
  });
};


exports.createLocation = function(test) {
  test.expect(1);

  var loc = {
    building: "Taj Mahal",
    classification: "Palace"
  };

  api.createLocation(loc, function(err, json) {
    test.ok(json.uri);
    test.done();
  });
};


exports.createClassification = function(test) {
  test.expect(1);

  var rec = {
    identifier: Math.random().toString(36).substring(7),
    title: Math.random().toString(36).substring(7)
  };

  api.createClassification(rec, function(err, json) {
    test.ok(json.uri);
    test.done();
  });
};


exports.createAccession = function(test) {
  test.expect(1);

  var rec = {
    id_0: Math.random().toString(36).substring(7),
    title: Math.random().toString(36).substring(7),
    accession_date: "2001-01-01"
  };

  api.createAccession(rec, function(err, json) {
    test.ok(json.uri);
    test.done();
  });
};

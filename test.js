var fs = require('fs');

var Api = require('./index.js')
var api = new Api({
  url:'http://localhost:8089',
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


exports.createResource = function(test) {
  test.expect(1);

  var rec = {
    id_0: Math.random().toString(36).substring(7),
    title: Math.random().toString(36).substring(7),
    level: "collection",
    extents: [{number: "1",
               portion: "whole",
               extent_type: "linear_feet"}]
  };

  api.createResource(rec, function(err, json) {
    test.ok(json.uri);
    test.done();
  });
};


exports.createJobError = function(test) {
  test.expect(1);

  var job = {
    import_type: 'ead_xml',
    files: [ 'no-such-file.xml' ]
  };

  api.createJob(job, function(err, json) {
    test.equal(err.name, "Error");
    test.done();
  });
}


exports.createJob = {
  setUp: function(cb) {
    fs.writeFileSync("test-ead.xml", "<ead></ead>");
    cb();
  },

  tearDown: function(cb) {
    fs.unlinkSync("test-ead.xml");
    cb();
  },


  createJob: function(test) {
    test.expect(1);

    var job = {
      import_type: 'ead_xml',
      filenames: [ 'test-ead.xml' ],
      files: [ 'test-ead.xml' ]
    };

    api.createJob(job, function(err, json) {
      test.ok(json.uri);
      test.done();
    });
  }
};

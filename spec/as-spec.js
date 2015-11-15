var fs = require('fs');

var nock = require('nock');
var Q = require('q');

var fx = require('./fixtures.js');

var ASUrl = 'http://localhost:4567';

var As = require('../index.js');
var as = new As({
  url: ASUrl,
  active_repo: 2,
  promiseFactory: function() {
    var d = Q.defer();

    return {
      resolve: d.resolve,
      reject: d.reject,
      promise: d.promise
    }
  },
  connectionTimeout: 1500
});


function login(cb) {
  as.login({user:'admin',password:'admin'}, function() {
    cb();
  });
}

describe("As", function() {

  beforeEach(function(done) {
    login(function() {
      done();
    });
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe("error handling", function() {
    it('produces an ArchivesSpaceServerError if the server returns a 404', function(done) {
      var scope = nock(ASUrl).get('/').reply(404);

      as.ping().then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {
        expect(error.name).toEqual('ArchivesSpaceServerError');
        expect(error.code).toEqual(404);
        done();
      });
    });

    it('puts the response body in the error message', function(done) {
      var scope = nock(ASUrl).get('/').reply(404, "My advice to you is to do what your parents did - get a job, sir");

       as.ping().then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {

        expect(error.name).toEqual('ArchivesSpaceServerError');
        expect(error.message).toMatch(/advice/);
        done();
      });
    });


    it('passes other errors through as is', function(done) {
      var scope = nock(ASUrl).get('/').replyWithError("uh oh");

      as.ping().then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {
        expect(error.name).toEqual('Error');
        expect(error.message).toEqual("uh oh");
        done();
      });
    });

    it('handles connection timeout', function(done) {
      var scope = nock(ASUrl).get('/').delayConnection(2000).reply(200, JSON.stringify({version: "oof"}));

      as.ping().then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {
        expect(error.name).toEqual('Error');
        expect(error.message).toEqual("ETIMEDOUT");
        done();
      });
    });


    it('handles bad logins', function(done) {
      as.login({user:'admin', password:'notmypassword'}).then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {
        expect(error.name).toEqual('ArchivesSpaceServerError');
        expect(error.code).toEqual(403);
        done();
      });
    });
  });


  describe(".ping", function() {

    it("can be used with a callback", function(done) {
      as.ping(function(err, json) {
        expect(json.archivesSpaceVersion).toMatch(/v?\d+[\.|-]\d+/);
        done();
      });
    });

    it("returns a promise", function(done) {
      as.ping().then(function(json) {
        expect(json.archivesSpaceVersion).toMatch(/v?\d+[\.|-]\d+/);
        done();
      });
    });

    // it('emits an archivesSpaceServerError event if the server returns a 404', function(done) {
    //   var scope = nock(ASUrl).get('/').reply(404);

    //   as.once('archivesSpaceServerError', function(err) {
    //     expect(err.code).toEqual(404);
    //     done();
    //   });

    //   as.ping();
    // });
  });

  describe(".get", function() {

    it("can write options into the url string", function(done) {
      var scope = nock(ASUrl).get('/search?type[]=resource&page=1').reply(200, JSON.stringify({first_page: 1, last_page: 0, this_page: 1, results: [], total_hits: 0}));

      as.get('/search', {type: ['resource'], page: 1}).then(function(json) {
        expect(json.total_hits).toEqual(0);
        done();
      });
    });
  });

  describe(".createRepository", function() {

    describe('callback signature', function() {

      it("should pass the created repository object to the callback", function(done) {
        var scope = nock(ASUrl).post('/repositories').reply(200, JSON.stringify({"status":"Created","id":99,"lock_version":0,"stale":null,"uri":"/repositories/99","warnings":[]}));

        as.createRepository(fx.repo(), function(err, json) {
          expect(json.uri).toMatch(/repositories\/99/);
          done();
        });
      });
    });


    describe('promise signature', function() {

      it("should return a promise", function(done) {
        var scope = nock(ASUrl).post('/repositories').reply(200, JSON.stringify({"status":"Created","id":99,"lock_version":0,"stale":null,"uri":"/repositories/99","warnings":[]}));

        as.createRepository(fx.repo()).then(function(json) {
          expect(json.uri).toMatch(/repositories\/99/);
          done();
        });
      });

      it('should reject with an error if AS barfs', function(done) {
        var scope = nock(ASUrl).post('/repositories').reply(400, JSON.stringify({"error":{"repo_code":["Property is required but was missing"]},"warning":null,"invalid_object":"#<JSONModel(:repository) {\"name\"=>\"dfdsf\", \"jsonmodel_type\"=>\"repository\"}>"}));

        as.createRepository(fx.repo()).catch(function(err) {
          expect(err.name).toEqual("ArchivesSpaceServerError");
          expect(err.code).toEqual(400)
          done();
        });
      });
    });
  });


  describe('.createClassification', function() {

    describe('callback signature', function() {

      it('should pass the created classification object to the callback', function(done) {
        as.createClassification(fx.classification(), function(err, json) {
          expect(json.uri).toMatch(/classifications\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createClassification(fx.classification()).then(function(json) {
          expect(json.uri).toMatch(/classifications\/\d/);
          done();
        })
      });
    });
  }); // /.createClassification


  describe('.createLocation', function() {

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createLocation(fx.location(), function(err, json) {
          expect(json.uri).toMatch(/locations\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createLocation(fx.location()).then(function(json) {
          expect(json.uri).toMatch(/locations\/\d/);
          done();
        });
      });
    });
  }); // /.createLocation


  describe('.createAccession', function() {

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createAccession(fx.accession(), function(err, json) {
          expect(json.uri).toMatch(/accessions\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createAccession(fx.accession()).then(function(json) {
          expect(json.uri).toMatch(/accessions\/\d/);
          done();
        });
      });
    });
  }); // /.createAccession


  describe('.createResource', function() {

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createResource(fx.resource(), function(err, json) {
          expect(json.uri).toMatch(/resources\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createResource(fx.resource()).then(function(json) {
          expect(json.uri).toMatch(/resources\/\d/);
          done();
        });
      });
    });
  }); // /.createResource


  describe('.createDigitalObject', function() {

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createDigitalObject(fx.digital_object(), function(err, json) {
          expect(json.uri).toMatch(/digital_objects\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createDigitalObject(fx.digital_object()).then(function(json) {
          expect(json.uri).toMatch(/digital_objects\/\d/);
          done();
        });
      });
    });
  }); // /.createDigitalObject


  xdescribe('.createJob', function() {

    beforeEach(function(done) {
      fs.writeFileSync("test-ead.xml", "<ead></ead>");
      job = {
        import_type: 'ead_xml',
        filenames: [ 'test-ead.xml' ],
        files: [ 'test-ead.xml' ]
      };

      done();

    });

    afterEach(function(done) {
      fs.unlinkSync("test-ead.xml");
      done();
    });


    it('handles an error', function(done) {
      var job = {
        import_type: 'ead_xml',
        files: [ 'no-such-file.xml' ]
      };

      as.createJob(job).catch(function(err) {
        expect(err.message).toEqual('File ' + job.files[0] + ' does not exist');
        done();
      });
    });

    describe('callback signature', function() {

      it('is a job creator', function(done) {
        as.createJob(job, function(err, json) {
          expect(json.uri).toMatch(/jobs\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("is a job creator", function(done) {
        var p = as.createJob(job);
        p.then(function(json) {
          expect(json.uri).toMatch(/jobs\/\d/);
          done();
        });
      });
    });
  }); // /.createJob

  describe('.updateRecord', function() {
    beforeEach(function(done) {
      vals = {}
      as.createAccession(fx.accession()).then(function(json) {
        vals.uri = json.uri;
        vals.title = json.title;
        vals.lock_version = json.lock_version;
        done();
      });
    });

    it('updates a json object and returns the updated object', function(done) {
      var newVals = fx.accession();
      newVals.uri = vals.uri;
      newVals.lock_version = vals.lock_version;

      as.updateRecord(newVals).then(function(json) {
        expect(json.uri).toEqual(vals.uri);
        expect(json.lock_version).toEqual(1);
        done();
      })
    });
  });


  describe('.getResources', function() {

    it('returns a page worth of resources as an object', function(done) {
      var scope = nock(ASUrl).get('/repositories/2/resources?page=2').reply(200, fx.mockGetResources(2,3));

      as.getResources({page: 2}, function(err, response) {
        console.log(response);
        expect(response.this_page).toEqual(2);
        expect(response.last_page).toEqual(3);
        expect(response.results.length).toEqual(10);
        done();
      });
    });
  });


  describe('.eachResource', function() {

    it('iterates over the collection of resources', function(done) {
      nock(ASUrl).get('/repositories/2/resources?page=1').reply(200, fx.mockGetResources(1,2));
      nock(ASUrl).get('/repositories/2/resources?page=2').reply(200, fx.mockGetResources(2,2));
      var count = 0;

      as.eachResource(function(err, resource) {
        if(resource.id_0.length) count++
      })

      setTimeout(function() {
        expect(count).toEqual(20);
        done();
      }, 500);
    });

    it('bubbles an error if there\'s a problem with the request', function(done) {
      nock(ASUrl).get('/repositories/2/resources?page=1').reply(403);

      as.eachResource(function(err, resource) {
        expect(err.name).toEqual("ArchivesSpaceServerError");
        expect(err.code).toEqual(403);
        done();
      });
    });
  });

}); // /describe As

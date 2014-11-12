var fs = require('fs');

var nock = require('nock');
var Q = require('q');

var ASUrl = 'http://localhost:8089';

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
  }
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

  describe(".ping", function() {

    it("can be used with a callback", function(done) {
      as.ping(function(err, json) {
        expect(json.archivesSpaceVersion).toMatch(/v\d\.\d/);
        done();
      });
    });

    it("returns a promise", function(done) {
      as.ping().then(function(json) {
        expect(json.archivesSpaceVersion).toMatch(/v\d\.\d/);
        done();
      });
    });

    it('produces an ASpaceError if the server returns a 404', function(done) {
      var scope = nock(ASUrl).get('/').reply(404);

      as.ping().then(function(response) {
        expect(true).toBe(false);
        done();
      }).catch(function(error) {
        expect(error.name).toEqual('ArchivesSpace Error 404');
        nock.cleanAll();
        done();        
      });
    });
  });


  xdescribe(".createRepository", function() {
    beforeEach(function() {
      randomRepo = function() {
        return {
          repo_code: Math.random().toString(36).substring(7),
          name: Math.random().toString(36).substring(7)
          };
      }
    });

    beforeEach(function(done) {
      login(function() {
        done();
      });
    });

    describe('callback signature', function() {

      it("should pass the created repository object to the callback", function(done) {
        as.createRepository(randomRepo(), function(err, json) {
          expect(json.uri).toMatch(/repositories\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createRepository(randomRepo()).then(function(json) {
          expect(json.uri).toMatch(/repositories\/\d/);
          done();
        });
      });
    });
  });


  describe('.createClassification', function() {

    beforeEach(function() {
      randomClass = function() {
        return {
          identifier: Math.random().toString(36).substring(7),
          title: Math.random().toString(36).substring(7)
        };
      };
    });

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createClassification(randomClass(), function(err, json) {
          expect(json.uri).toMatch(/classifications\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createClassification(randomClass()).then(function(json) {
          expect(json.uri).toMatch(/classifications\/\d/);
          done();
        }).catch(function(err) {
          console.log("ERR");
        });
      });
    });
  }); // /.createClassification


  describe('.createLocation', function() {
    beforeEach(function() {
      randomLoc = function() {
        return {
          building: Math.random().toString(36).substring(7),
          classification: Math.random().toString(36).substring(7)
        };
      }
    });

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createLocation(randomLoc(), function(err, json) {
          expect(json.uri).toMatch(/locations\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createLocation(randomLoc()).then(function(json) {
          expect(json.uri).toMatch(/locations\/\d/);
          done();
        });
      });
    });
  }); // /.createLocation


  describe('.createAccession', function() {
    beforeEach(function() {
      randomAcc = function() {
        return {
          id_0: Math.random().toString(36).substring(7),
          title: Math.random().toString(36).substring(7),
          accession_date: "2001-01-01"
        };
      }
    });

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createAccession(randomAcc(), function(err, json) {
          expect(json.uri).toMatch(/accessions\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createAccession(randomAcc()).then(function(json) {
          expect(json.uri).toMatch(/accessions\/\d/);
          done();
        });
      });
    });
  }); // /.createAccession


  describe('.createResource', function() {
    beforeEach(function() {
      randomRes = function() {
        return {
          id_0: Math.random().toString(36).substring(7),
          title: Math.random().toString(36).substring(7),
          level: "collection",
          extents: [{number: "1",
                     portion: "whole",
                     extent_type: "linear_feet"}]
        };
      }
    });

    describe('callback signature', function() {

      it('should pass the created location object to the callback', function(done) {
        as.createResource(randomRes(), function(err, json) {
          expect(json.uri).toMatch(/resources\/\d/);
          done();
        });
      });
    });

    describe('promise signature', function() {

      it("should return a promise", function(done) {
        as.createResource(randomRes()).then(function(json) {
          expect(json.uri).toMatch(/resources\/\d/);
          done();
        });
      });
    });
  }); // /.createResource


  describe('.createJob', function() {

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


    xit('handles an error', function(done) {
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
          console.log(json);
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




}); // /describe As





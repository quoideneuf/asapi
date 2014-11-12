var fs = require('fs');
var path = require('path');
var winston = require('winston');

var request = require('request');
var FormData = require('form-data');
var EventEmitter = require('events').EventEmitter;

function Api(opts) {
  opts = opts || {};
  var session = opts.session;
  var backend_url = opts.url;
  var active_repo = opts.active_repo;
  var logger = opts.logger;
  var emitter = opts.emitter;
  var promiseFactory = opts.promiseFactory

  var that = this;


  if (typeof(logger) == 'undefined') {
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({ level: 'debug' })
      ]
    });
  }


  if (typeof(emitter) == 'undefined') {
    emitter = new EventEmitter();
  }


  this.ping = function(callback) {
    return doGet("/", {}, callback);
  }


  this.nuke = function(callback) {
    doDelete("/", function(err, json) {

      if (err) {
        logger.debug("Error " + err);
      } else {
        logger.debug(JSON.stringify(json));
      }

      callback(err, json);
    });
  }


  this.login = function(opts, callback) {

    var form = {form: {password: opts.password}};

    request.post(backend_url + "/users/" + opts.user + "/login", form, function(err, response, body) {
      if (response.statusCode == 403) {
        var err = "Unauthorized";
      }

      json = JSON.parse(body);
      session = json.session;

      if (callback) callback(err, session);
    });
  };


  this.hasSession = function() {
    if (session) {
      return true;
    } else {
      return false;
    }
  };


  this.download = function(uri, streamWriter) {
    downloadStream(uri, streamWriter);
  }


  this.get = function(uri, opts, callback) {
    if (typeof(opts) == 'function') {
      callback = opts;
      opts = {};
    }

    doGet(uri, opts, callback);
  }


  this.getJobs = function(opts, callback) {
    doGet("/repositories/:repo_id/jobs?page=" + opts.page, {}, function(err, json) {
      callback(err, json);
    });
  };


  this.getJobError = function(job_id, callback) {
    doGetRaw("/repositories/:repo_id/jobs/" + job_id + "/log", function(err, res, body) {
      if (res.statusCode == 200) {
        var importError = parseError(body);
        callback(null, importError);
      }
    });
  };


  this.getUpdates = function(last_sequence, callback) {
    if (typeof(last_sequence) === 'function') {
      callback = last_sequence;
      last_sequence = 0;
    }

    this.get("/update-feed?last_sequence=" + last_sequence, callback);
  };


  this.getNotifications = function(last_sequence, callback) {
    if (typeof(last_sequence) === 'function') {
      callback = last_sequence;
      last_sequence = 0;
    }

    this.get("/notifications?last_sequence=" + last_sequence, callback);
  };


  this.getRepositories = function(callback) {
    doGet("/repositories", {}, function(err, json) {
      callback(err, json);
    });
  };


  this.getResources = function(callback, page) {
    if (typeof(page) == 'undefined') {
      page = 1;
    }

    doGet("/repositories/:repo_id/resources?page=" + page, {}, function(err, json) {
      callback(err, json);

      if (!err && json.last_page > page) {
        that.getResources(callback, page + 1)
      }
    });
  };


  this.eachResource = function(callback) {
    that.getResources(function(err, json) {
      if (err) {
        logger.info("Unable to get Resource records due to error.");
      } else {
        for (var i = 0; i < json.results.length; i++) {
          callback(json.results[i]);
        }
      }
    });
  };


  this.updateRecord = function(rec, callback) {
    doPost(rec.uri, rec, function(err, body) {
      if (err) {
        logger.debug("Error updating " + rec.uri);
      } else {
        logger.debug("Updated " + rec.uri);
      }
      callback(err, rec.uri);
    });
  };


  this.createJob = function(job, callback) {
    var d = promiseFactory();

    for (var i = 0; i < job.files.length; i++) {
      if (!fs.existsSync(job.files[i])) {
        var err = new Error("File " + job.files[i] + " does not exist");
        d.reject(err);
        if (callback) callback(err);
        return d.promise;
      }
    };

    var form = new FormData();
    form.append('job', JSON.stringify(job));
    for (var i=0; i < job.files.length; i++) {
      var filepath = job.files[i];
      form.append('files[' + i + ']', fs.createReadStream(filepath));
    }


    doPostForm("/repositories/:repo_id/jobs", form, function(err, json) {
      if (!err && json.status != 'Created') {
        err = "Job Status error: " + json.status;
      }

      if (err) {
        d.reject(err);
      } else {
        d.resolve(json);
      }

      if (callback) callback(err, json);
    });

    return d.promise;
  };


  this.createRepository = function(obj, callback) {
    return doPost("/repositories", obj, callback);
  };


  this.createLocation = function(obj, callback) {
    return doPost("/locations", obj, callback);
  };


  this.createClassification = function(obj, callback) {
    return doPost("/repositories/:repo_id/classifications", obj, callback);
  };


  this.createAccession = function(obj, callback) {
    return doPost("/repositories/:repo_id/accessions", obj, callback);
  };


  this.createResource = function(obj, callback) {
    return doPost("/repositories/:repo_id/resources", obj, callback);
  };


  this.createDigitalObject = function(obj, callback) {
    doPost("/repositories/:repo_id/digital_objects", obj, function(err, json) {
      callback(err, json);
    });
  };


  this.on = function(event, callback) {
    emitter.on(event, callback);
  }


  function setSession(new_session) {
    session = new_session;
  };


  function resolvePath(path) {
    if (active_repo) {
      path = path.replace(":repo_id", active_repo);
    }

    return path;
  };


  function getASHost() {
    if (typeof(backend_url) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backend_url.replace(/https?:\/\//, "").replace(/:\d+$/, "");
  };


  function getASPort() {
    if (typeof(backend_url) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backend_url.replace(/.*:/, "");
  };


  function expand(path) {
    path = resolvePath(path);

    if (typeof(backend_url) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backend_url + path;
  }


  function serverError(code, body) {
    var err = new Error(body);
    err.code = code;
    return err;
  }


  function downloadStream(uri, streamWriter) {
    var opts = {
      url: expand(uri),
      headers: {}
    };

    if (session) {
      opts.headers['X-ArchivesSpace-Session'] = session;
    }

    request.get(opts).pipe(streamWriter);
  }


  function doGetRaw(uri, callback) {

    var opts = {
      url: expand(uri),
      headers: {}
    };

    if (session) {
      opts.headers['X-ArchivesSpace-Session'] = session;
    }


    request(opts, function(err, res, body) {

      if (!err && res.statusCode != 200) {
        logger.debug("Making ASpaceError object");
        err = new ASpaceError(res.statusCode, body);
      }

      console.log(err);

      if (err) {
        logger.debug("serverError: " + err.name);
      } else {
        logger.debug("ArchivesSpace Response: " + res.statusCode + " : " + JSON.stringify(body));
      }

      callback(err, res, body);
    });

  };

  // get JSON
  function doGet(uri, opts, callback) {

    var d = promiseFactory();    
    var json;

    if (Object.keys(opts).length > 0) {
      uri += "?"
      for (i=0; i < Object.keys(opts).length; i++){
        uri += Object.keys(opts)[i];
        uri += "="
        uri += opts[Object.keys(opts)[i]];
        if (i < Object.keys(opts).length - 1) uri += "&";
      }
    }

    doGetRaw(uri, function(err, res, body) {

      console.log(err);
      if (res && res.statusCode == 200) {
        json = JSON.parse(body);
      }

      if (err) d.reject(err);
      else d.resolve(json);


      if (callback) callback(err, json);
    });

    return d.promise;
  };


  function doDelete(path, callback) {
    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    request.del(opts, function(err, res, body) {

      logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));

      if (!err && res.statusCode != 200) {
        serverError(res.statusCode, body.error);
      }

      callback(err, body);
    });
  };


  function doPost(path, obj, callback) {

    var d = promiseFactory();
    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      },
      json: obj
    };

    logger.debug("Posting" + JSON.stringify(opts));

    request.post(opts, function(err, res, body) {

      logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));

      if (!err && res.statusCode != 200) {
        logger.debug("Making ASpaceError object");
        err = new ASpaceError(res.statusCode, body);
      }

      if (err) d.reject(err);
      else d.resolve(body);

      if (callback) callback(err, body);
    });

    return d.promise;
  };


  function doPostForm(path, form, callback) {

    var opts = {
      host: getASHost(),
      port: getASPort(),
      path: resolvePath(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    form.submit(opts, function(err, res) {
      res.on('data', function(data) {
        var job = JSON.parse(data);
        callback(err, job);
      });

    });
  }


  function parseError(body) {

    var results = [];
    var loginfo = body.split(/=+\n/).map(function(s) { return s.replace(/\\n/g, ''); });

    while (loginfo[0].length < 1 && loginfo.length > 0) {
      loginfo.shift();
    }

    while (loginfo.length > 1) {
      var filename = loginfo.shift();
      var match = loginfo.shift().match(/Error:.*/);

      if (match) {
        results.push(filename + " -> " + match[0]);
      } else {
        results.push(filename + " (appears ok)");
      }
    }

    return results.join("\n");
  }


  function ASpaceError(code, response) {
    this.name = "ArchivesSpace Error " + code;
    this.message = response.error;
  }

  ASpaceError.prototype = new Error();
  ASpaceError.prototype.constructor = ASpaceError;
}

module.exports = Api;

var fs = require('fs');
var path = require('path');
var winston = require('winston');

var request = require('request');
var FormData = require('form-data');

function Api(opts) {
  opts = opts || {};
  var session = opts.session;
  var backend_url = opts.url;
  var active_repo = opts.active_repo;
  var logger = opts.logger;


  if (typeof(logger) == 'undefined') {
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({ level: 'debug' })
      ]
    });
  }

  logger.info("Backend url: " + backend_url);

  this.ping = function(callback) {
    doGet("/", function(err, json) {
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
      callback(err, json.session);
      session = json.session;
    });
  };


  this.hasSession = function() {
    if (session) {
      return true;
    } else {
      return false;
    }
  };


  this.get = function(uri, callback) {
    doGet(uri, callback);
  }


  this.getJobs = function(opts, callback) {
    doGet("/repositories/:repo_id/jobs?page=" + opts.page, function(err, json) {
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


  this.getRepositories = function(callback) {
    doGet("/repositories", function(err, json) {
      callback(err, json);
    });
  };


  this.createJob = function(job, callback) {
    var form = new FormData();
    form.append('job', JSON.stringify(job));
    job.files.each_with_index(function(filepath, i) {
      form.append('files[' + i + ']', fs.createReadStream(filepath));
    });

    doPostForm("/repositories/:repo_id/jobs", form, function(err, json) {
      if (!err && json.status != 'Created') {
        err = "Job Status error: " + json.status;
      }
      callback(err, json);
    });
  };


  this.createRepository = function(obj, callback) {
    doPost("/repositories", obj, function(err, json) {
      callback(err, json);
    });
  };


  this.createLocation = function(obj, callback) {
    doPost("/locations", obj, function(err, json) {
      callback(err, json);
    });
  };


  this.createClassification = function(obj, callback) {
    doPost("/repositories/:repo_id/classifications", obj, function(err, json) {
      callback(err, json);
    });
  };


  this.createAccession = function(obj, callback) {
    doPost("/repositories/:repo_id/accessions", obj, function(err, json) {
      callback(err, json);
    });
  };


  this.createDigitalObject = function(obj, callback) {
    doPost("/repositories/:repo_id/digital_objects", obj, function(err, json) {
      callback(err, json);
    });
  };


  function setSession(new_session) {
    session = new_session;
  };


  function expand(path) {

    if (active_repo) {
      path = path.replace(":repo_id", active_repo);
    }

    console.log(backend_url);

    if (typeof(backend_url) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backend_url + path;
  }

  function serverError(code, body) {
    var err = code + ": " + body;
    throw err;
  }


  function doGetRaw(uri, callback) {

    var opts = {
      url: expand(uri),
      headers: {}
    };

    if (session) {
      opts.headers['X-ArchivesSpace-Session'] = session;
    }

    logger.debug(opts);

    request(opts, function(err, res, body) {
      if (err) {
        logger.debug("Error: " + err);
      } else if (!err && res.statusCode != 200) {
        serverError(res.statusCode, body);
      } else {
        logger.debug("ArchivesSpace Response: " + res.statusCode + " : " + JSON.stringify(body));
      }

      callback(err, res, body);
    });

  };

  // get JSON
  function doGet(uri, callback) {

    var json;

    doGetRaw(uri, function(err, res, body) {
      if (res.statusCode == 200) {
        json = JSON.parse(body);
      }
      callback(err, json);
    });
  };


  function doPost(path, obj, callback) {

    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      },
      json: obj
    };

    logger.debug(opts.json);


    request.post(opts, function(err, res, body) {

      logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));

      if (!err && res.statusCode != 200) {
        serverError(res.statusCode, body.error);
      }

      callback(err, body);

    });

  };


  function doPostForm(path, form, callback) {
    

    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    form.getLength(function(err, length) {
      if (err) throw err;

      var r = request.post(opts, function(err, res, body) {
        logger.debug("ASpace Response: " + res.statusCode + " : " + body);

        json = JSON.parse(body);
        callback(err, json);
      });

      r._form = form;
      r.setHeader('content-length', length);
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

  };


}



module.exports = Api;

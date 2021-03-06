var request = require('./lib/request');

var formDataFactory = require('./lib/form-data-factory.js');
var fileLoader = require('./lib/file-loader.js');
var loggerFactory = require('./lib/log-factory.js');

function Api(opts) {
  opts = opts || {};
  var session = opts.session;
  var backendUrl = opts.url;
  var activeRepo = opts.activeRepo || opts.active_repo;
  var logger = opts.logger;
  var promiseFactory = opts.promiseFactory
  var requestInterface = opts.requestInterface;
  var connectionTimeout = opts.connectionTimeout || 7200;

  var that = this;


  if (typeof(requestInterface) != 'undefined') {
    request = requestInterface;
  }


  if (typeof(logger) === 'undefined') {
    logger = loggerFactory();
  }


  if (typeof(promiseFactory) === 'undefined') {
    promiseFactory = function() {
      return {
        resolve: function(){
        },
        reject: function(){
        },
        promise: {
          then: function(){
            throw new Error("Called 'then' on stubbed Promise");
          },
          catch: function(){
            throw new Error("Called 'catch' on stubbed Promise");
          }
        }
      }
    }
  }


  this.ping = function(callback) {
    return doGet("/", {}, callback);
  }

  // Requires aspace_eraser plugin
  this.nuke = function(callback) {
    return doDelete("/", callback);
  }


  this.login = function(opts, callback) {
    var formOpts = {password: opts.password};
    var loginUrl = backendUrl + "/users/" + opts.user + "/login";

    return requestRequest('post', {url: loginUrl, form: formOpts}, function(err, body) {

      if (!err) {
        session = body.session;
      }

      if (callback) callback(err, session);
    });
  };

  this.logout = function() {
    setSession(undefined);
  }

  this.hasSession = function() {
    if (session) {
      return true;
    } else {
      return false;
    }
  };


  this.getRepo = function() {
    return activeRepo;
  };


  this.setRepo = function(id) {
    activeRepo = id;
  };


  this.download = function(uri, streamWriter) {
    downloadStream(uri, streamWriter);
  };


  this.get = function(uri, opts, callback) {
    if (typeof(opts) == 'function') {
      callback = opts;
      opts = {};
    }

    return doGet(uri, opts, callback);
  };


  this.post = function(uri, obj, callback) {
    return doPost(uri, obj, callback);
  };


  this.del = function(uri, callback) {
    return doDelete(uri, callback);
  };

  this.getJobs = function(opts, callback) {
    var opts = opts || {};
    var page = opts.page || 1;
    return doGet("/repositories/:repo_id/jobs?page=" + page, {}, callback);
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
    return doGet("/repositories", {}, callback);
  };


  this.getResources = function(opts, callback) {
    if (typeof(opts) === 'function') {
      callback = opts;
      opts = {};
    }

    var page = opts.page || 1;

    return doGet("/repositories/:repo_id/resources", opts, callback);
  };


  this.eachResource = function(callback, page) {
    if (typeof(page) === 'undefined') {
      page = 1;
    }


    return eachPage(that.getResources, callback, page);
  };


  this.getUsers = function(opts, callback) {
    if (typeof(opts) === 'function') {
      callback = opts;
      opts = { page: 1 };
    }

    return doGet("/users", opts, callback);
  }


  this.eachUser = function(callback, page) {
    if (typeof(page) === 'undefined') {
      page = 1;
    }

    return eachPage(that.getUsers, callback, page);
  };


  this.updateRecord = function(rec, callback) {
    return doPost(rec.uri, rec, callback);
  };


  this.updatePassword = function(user, password, callback) {
    return doPost(user.uri + "?password=" + password, user, callback);
  };


  this.createJob = function(job, callback) {
    var d = promiseFactory();

    for (var i = 0; i < job.files.length; i++) {
      if (!fileLoader.existsSync(job.files[i])) {
        var err = new Error("File " + job.files[i] + " does not exist");
        d.reject(err);
        if (callback) callback(err);
        return d.promise;
      }
    };

    var form = formDataFactory();
    form.append('job', JSON.stringify(job));
    for (var i=0; i < job.files.length; i++) {
      var filepath = job.files[i];
      form.append('files[' + i + ']', fileLoader.createReadStream(filepath));
    }


    doPostForm("/repositories/:repo_id/jobs", form, function(err, json) {
      if (!err && json.error) {
        err = new Error(JSON.stringify(json.error));
      } else if (!err && json.status != 'Created') {
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


  this.createUser = function(obj, password, callback) {
    return doPost("/users?password=" + password, obj, callback)
  }


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


  this.createArchivalObject = function(obj, callback) {
    return doPost("/repositories/:repo_id/archival_objects", obj, callback);
  };


  this.createDigitalObject = function(obj, callback) {
    return doPost("/repositories/:repo_id/digital_objects", obj, callback);
  };


  function setSession(new_session) {
    session = new_session;
  };


  function resolvePath(path) {
    if (activeRepo && path.match(":repo_id")) {
      path = path.replace(":repo_id", activeRepo);
    }

    return path;
  };


  function getASHost() {
    if (typeof(backendUrl) === 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl.replace(/https?:\/\//, "").replace(/:\d+$/, "");
  };


  function getASPort() {
    if (typeof(backendUrl) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl.replace(/.*:/, "");
  };


  function expand(path) {
    path = resolvePath(path);

    if (typeof(backendUrl) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl + path;
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


  // get JSON
  function doGet(uri, opts, callback) {

    if (opts === undefined)
      opts = {}

    var d = promiseFactory();
    var json;

    if (Object.keys(opts).length > 0) {
      uri += "?"
      for (i=0; i < Object.keys(opts).length; i++){
        var paramName = Object.keys(opts)[i];
        var paramVal = opts[Object.keys(opts)[i]];

        if (typeof(paramVal) === 'object') {
          for (j=0; j < Object.keys(paramVal).length; j++) {
            uri += paramName + "[]=";
            uri += paramVal[i];
          }
        } else {
          uri += paramName+"="+paramVal;
        }
        if (i < Object.keys(opts).length - 1) uri += "&";
      }
    }

    var opts = {
      url: expand(uri),
      timeout: connectionTimeout,
    };

    return requestRequest('get', opts, callback);
  };


  // TODO test this
  function doDelete(path, callback) {
    var d = promiseFactory();
    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    request.del(opts, function(err, res, body) {
      logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));


      if (res.statusCode && res.statusCode != 200) {
        err = new ArchivesSpaceServerError(res.statusCode, body);
      }

      if (err) d.reject(err);
      else d.resolve(body);

      if (callback) callback(err, body);
    });

    return d.promise;
  };


  function doPost(path, obj, callback) {
    var opts = {
      url: expand(path),
    };

    if (obj) {
      opts.json = obj;
    }

    logger.debug("Posting" + JSON.stringify(opts));

    return requestRequest('post', opts, callback);
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



  function eachPage(pageRecords, callback, page) {
    pageRecords({page: page}, function(err, json) {
      if (err) {
        callback(err);
      } else {
        for (var i = 0; i < json.results.length; i++) {
          callback(err, json.results[i]);
        }

        if (json.last_page > page) {
          eachPage(pageRecords, callback, page + 1);
        }
      }
    });
  }


  function requestRequest(method, opts, callback) {
    var d = promiseFactory();

    if (session) {
      opts.headers = opts.headers || {};
      opts.headers['X-ArchivesSpace-Session'] = session;
    }

    opts.method = method.toUpperCase();

    request.apply(method, [opts, function(err, res, body) {

      if (res && body) {
        logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));
      }

      if (res && res.statusCode === 0) {
        logger.debug(JSON.stringify(res) + JSON.stringify(err));
        err = new ConnectionError("Cannot connect to ArchivesSpace; check settings and network connection");
      } else if (res && res.statusCode && res.statusCode != 200) {
        err = new ArchivesSpaceServerError(res.statusCode, body);
      }

      if (!err && typeof(body) === 'string') {
        body = JSON.parse(body);
      }

      if (err) {
        d.reject(err);
      } else {
        d.resolve(body);
      }

      if (callback) callback(err, body);
    }]);

    return d.promise;
  }


  function parseError(body) {

    var results = [];
    var loginfo = body.split(/=+\n/).map(function(s) { return s.replace(/\\n/g, ''); });

    while (loginfo[0].length < 1 && loginfo.length > 0) {
      loginfo.shift();
    }

    while (loginfo.length > 1) {
      console.log(loginfo);
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

  function ConnectionError(message) {
    this.message = message;
  }

  ConnectionError.prototype = new Error();
  ConnectionError.prototype.constructor = ConnectionError;

  function ArchivesSpaceServerError(code, response) {
    this.name = "ArchivesSpaceServerError"
    this.message = response;
    this.code = code;
  }

  ArchivesSpaceServerError.prototype = new Error();
  ArchivesSpaceServerError.prototype.constructor = ArchivesSpaceServerError;

}

module.exports = Api;

if (typeof(window) != 'undefined') {
  window.Api = Api;
}

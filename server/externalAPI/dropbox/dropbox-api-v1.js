var Path = require('path');
var https = require('https');
var bPromise = require('bluebird');
var fs = require('fs');

var apiUrl = 'api.dropbox.com';
var versionUrl = '/1';

var dropboxAPI = {};

dropboxAPI.getDelta = function getDelta(path, accessToken) {
  var key;
  var options;
  var apiOptions;
  var pathUrl;

  pathUrl = versionUrl + '/delta';

  //GET request options
  options = {
    hostname: apiUrl,
    path: pathUrl,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json; charset=utf-8',
    }
  };

  var parseFiles = function(filesArr){
    //console.log('files', filesArr);
    var myfiles = [];
    var fileHash = {};
    var structureHash = {};

    for(var i = 0; i < filesArr.length; i++){
      var file = {};

      //meta portion
      var dMeta = filesArr[i][1];
      file.name = dMeta.path.split('/').pop();
      file.meta = {};
      file.meta.rev = dMeta.rev;
      file.meta.thumb_exists = dMeta.thumb_exists;

      file.meta.path = dMeta.path;
      file.meta.is_dir = dMeta.is_dir;
      file.meta.icon = dMeta.icon;
      file.meta.read_only = dMeta.read_only;
      file.meta.modifier = dMeta.modifier;
      file.meta.bytes = dMeta.bytes;
      file.meta.modified = dMeta.modified;
      file.meta.size = dMeta.size;

      file.meta.root = dMeta.root;
      file.meta.mime_type = dMeta.mime_type;
      file.meta.revision = dMeta.version;

      //is a directory
      if(file.meta.is_dir){
        file.files = [];
        structureHash[file.meta.path] = myfiles.length;

      }
      myfiles.push(file);
    }

    //handles nesting
    var results = [];
    for(var j = 0; j < myfiles.length; j++){
      var path = myfiles[j].meta.path;
      var folder = myfiles[j].meta.path.replace('/' + myfiles[j].name, '');
      var res = structureHash[folder];
      if(res !== undefined){
        myfiles[res].files.push(myfiles[j]);
      } else {
        results.push(myfiles[j]);
      }
    }

    return results;

  }

  return new bPromise(function tokenRequest(resolve, reject){
    var req = https.request(options, function(response) {
      var data = '';

      response.setEncoding('utf-8');

      response.on('data', function (chunk) {
        data += chunk;
      });

      response.on('end', function () {
        if(response.statusCode < 200 || response.statusCode >= 300) {
          reject(data);
        } else {
          data = JSON.parse(data);
          var myDropboxFiles = parseFiles(data.entries)
          //console.log('myfiles are ', myDropboxFiles);
          resolve(myDropboxFiles);
        }
      });
    });

    console.log(req);

    req.end();
  });

};

dropboxAPI.uploadFile = function(accessToken, files, key){
  // POST request path
  var pathUrl = versionUrl + '/files_put/auto/' + files[key].name; // file name
  
  // POST request options
  var options = {
    hostname: 'api-content.dropbox.com',
    path: pathUrl,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': files[key].type, // content type
      'Content-Length': files[key].size // content size
    }
  };
  
  // promise to return that the file was posted
  return new bPromise(function tokenRequest(resolve, reject){
    var req = https.request(options, function(response) {
      var data = '';

      response.setEncoding('utf-8');

      response.on('data', function (chunk) {
        data += chunk;
      });

      response.on('end', function () {
        if(response.statusCode < 200 || response.statusCode >= 300) {
          console.log('Upload rejected!');
          reject(data);
        } else {
          console.log('Upload resolved!');
          resolve(data);
        }
      });
    });

    // read file path on server, pipe content to dropbox
    fs.readFile(files[key].path, function read(err, data) {
      if (err) {
        return console.error('read failed:', err);
      }

      // write the POST body and send request to dropbox
      req.write(data);
      req.end();
    });

  });
};

module.exports = dropboxAPI;

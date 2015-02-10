var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var secrets = require('../../secrets/drive.secret');
var Promise = require('bluebird');
var drive = google.drive('v2');
var fs = require('fs');
var request = require('request');
var oauth2Client = new OAuth2(secrets.CLIENT_ID, secrets.CLIENT_SECRET, secrets.REDIRECT_URL);
var filesize = require('file-size');

google.options({ auth: oauth2Client });

var getRoot = Promise.promisify(drive.about.get); //result.rootFolderId
var getFile = Promise.promisify(drive.files.get);
var getChildren = Promise.promisify(drive.children.list);
var getFileList = Promise.promisify(drive.files.list);

var driveAPI = {};

driveAPI.getDriveFiles = function(accessToken) {

  oauth2Client.setCredentials({
    access_token: accessToken
  });

  var parseFiles = function(filesArr){
    var fileHash = {};
    var structureHash = {};
    var myfiles = [];
    var level = myfiles;
    var dirLevel = filesArr[filesArr.length -1].parents[0].id;

    //reverse order to start with nested directories
    for (var i = filesArr.length - 1; i >= 0; i--){

      var gFile = filesArr[i];
      var file = {};

      //if it is a dir, add to fileHash
      if(gFile.mimeType === 'application/vnd.google-apps.folder'){
        fileHash[gFile.id] = '/' + gFile.title;
        if(gFile.parents.length > 0){
          if(!gFile.parents[0].isRoot){
            fileHash[gFile.id] = fileHash[gFile.parents[0].id] + '/' + gFile.title;
          }
        }
        file.files = [];
        structureHash[fileHash[gFile.id]] = myfiles.length;
      }

      file.name = gFile.title;
      file.meta = {};
      file.meta.gId =  gFile.id;
      file.meta.rev = gFile.headRevisionId;
      file.meta.thumb_exists = true;
      if(gFile.parents.length > 0){
        file.meta.path = gFile.parents[0].isRoot ? '/' + file.name : fileHash[gFile.parents[0].id] + '/' + file.name;
        
      } else {
        file.meta.path = '/Google Shared/' + file.name;
      }
      file.meta.is_dir = gFile.mimeType === 'application/vnd.google-apps.folder' ? true : false;
      file.meta.icon = gFile.thumbnailLink;
      file.meta.read_only = !gFile.editable;
      file.meta.modifier = null;
      file.meta.bytes = gFile.fileSize;
      file.meta.modified = gFile.modifiedDate;
      file.meta.size = filesize(Number(gFile.fileSize)).human({ jedec: true });
      if(file.meta.size === 'NaN Bytes' && !file.meta.is_dir){
        file.meta.size = 'REMOVE'
      }
      file.meta.download = gFile.webContentLink;
      file.meta.root = 'drive';
      file.meta.mime_type = gFile.mimeType;
      file.meta.revision = gFile.version;

      //push files in sequence

      myfiles.push(file);
  

    }
    //console.log('myfiles on drive', myfiles);
    //iterate through sequential files, placing them back into proper directory depth structure
    var results = [];
    for(var j = 0; j < myfiles.length; j++){
      var folder = myfiles[j].meta.path.replace('/' + myfiles[j].name, '');
      var res = structureHash[folder];
      if(res !== undefined){
        myfiles[res].files.push(myfiles[j]);
      } else {
        if(myfiles[j].meta.size !== 'REMOVE'){

        results.push(myfiles[j]);
        }
      }
    }
    //console.log(' my results are ', results);
    return results;
  }

  return getFileList() 
  .then(function(result) {
    //console.log('google items is ', result[0].items);
    var myGFiles = parseFiles(result[0].items);
    //console.log('postParse is', myGFiles);
    //need to pass myGFiles to appropriate place
    return myGFiles;
  });

};

driveAPI.uploadFile = function(accessToken, files, key) {

  return new Promise(function tokenRequest(resolve, reject){
  // read file path on server, pipe content to dropbox
    fs.readFile(files[key].path, function read(err, data) {
      if (err) {
        return console.error('read failed:', err);
      }
      
      request.post({
        'url': 'https://www.googleapis.com/upload/drive/v2/files',
        'qs': {
          'uploadType': 'multipart'
        },
        'headers': {
          'Authorization': 'Bearer ' + accessToken
        },
        'multipart': [
          {
            'Content-Type': 'application/json; charset=UTF-8',
            'body': JSON.stringify({
              'title': files[key].name
            })
          },
          {
            'Content-Type': files[key].type,
            'Content-Length': files[key].size,
            'body': data
          }
        ]
      }, function(err, httpResponse, body) {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }

      });
    });
  
  });

};

module.exports = driveAPI;
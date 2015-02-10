var pathToServerRoot = '../..';
var jwt = require('jwt-simple');
var jwtSecret = require(pathToServerRoot + '/secrets/jwt.secret');
var express = require('express');
var apiRouter = express.Router();
var dropboxAPI = require('../../externalAPI/dropbox/dropbox-api-v1.js');
var driveAPI = require('../../externalAPI/drive/drive-api-v2.js');
var formidable = require('formidable');

/**
drive api router is expecting a 'req.body.driveAccessToken' or a '
req.body.driveRefreshToken' to the '/driveFiles' route as specified in
externalApi/drive/drive-api-v2.js
*/
apiRouter.all('*', function(req, res, next) {
  req.tokens = {
    drive : jwt.decode(req.headers.drivetoken, jwtSecret.secret),
    dropbox : jwt.decode(req.headers.dropboxtoken, jwtSecret.secret)
  };
  next();
});



apiRouter.get('/getDropboxFiles', function(req, res) {
  var fileDirectories = {};

  console.log("TOKEN", req.tokens.dropbox);

  dropboxAPI.getDelta('/', req.tokens.dropbox)
  .then(function(data) {
    fileDirectories = data;

    res.set('Content-Type', 'application/json')
    .status(200).end(JSON.stringify(fileDirectories));
  });

});

apiRouter.get('/getDriveFiles', function(req, res) {
  var fileDirectories = {};


  driveAPI.getDriveFiles(req.tokens.drive)
    .then(function(data) {
      fileDirectories = data;
      res.set('Content-Type', 'application/json')
      .status(200).end(JSON.stringify(fileDirectories));
      }
    );

});


apiRouter.get('/getAllFiles', function(req,res) {
  var fileDirectories = {};
  var unresolved = 2;

  driveAPI.getDriveFiles(req.tokens.drive)
    .then(function(data) {
      fileDirectories.google = data;
      unresolved--;
      if(unresolved === 0) {
        res.set('Content-Type', 'application/json')
        .status(200).end(JSON.stringify(fileDirectories));
      }
    });

  dropboxAPI.getDelta('/', req.tokens.dropbox)
  .then(function(data) {
    fileDirectories.dropbox = data;
    unresolved--;
    if(unresolved === 0) {
      res.set('Content-Type', 'application/json')
      .status(200).end(JSON.stringify(fileDirectories));
    }
  });
  
});

apiRouter.get('/moveFiles', function(req,res) {
  //From Client:
    //fromService
    //fromLocation
    //toService
    //toLocation
    //fileID
    //fileLink: Optional for now. i assume the fileID is what we need to find the file, not hte fileLink.
  //server Actions:
    //lookup api object associated with fromService
    //download file, save in memory temporarily
    //lookup api object associated with toService
    //post the file to that service
    //on success, delete the file from it's original location.
      //this prevents us from deleting the file when we have network errors that interrupt saving it to the new location
    //on success from that, redirect to /1/getAllFiles

    //this is designed to be modular enough to allow us to move the file from the same service to itself.
    //it may be easier to build in some logic to see if fromService and toService are the same. if they are, we can then issue a move command to that api, rather than the steps outlined above.
    //however, MVP is whichever is easiest, and I have a feeling that the path outlined above is going to easiest since it will work for all cases.
  });

apiRouter.post('/uploadFile', function(req, res) {

  // formidable to parse multi-part form
  var form = new formidable.IncomingForm();

  form.parse(req, function(err, fields, files) {
    if (err) {
      throw err;
    }

    // route to right cloud service api
    if (Object.keys(files)[0] === 'Dropbox') { // send data to dropbox api
      dropboxAPI.uploadFile(req.tokens.dropbox, files, 'Dropbox')
      .then(function (data) {
        res.writeHead(201, {'Content-Type': 'text/html'});
        res.write('Received Upload');
        res.end();
      });
    } else { // send data to google api
      driveAPI.uploadFile(req.tokens.drive, files, 'Google')
      .then(function (data) {
        res.writeHead(201, {'Content-Type': 'text/html'});
        res.write('Received Upload');
        res.end();
      });
    }

  });
  
  // form.on('end', function() {
  //   // response to client
  //   res.writeHead(201, {'Content-Type': 'text/html'});
  //   res.write('Received Upload');
  //   res.end();
  // });

});

module.exports = apiRouter;

var https = require('https');
var bPromise = require('bluebird');
var fs = require('fs');


var downloadApi = {};

downloadApi.getDropboxFile = function (path, accessToken){
	//NEED TO CHANGE LATER
	var mimeType = 'application/pdf';
	//
  console.log('###################################  Getting dropbox file');
  console.log('###################################  ACCESS TOKEN',accessToken);
  var key;
  var options;
  var pathUrl;

  var downloadHostUrl = 'api-content.dropbox.com';
  var downloadPathUrl = '/1/files/auto/Getting Started.pdf';

  //GET request options
  options = {
    hostname: downloadHostUrl,
    path: downloadPathUrl,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': mimeType,
    }
  };

  //promise to return the directory data
  return new bPromise(function tokenRequest(resolve, reject){
    var file = fs.createWriteStream("Getting Started.pdf");
    var req = https.request(options, function(response) {
      var data = '';
      response.setEncoding('binary');

      response.on('data', function (chunk) {
        data += chunk;
      });

      response.on('end', function () {
      	data = new Buffer(data, 'binary');
        fs.writeFile("Getting Started.pdf", data, function(err){
        	if(err){
        		console.log('error writing file', err);
        	}else{
        		console.log('File has been written!!!');
        	}
        });

        if(response.statusCode < 200 || response.statusCode >= 300) {
          reject(data);
        } else {
          resolve(data);
        }
      });
    });

    req.end();
  });
};


module.exports = downloadApi;
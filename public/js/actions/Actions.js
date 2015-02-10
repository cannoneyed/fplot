// app-actions.js
var AppDispatcher = require('../dispatcher/appDispatcher.js');
var AppConstants = require('../constants/appConstants.js');

var Actions = {
  // HAVE THESE ACTIONS ALIGN WITH CLIENT-SERVER API
  //FIX: modify to be 'move item'
  updateLevels: function(levels, cloudService) {
    AppDispatcher.handleViewAction({
      actionType: AppConstants.UPDATE_LEVELS,
      levels: levels,
      cloudService: cloudService
    })
  },

  enterFolder: function(folderName, cloudService) {
    AppDispatcher.handleViewAction({
      actionType: AppConstants.ENTER_FOLDER,
      folderName: folderName,
      cloudService: cloudService
    })
  },

  setLoading: function(cloudService, bool) {
    console.log('Loading!', cloudService, bool);
    AppDispatcher.handleViewAction({
      actionType: AppConstants.SET_LOADING,
      cloudService: cloudService,
      bool: bool
    })
  },

  setDragging: function(cloudService, bool) {
    AppDispatcher.handleViewAction({
      actionType: AppConstants.SET_LOADING,
      cloudService: cloudService,
      bool: bool
    })
  },

  getAllFiles: function(cloudService) {
    console.log('getting all', cloudService);
    var urls = {
      'Dropbox': 'api/1/getDropboxFiles',
      'Google': 'api/1/getDriveFiles'
    }

    $.ajax({
      url: urls[cloudService],
      headers: {
        'driveToken': sessionStorage.getItem('driveToken'),
        'dropboxToken' : sessionStorage.getItem('dropboxToken')
      },
      dataType: 'json',
      type: 'GET',
      success: function(data) {
        AppDispatcher.handleViewAction({
          actionType: AppConstants.UPDATE_FILES,
          files: data,
          cloudService: cloudService
        })
      },
      error: function(xhr, status, err) {
        console.error('api/1/getAllFiles', status, err.toString());
      }
    });   
  },

  downloadFile: function(file, cloudService) {
    if (cloudService === "Google") {
      console.log(file.meta.download);
      window.location.assign(file.meta.download);
    }


  },

  uploadFile: function(file, cloudService) {
    var data = new FormData();
    data.append(cloudService, file);

    Actions.setLoading(cloudService, true);

    $.ajax({
      url: 'api/1/uploadFile',
      type: 'POST',
      data: data,
      cache: false,
      dataType: 'text',
      processData: false, // don't process files
      contentType: false, // set to false as jQuery will tell the server its a query string request
      headers: {
        'driveToken': sessionStorage.getItem('driveToken'),
        'dropboxToken' : sessionStorage.getItem('dropboxToken')
      },
      success: function(data) {
        console.log(data);
        Actions.getAllFiles(cloudService);
        Actions.setLoading(cloudService, false);
      },
      error: function(data) {
        console.log('Error Uploading');
      }
    });
  }


};

module.exports = Actions;

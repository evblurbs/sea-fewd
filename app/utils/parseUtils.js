var Parse = require('parse').Parse;
var appConstants = require('../constants/appConstants');
var sessionUtils = require('./sessionUtils');
var https = require('https');

var parseUtils = {
  // function for server side code
  // to call to check if a user exists
  serverLogin: function(githubData, serverResponse) {
    var _this = this;

    // Initialize Parse for Server Side queries
    Parse.initialize(appConstants.PARSE_APP_ID, appConstants.PARSE_JS_KEY, appConstants.PARSE_MASTER_KEY);
    // Enables us to login the user from the
    // server side (remove if we find another way
    // to get the session token)

    Parse.User.enableUnsafeCurrentUser();

    // store github data
    this.githubData = githubData;
    this.serverResponse = serverResponse;
    this.sessionUtils = sessionUtils;

    var path = '/1/login?username=';
    path += encodeURIComponent(githubData.login);
    path += '&password=';
    path += encodeURIComponent(String(githubData.id));

    https.get({
      host: 'api.parse.com',
      path: path,
      headers: {
        "X-Parse-Application-Id":appConstants.PARSE_APP_ID,
        "X-Parse-REST-API-Key":appConstants.REST_API_KEY,
      }
    }, function(response) {
      // Continuously update stream with data
      var body = '';
      response.on('data', function(d) {
        body += d;
      });
      response.on('end', function() {
        // Data reception is done, do whatever with it!
        var jsonResponse = JSON.parse(body);
        if(jsonResponse.error){
          process.stdout.write("Error reading from parse API: ");
          process.stdout.write(jsonResponse.error);
        }
        if(jsonResponse.sessionToken) {
          this.sessionUtils.createNewSession(jsonResponse.sessionToken, this.serverResponse);
        } else {
          this.serverSignUp();
        }
      }.bind(this));
    }.bind(this));
  },

  serverSignUp: function() {

    var user = new Parse.User();
    user.set("username", this.githubData.login);
    user.set("password", String(this.githubData.id));
    user.set("email", this.githubData.email);
    user.set("avatar_url", this.githubData.avatar_url);
    user.set("name", this.githubData.name);
    user.set("location", this.githubData.location);

    user.signUp(null, {
      success: function(user) {
        // Hooray! User signed up
        sessionUtils.createNewSession(user._sessionToken, this.serverResponse);
      }.bind(this),
      error: function(user, error) {
        console.log("Error: " + error.code + " " + error.message);
        process.stdout.write("Error signing up user: ");
        process.stdout.write(error.code + " " error.message);
      }
    });
  },

  login: function(githubData) {

  },

  logout: function() {
    Parse.User.logOut();
  }
};

module.exports = parseUtils;

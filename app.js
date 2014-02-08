$(document).ready(function () {
  
  var client_creds = {
    orgName: 'sescleifer',
    appName: 'sandbox',
    logging: true,
    buildCurl: true
  };

  var client = new Apigee.Client(client_creds); 

});
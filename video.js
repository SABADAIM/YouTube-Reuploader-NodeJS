var Youtube = require("youtube-api");
var youtubedl = require('youtube-dl');
var fs = require("fs");
var google = require('googleapis');
var colors = require('colors');
var GoogleTokenProvider = require('refresh-token').GoogleTokenProvider;
var OAuth2 = google.auth.OAuth2;
var nconf = require('nconf');
nconf.env().argv();
nconf.file('config/config.json');
colors.setTheme({
  info: 'green',
  help: 'cyan',
  warn: 'yellow',
  debug: 'white',
  error: 'red'
});

console.log(colors.info('Modules loaded!'))
var i = parseInt(nconf.get('LAST_ID'));
var tokenProvider = new GoogleTokenProvider({
    refresh_token: nconf.get('REFRESH_TOKEN'), 
    client_id:     nconf.get('CLIENT_ID'),
    client_secret: nconf.get('CLIENT_SECRET')
  });

setInterval(function() {
  console.log(colors.debug('Refresh token in progress...'));
  tokenProvider.getToken(function (err, token) {
    nconf.set('ACCESS_TOKEN', token);
    nconf.save();
    console.log('Token has been refreshed'.info);
});
}, nconf.get('REFR_TIMEOUT')*1000);

function action(url, file_a, size, title_a){
  var downloaded = 0;
    if (fs.existsSync(file_a)) {
      downloaded = fs.statSync(file_a).size;
    }
    console.log(colors.info('Reuploading URL: ' + url + ' | ID in array: ' + i));
    var video = youtubedl(url, ['--format=18'], { start: downloaded, cwd: __dirname });
    video.on('info', function(info) {
      var total = size + downloaded;
    });
    video.pipe(fs.createWriteStream(file_a, { flags: 'a' }));
    video.on('end', function() {
      upload(file_a, title_a);
    });
}

function upload(filename, title) {
  console.log(colors.debug('Reauthenticate on YouTube'));
  Youtube.authenticate({
    type: "oauth",
    token: nconf.get('ACCESS_TOKEN')
  });

  console.log(colors.debug('Try upload Video on YouTube'));
  Youtube.videos.insert({
    resource: {
      snippet: {
        title: nconf.get('FILM_TITLEA') + '' + title + '' + nconf.get('FILM_TITLEB'),
        description: "Фильм \""+title+"\" вы можете посмотреть на сайте " + nconf.get('SITE_URL') + "\n*\n*\n*\n*\nТэги: " + nconf.get('FILM_TAGS')
                },
        status: {
           privacyStatus: "public"
                }
        },
        part: "snippet,status",
        media: {
          body: fs.createReadStream(filename)
        }
  });
  
  console.log(colors.debug('Deleting video file...'));
  fs.unlink(filename);
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~'.info);
}
if(nconf.get('SHOW_INFO') == 1){
  console.log(colors.info('~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n'.help + 'PROGRAM STARTED'.warn + '\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n'.help + 'Last used ID from array: '.help + nconf.get('LAST_ID') + '\nLast used ACCESS_TOKEN: '.help + nconf.get('ACCESS_TOKEN') + '\nLast used REFRESH_TOKEN: '.help + nconf.get('REFRESH_TOKEN') + '\nLast used CLIENT_ID: '.help + nconf.get('CLIENT_ID') + '\nLast used CLIENT_SECRET: '.help + nconf.get('CLIENT_SECRET') + '\nTAGS FOR FILM:\n'.help + nconf.get('FILM_TAGS') + '\nSite URL to description: '.help + nconf.get('SITE_URL') + '\nTimeout token refresh: '.help + nconf.get('REFR_TIMEOUT')*1000 + '\nTimeout get video information: '.help + nconf.get('GET_TIMEOUT')*1000 + '\nTimeout exit if list url is empty or undefined: '.help + nconf.get('EMPT_TIMEOUT')*1000 + '\nPrint after film title: '.help + nconf.get('FILM_TITLEA') + '\nTitle before film title: '.help + nconf.get('FILM_TITLEB') + '\nYouTube Login: '.help + nconf.get('YT_LOGIN')));  
}


var options = ['--username=' + nconf.get('YT_LOGIN') + '', '--password='+ nconf.get('YT_PASSWORD') + ''];

fs.readFile(nconf.get('VIDEOS_FILE'), function(err, f){
var arr = f.toString().split('\n');
  setInterval(function() {
    if(arr[i]){
      youtubedl.getInfo(arr[i], nconf.get('YT_OPT'), function(err, info) {
        if(err){
          console.log(color.error(err));
        }else{
          console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~'.info);
          action(arr[i], info._filename, info.size, info.title);
          i=i+1;
          nconf.set('LAST_ID', i);
          nconf.save();
        }
      });
    }else{
        console.log('URL is not valid, or undefined\nProcess will be closed after 60 seconds\nMaybe not all uploads finished.'.warn);
          setInterval(function() {
            process.exit(1);
        }, nconf.get('EMPT_TIMEOUT')*1000);
    }
    }, nconf.get('GET_TIMEOUT')*1000);
});
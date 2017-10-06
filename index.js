//do not migrate preload script into TypeScript
require('../stat-cache');
const profiler = require('../utils/profiler');

if (profiler.shouldProfile()) profiler.startProfiling();

var startup = function() {
  var url = require('url');

  // Skip "?loadSettings=".
  var fileUri = url.parse(window.location.href);

  var queryParts = fileUri.query.split('&');
  var loadSettingsStr = null;

  for (var j=0; j < queryParts.length; j++) {
    if (queryParts[j].match(/loadSettings/)) {
      loadSettingsStr = queryParts[j].replace("loadSettings=", "");
      break;
    }
  }

  var loadSettings = JSON.parse(decodeURIComponent(loadSettingsStr));

  // Require before the module cache in dev mode
  window.loadSettings = loadSettings;

  var noCommitVersion = loadSettings.version.split('-')[0];
  var shouldSuppressErrors = loadSettings.devMode;
  if (!loadSettings.isSpec) {
    require('../renderer/bugsnag-setup').setupBugsnag(shouldSuppressErrors, noCommitVersion);
  }

  if (loadSettings.bootstrapScript) {
    require(loadSettings.bootstrapScript);
  }
};


document.addEventListener("DOMContentLoaded", function() { // eslint-disable-line
  try {
    startup();
  } catch (e) {
    console.log(e.stack);

    if (window.Bugsnag) {
      window.Bugsnag.notifyException(e, "Renderer crash");
    }

    throw e;
  }
});

// First make sure the wrapper app is loaded
document.addEventListener("DOMContentLoaded", function() {

   // Then get its webviews
   let webviews = document.querySelectorAll(".TeamView webview");

   // Fetch our CSS in parallel ahead of time
   const cssPath = 'https://cdn.rawgit.com/widget-/slack-black-theme/master/custom.css';
   let cssPromise = fetch(cssPath).then(response => response.text());

   let customCustomCSS = `
   :root {
      /* Modify these to change your theme colors: */
//      --primary: #09F;
//      --text: #CCC;
//      --background: #080808;
//      --background-elevated: #222;
      --primary: #CCC;
      --text: #BBB;
      --background: #222;
      --background-elevated: #444;
		  --background-bright: #333;
   }
   #edit_topic_inner:before {
		 background: #333;
	 }
	 .app_preview_link_slug,.internal_member_link,.internal_user_group_link,ts-mention {
		 background: #555;
		 color: #99f;
	 }
   `

   // Insert a style tag into the wrapper view
   cssPromise.then(css => {
      let s = document.createElement('style');
      s.type = 'text/css';
      s.innerHTML = css + customCustomCSS;
      document.head.appendChild(s);
   });

   // Wait for each webview to load
   webviews.forEach(webview => {
      webview.addEventListener('ipc-message', message => {
         if (message.channel == 'didFinishLoading')
            // Finally add the CSS into the webview
            cssPromise.then(css => {
               let script = `
                     let s = document.createElement('style');
                     s.type = 'text/css';
                     s.id = 'slack-custom-css';
                     s.innerHTML = \`${css + customCustomCSS}\`;
                     document.head.appendChild(s);
                     `
               webview.executeJavaScript(script);
            })
      });
   });
});

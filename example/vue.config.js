// vue.config.js
var WebpackBeforeBuildPlugin = require("before-build-webpack");

module.exports = {
  configureWebpack: {
    plugins: [
      new WebpackBeforeBuildPlugin(
        function(stats, callback) {
          const { execSync } = require("child_process");
          console.log(
            execSync(
              "npm explore @onedrynugget/fontawesome-autoimport -- npm run gen"
            ).toString()
          );
          callback();
        },
        ["run", "watchRun"]
      )
    ]
  }
};

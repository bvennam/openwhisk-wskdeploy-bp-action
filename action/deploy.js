const fs = require('fs');
const exec = require('child_process').exec;
const git = require('simple-git');
let command = '';

function main(params) {
  return new Promise(function(resolve, reject) {

    // Either build the remote URL for simple-git or build error
    let remoteOrError = convertParamsToRemote(params);

    // We received an error, reject with it
    if (typeof remoteOrError !== 'string') {
      const { error } = remoteOrError;
      reject(error);
    }

    const remote = remoteOrError;

    // Grab wskAuth and apihost for wskdeploy command
    const {
      envData,
     } = params;

    const { wskApiHost, wskAuth } = getWskApiAuth(params);

    // Extract the name of the repo for the tmp directory
    const repoSplit = params.repo.split('/');
    const repoName = repoSplit[repoSplit.length - 1];
    const localDirName = `${__dirname}/tmp/${repoName}`;

    return checkIfDirExists(localDirName)
      .then((res) => {
        // The directory does not exist, clone BP from Github
        if (!res.skipClone) {
          return git()
            .clone(remote, localDirName, (err) => {
              if (err) {
                console.log('Error cloning remote ', err);
                reject(err);
              }
              resolve({
                repoDir: localDirName,
                wskAuth,
                wskApiHost,
                envData,
              });
            });
        } else {
          // The directory exists already, start wskdeploy chain as normal
          resolve({
            repoDir: localDirName,
            wskAuth,
            wskApiHost,
            envData,
          });
        }
      });
  })
  .then((data) => {
    console.log('Creating config file for wskdeploy');
    const {
      wskAuth,
      wskApiHost,
    } = data;

    // Create a .wskprops in the root for wskdeploy to reference
    command = `echo "AUTH=${wskAuth}\nAPIHOST=${wskApiHost}\nNAMESPACE=_" > .wskprops`;

    return new Promise(function(resolve, reject) {
      exec(command, { cwd: `/root/` }, (err, stdout, stderr) => {
        if (err) {
          console.log('Error creating .wskdeploy props', err);
          reject(err);
        }
        if (stdout) {
          console.log('stdout: ');
          console.log(stdout);
          console.log('type');
          console.log(typeof stdout);

        }
        if (stderr) {
          console.log('stderr: ');
          console.log(stderr);
        }
        resolve(data);
      }
    )
    });
  })
  .then((data) => {
    const {
      repoDir,
      envData
    } = data;

    const execOptions = {
      cwd: __dirname,
    };

    // If we were passed environment data (Cloudant bindings, etc.) add it to the options for `exec`
    if (envData) {
      execOptions.env = envData;
    }

    // Send 'y' to the wskdeploy command so it will actually run the deployment
    command = `printf 'y' | ./wskdeploy -m ${repoDir}/blueprint/manifest.yaml`;

    return new Promise(function(resolve, reject) {
      exec(command, execOptions, (err, stdout, stderr) => {
        if (err) {
          console.log('Error running `./wskdeploy`: ', err);
          reject(err);
        }
        if (stdout) {
          console.log('stdout: ');
          console.log(stdout);
          console.log('type');
          console.log(typeof stdout);

          if (typeof stdout === 'string') {
            try {
              stdout = JSON.parse(stdout);
            } catch (e) {
              console.log('Failed to parse stdout, it wasn\'t a JSON object');
            }
          }

          if (typeof stdout === 'object') {
            if (stdout.error) {
              console.log('Error: Could not successfully run wskdeploy. Did you provide the needed environment variables?');
              stdout.descriptiveError = 'Error: Could not successfully run wskdeploy. Did you provide the needed environment variables?';
              reject(stdout);
            }
          }
        }
        if (stderr) {
          console.log('stderr: ');
          console.log(stderr);
        }
        resolve(data);
      });
    })
  })
  .then((data) => {
    console.log('Performing LS')
    command = `ls`;

    return new Promise(function(resolve, reject) {
      exec(command , { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
          console.log('Error running `ls`: ', err);
          reject(err);
        }
        console.log('ls result is: ')
        if (stdout) {
          console.log('stdout: ');
          console.log(stdout);
        }
        if (stderr) {
          console.log('stderr: ');
          console.log(stderr);
        }
        resolve(data);
      });
    })
  })
  .then((data) => {
    return {
      msg: data
    }
  })
  .catch((err) => {
    console.log('ERROR:')
    console.log(err)
    return {
      msg: err
    }
  })
}

/**
 * Checks if the BP directory already exists on this invoker
 * @TODO: Optimize this to use GH tags so we can see whether or not we still need to pull a new version
 * @param  {[string]} dirname [string of directory path to check]
 * @return {[Promise]}        [Whether or not directory exists]
 */
function checkIfDirExists(dirname) {
  return new Promise((resolve, reject) => {
    fs.stat(dirname, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.log(`Directory ${dirname} does not exist`);
          resolve({
            skipClone: false
          });
        }
        else {
          console.log(`Error checking if ${dirname} exists`);
          console.log(err);
          reject(err);
        }
      }
      // Directory does exist, skip git clone
      // @TODO: Add optimization/caching here if repo exists on invoker already
      resolve({
        skipClone: true
      });
    });
  });
}

/**
 * Checks that a GitHub username, password (or access token), and repo
 *  are all passed in the params
 * @param  {[Object]} params    [Params object]
 * @return {[String || Object]} [String of remote URL if successful, object if error]
 */
function convertParamsToRemote(params) {
  const {
    user,
    pass,
    repo,
    wskAuth,
    wskApiHost,
  } = params;
  if (!user || !pass || !repo) {
    return {
      error: 'ERROR: Please enter username, password, and repo as params',
    };
  } else {
    return `https://${user}:${pass}@${repo}`;
  }
}

/**
 * Checks if wsk API host and auth were provided in params, if not, gets them from process.env
 * @param  {[Object]} params    [Params object]
 * @return {[Object]}           [Object containing wskApiHost and wskAuth]
 */
function getWskApiAuth(params) {
  let {
    wskApiHost,
    wskAuth,
  } = params;

  if (!wskApiHost) {
    wskApiHost = process.env.__OW_API_HOST;
  }

  if (!wskAuth) {
    wskAuth = process.env.__OW_API_KEY;
  }

  return {
    wskApiHost,
    wskAuth,
  }
}

exports.main = main;

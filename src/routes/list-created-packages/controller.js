const helper = require('./helper');
const constants = require('../../constants');
const childProcess = require('../../services/child-process');
const storage = require('../../services/storage');

function getCreatedPackageList(body, log) {
  return new Promise((resolve, reject) => {
    try {
      const projectName = `list_installed_packages_${new Date().getTime()}`;
      const instanceUrl = body.instanceUrl;
      const accessToken = body.accessToken;

      Promise.resolve()
        .then(() => storage.createProjectDirectory(projectName, log))
        .then(() => storage.createSFDXProjectJSON(projectName, log))
        .then(() => storage.setInstanceUrl(projectName, instanceUrl.replace('https://', ''), log))
        .then(() => childProcess.call(constants.getSFDXCreatedPackageList(accessToken), log, { cwd: `./${projectName}`, maxBuffer: 1024 * 500 }))
        .then(resolve)
        .catch(reject)
        .then(() => storage.removeProject(projectName, log));
    } catch (e) {
      reject('Error: ' + e);
    }
  });

}

module.exports = {
  getCreatedPackageList
}

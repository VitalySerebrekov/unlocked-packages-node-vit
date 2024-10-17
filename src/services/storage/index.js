const fs = require('fs');
const constants = require('../../constants');
const AdmZip = require('adm-zip');

function setInstanceUrl(projectName, domain, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Set Instance Url');
      const dir = `./${projectName}/.sfdx`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const sfdxConfig = `{ "instanceUrl": "https://${domain}" }`;
      log.log(`Instance Url: https://${domain}`);
      fs.writeFile(`${dir}/sfdx-config.json`, sfdxConfig, ((err) => {
        if (err) {
          log.log(`Error Set Instance Url\n${err}`);
          reject(err);
        }
        log.log('End Set Instance Url');
        resolve();
      }));
    } catch (e) {
      log.log(`Error Set Instance Url\n${e}`);
      reject(e);
    }
  });
}

function createSFDXProjectJSON(projectName, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Create SFDX Project JSON');
      fs.writeFile(`${projectName}/sfdx-project.json`, constants.SFDX_PROJECT_EXAMPLE, ((err) => {
        if (err) {
          log.log(`Error Create SFDX Project JSON\n${err}`);
          reject(err);
        }
        log.log('End Create SFDX Project JSON');
        resolve();
      }));
    } catch (e) {
      log.log(`Error Create SFDX Project JSON\n${e}`);
      reject(e);
    }
  });
}

function createProjectDirectory(projectName, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Create Project Directory');
      fs.mkdirSync(`./${projectName}`);
      log.log('End Create Project Directory');
      resolve();
    } catch (e) {
      log.log('Error Create Project Directory ' + e);
      reject(e);
    }
  });
}

function removeProject(projectName, log) {
  return new Promise((resolve, reject) => {
    log.log('Start Remove Project Directory');
    try {
      fs.rmdir(`./${projectName}`, { recursive: true }, (e) => {
        if (e) {
          log.log(`Error Remove Project Directory ${e}`);
          reject(e);
        }
        log.log('End Remove Project Directory');
        resolve();
      });
      resolve();
    } catch (e) {
      log.log(`Error Remove Project Directory ${e}`);
      reject(e);
    }
  });
}

function unzip(zipPath, projectPath, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Unzip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(projectPath, false);
      resolve(zip);
      log.log('End Unzip');
    } catch (e) {
      log.log('Error Unzip ' + e);
      reject(e);
    }
  });
}

function mergeDirectories(srcPath, destPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(srcPath)
  zip.extractAllTo(destPath, false);
}

module.exports = {
  setInstanceUrl,
  createProjectDirectory,
  createSFDXProjectJSON,
  removeProject,
  mergeDirectories,
  unzip
}

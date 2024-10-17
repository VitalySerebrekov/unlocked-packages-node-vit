const helper = require('./helper');
const constants = require('../../../constants');
const childProcess = require('../../../services/child-process');
const storage = require('../../../services/storage');

function createUnlockedPackage(body, log) {
  return new Promise((resolve, reject) => {
    const projectName = `${body.orgId}_${body.userId}_${body.timestamp}`;
    const resBody = {
      unlockedPackageId: body.unlockedPackageId,
      unlockedPackageVersionId: body.unlockedPackageVersionId,
      tempLogId: body.unlockedPackageTempLogId,
    };
    Promise.resolve()
      // Check Directory (is exist)
      .then(() => helper.checkProjectDirectory(projectName)
        .then((isExist) => {
          if (isExist) {
            reject(constants.PROJECT_DIRECTORY_IS_EXIST);
          } else {
            return childProcess.call(constants.getSFDXCreateProject(projectName), log);
          }
        }))
      .then(() => storage.setInstanceUrl(projectName, body.domain, log))
      // Create Project
      .then(() => childProcess.call(
        constants.getSFDXCreateUnlockedPackage(body.packageName, body.sessionId, body.description),
        log,
        { cwd: `./${projectName}`, maxBuffer: 1024 * 500 },
        true,
      ))
      .then((stdout) => {
        if (stdout === constants.PACKAGE_WITH_THIS_NAME_IS_EXIST) {
          log.log(`${constants.ERROR}: ${constants.PACKAGE_WITH_THIS_NAME_IS_EXIST}`);
            let logs = '';
            log.logs.forEach(log => {
                logs += `${log}\n`;
            });
            resBody.logs = logs;
          resBody.status = 'Error';
          resBody.error = constants.PACKAGE_WITH_THIS_NAME_IS_EXIST;
          return helper.callSetPackageInfo(resBody, body.sessionId, body.domain, body.namespacePrefix, log);
        }
        return helper.getSFDXProject(projectName, log)
          .then((sfdxProject) => {
            log.log(`Package ${body.packageName} Created`);
            const packageId = sfdxProject.packageAliases[body.packageName];
            resBody.sfdxProject = JSON.stringify(sfdxProject);
            resBody.packageId = packageId;
            resBody.unlockedPackageId = body.unlockedPackageId;
            resBody.tempLogId = body.unlockedPackageTempLogId;
            let logs = '';
            log.logs.forEach(log => {
              logs += `${log}\n`;
            });
            resBody.logs = logs;
            resBody.status = 'Completed';
            return helper.callSetPackageInfo(resBody, body.sessionId, body.domain, body.namespacePrefix, log);
          });
      })
      .then(() => storage.removeProject(projectName, log))
      .catch((e) => {
        let logs = '';
        log.logs.forEach(log => {
          logs += `${log}\n`;
        });
        resBody.logs = logs;
        resBody.status = 'Error';
        resBody.error = e.toString();
        helper.callSetPackageInfo(resBody, body.sessionId, body.domain, body.namespacePrefix, log)
          .then(() => resolve())
          .catch((e) => reject(e));
      })
      .then(() => storage.removeProject(projectName, log));
  });
}

module.exports = {
  createUnlockedPackage,
};

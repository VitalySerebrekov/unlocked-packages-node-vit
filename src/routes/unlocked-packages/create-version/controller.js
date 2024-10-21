const helper = require('./helper');
const constants = require('../../../constants');
const childProcess = require('../../../services/child-process');
const storage = require('../../../services/storage');

function createUnlockedPackageVersion(body, log) {
  return new Promise((resolve, reject) => {
    const projectName = `${body.orgId}_${body.userId}_${body.timestamp}`;
    const resBody = {
      unlockedPackageVersionTempLogId: body.unlockedPackageTempLogId,
      unlockedPackageId: body.unlockedPackageId,
      unlockedPackageVersionId: body.unlockedPackageVersionId,
    };
    Promise.resolve()
      .then(() => helper.checkProjectDirectory(projectName)
        .then((isExist) => {
          if (isExist) {
            reject(constants.PROJECT_DIRECTORY_IS_EXIST);
          } else {
            return childProcess.call(constants.getSFDXCreateProject(projectName), log);
          }
        }))
      .then(() => storage.setInstanceUrl(projectName, body.domain, log))
      .then(() => helper.callComponentList(body.domain, body.sessionId, body.componentList.map((comp) => comp.id), body.componentList.length, body.namespacePrefix, log))
      .then((result) => helper.mergeAttachmentAndComponents(body.componentList, result, log))
      .then((result) => helper.convertToBuffer(result, log))
      .then((componentList) => helper.unzipComponentList(componentList, projectName, body.sourceObjectName, log))
      .then(() => helper.generatePackageXML(body.componentList, projectName, log))
      .then(() => childProcess.call(
        constants.getSFDXConvertMetadata(`./${constants.UNZIP_CATALOG_NAME}`),
        log,
        { cwd: `./${projectName}`, maxBuffer: constants.MAX_BUFFER_SIZE },
      ))
      .then(() => helper.addSFDXPackage(projectName, body.sfdxProject, log))
      .then(() => {
        if (process.env.MODE !== 'TEST') {
          log.log('Dev Mode');
          return childProcess.call(
            constants.getSFDXCreateUnlockedPackageVersion(body.packageName, body.sessionId, body.versionKey, body.versionName, body.description, body.versionNumber),
            log,
            { cwd: `./${projectName}`, maxBuffer: constants.MAX_BUFFER_SIZE },
          );
        }
        log.log('Test Mode');
        return Promise.resolve();
      })
      .then(() => helper.getSFDXProject(projectName, log))
      .then((sfdxProject) => {
        resBody.sfdxProject = JSON.stringify(sfdxProject);
        resBody.status = 'Completed';
        if (sfdxProject.packageAliases) {
          const packageAliasList = Object.keys(sfdxProject.packageAliases);
          if (packageAliasList && packageAliasList.length) {
            const versionAlias = packageAliasList[packageAliasList.length - 1];
            if (versionAlias.includes('@')) {
              resBody.versionNumber = versionAlias.split('@')[1];
            }
            resBody.packageId = sfdxProject.packageAliases[packageAliasList[packageAliasList.length - 1]]
          }
        }

        return helper.getInstallationURL(sfdxProject, body, log);
      })
      .then((installationURL) => {
        resBody.installationURL = installationURL;
        return Promise.resolve();
      })
      .then(() => {
        log.log('End Create Unlocked Package Version');
        let logs = '';
        log.logs.forEach(log => {
          logs += `${log}\n`;
        });
        resBody.logs = logs;
        helper.callUpdateInfo(resBody, body.domain, body.sessionId, body.namespacePrefix, log)
          .then(() => resolve())
          .catch((e) => reject(e));
      })
      .then((response) => resolve(response))
      .then(() => storage.removeProject(projectName, log))
      .catch((e) => {
        let error = 'Error';
        if (e) {
          error = e.toString();
        }
        resBody.status = 'Error';
        resBody.error = error;
        log.log('Error Create Unlocked Package');
        log.log(error);
        let logs = '';
        log.logs.forEach(log => {
          logs += `${log}\n`;
        });
        resBody.logs = logs;
        return helper.callUpdateInfo(resBody, body.domain, body.sessionId, body.namespacePrefix, log)
          .then(() => reject(e))
          .catch((e1) => reject(e1));
      })
      .then(() => storage.removeProject(projectName, log));
  });
}

module.exports = {
  createUnlockedPackageVersion,
};

const helper = require('./helper');
const constants = require('../../../constants');
const childProcess = require('../../../services/child-process');
const storage = require('../../../services/storage');

function createSnapshot(body, log) {
  return new Promise((resolve, reject) => {
    try {
      console.log('--- body', body)
      const projectName = `create_snapshot_${new Date().getTime()}`;
      const instanceUrl = body.instanceUrl;
      const accessToken = body.accessToken;
      const sourceUrl = body.sourceUrl;
      const sourceAccessToken = body.sourceAccessToken;
      const packageName = body.packageName;
      const namespacePrefix = body.namespacePrefix;
      const metadataLogId = body.metadataLogId;
      const logAttachmentId = body.logAttachmentId;
      const snapshotName = body.snapshotName;
      const orgId = body.orgId;
      let dependencyList;

      if (body.dependencyList) {
        try {
          dependencyList = JSON.parse(body.dependencyList);
        } catch (e) {
          log.log('Error while get dependencies ' + e);
        }
      } else {
        dependencyList = [];
      }

      Promise.resolve()
        .then(() => storage.createProjectDirectory(projectName, log))
        .then(() => storage.createSFDXProjectJSON(projectName, log))
        .then(() => storage.setInstanceUrl(projectName, instanceUrl.replace('https://', ''), log))
        .then(() => helper.retrievePackages(accessToken, projectName, packageName, dependencyList, log))
        .then(() => helper.unzipPackages(projectName, packageName, dependencyList, log))
        .then(() => helper.getComponentTypesFromPackageXML(projectName, packageName, dependencyList, log))
        .then((packageMap) => helper.getMetadataInfo(accessToken, projectName, packageMap, log))
        .then((result) => helper.mergeComponentsWithMetadataInfo(result.metadataInfoMap, result.packageMap, log))
        .then((packageMap) => helper.createZipComponents(projectName, packageName, dependencyList, packageMap, log))
        .then((typeList) => helper.sendComponents(sourceUrl.replace('https://', ''), sourceAccessToken, namespacePrefix, typeList, packageName, snapshotName, orgId, metadataLogId, log))
        .then(() => helper.callUpdateInfo(sourceUrl.replace('https://', ''), sourceAccessToken, metadataLogId, namespacePrefix, logAttachmentId, true, log))
        .then(resolve)
        .catch((error) => {
          log.log('Error Create Snapshot');
          helper.callUpdateInfo(sourceUrl.replace('https://', ''), sourceAccessToken, metadataLogId, namespacePrefix, logAttachmentId, false, log)
            .then(reject)
            .catch(reject);
        })
        .then(() => storage.removeProject(projectName, log));
    } catch (e) {
      reject('Error: ' + e);
    }
  });

}

module.exports = {
  createSnapshot
}

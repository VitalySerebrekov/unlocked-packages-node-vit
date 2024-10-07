const fs = require('fs');
const xml2js = require('xml2js');

const constants = require('../../../constants');
const http = require('../../../services/http');
const childProcess = require('../../../services/child-process');
const storage = require('../../../services/storage');
const { MetadataTypeParser } = require('./metadataTypeParser');

function retrievePackages(accessToken, projectName, packageName, dependencyList, log) {
  return new Promise((resolve, reject) => {
    try {

      //  Case 00015574
      const packageNameFolder = packageName.replaceAll(/\//g, "-");

      log.log('Start Retrieve Packages');
      try {

        //  Case 00015574
        fs.mkdirSync(`./${projectName}/${packageNameFolder}`);
        // fs.mkdirSync(`./${projectName}/${packageName}`);

      } catch (e) {
        log.log('Error Create Package Directory ' + e);
        reject(e);
      }
      let promiseChain = Promise.resolve();
      promiseChain = promiseChain
        .then(() => {
          log.log('Start Retrieve Package ' + packageName);

          //  Case 00015574
          return childProcess.call(
            constants.getSFDXRetrievePackage(accessToken, packageName),
            log,
            { cwd: `./${projectName}/${packageNameFolder}`,
              maxBuffer: 1024 * 500
            })

          // return childProcess.call(
          //   constants.getSFDXRetrievePackage(accessToken, packageName),
          //   log,
          //   { cwd: `./${projectName}/${packageName}`,
          //     maxBuffer: 1024 * 500
          //   })
        })
        .then(() => log.log('End Retrieve Package ' + packageName));

      if (dependencyList && dependencyList.length) {
        dependencyList.forEach((dependencyPackageName) => {
          promiseChain = promiseChain
            .then(() => retrievePackages(accessToken, projectName, dependencyPackageName, null, log))
        });
      }

      promiseChain
        .then(() => {
          log.log('End Retrieve Packages');
          resolve();
        })
        .catch((e) => {
          log.log('Error Retrieve Packages ' + e);
          reject(e);
        });

    } catch (e) {
      log.log('Error Retrieve Packages ' + e);
      reject(e);
    }
  });
}

function unzipPackages(projectName, packageName, dependencyList, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Unzip Packages');

      let promiseChain = Promise.resolve();
      promiseChain = promiseChain
        .then(() => {
          log.log('Start Unzip Package ' + packageName);

          // return storage.unzip(`${projectName}/${packageName}/${constants.ZIP_PACKAGE_NAME}`, projectName, log);

          //  Case 00015574
          const packageNameFolder = packageName.replaceAll(/\//g, "-");
          return storage.unzip(`${projectName}/${packageNameFolder}/${constants.ZIP_PACKAGE_NAME}`, projectName, log);

        })
        .then(() => log.log('End Unzip Package ' + packageName));

      if (dependencyList && dependencyList.length) {
        dependencyList.forEach((dependencyPackageName) => {
          promiseChain = promiseChain
            .then(() => unzipPackages(projectName, dependencyPackageName, null, log))
        });
      }

      promiseChain
        .then(() => {
          log.log('End Unzip Packages');
          resolve();
        })
        .catch((e) => {
          log.log('Error Unzip Packages ' + e);
          reject(e);
        });

    } catch (e) {
      log.log('Error Unzip Packages ' + e);
      reject(e);
    }
  });
}

function getComponentTypesFromPackageXML(projectPath, packageName, dependencyList, log) {
  return new Promise(async (resolve, reject) => {
    try {
      log.log('Start Get Component Types From PackageXML');

      const parser = xml2js.Parser({ explicitArray: false });
      const packageMap = {};

      dependencyList = JSON.parse(JSON.stringify(dependencyList));
      dependencyList.push(packageName);
      for (const packName of dependencyList) {
        const packageXML = fs.readFileSync(`${projectPath}/${packName}/package.xml`);
        const packageJSON = await parser.parseStringPromise(packageXML);

        if (!Array.isArray(packageJSON.Package.types)) {
          packageJSON.Package.types = [packageJSON.Package.types];
        }

        packageJSON.Package.types.forEach((type) => createComponents(packageMap, type, packName));
      }

      resolve(packageMap);
      log.log('End Get Component Types From PackageXML');

    } catch (e) {
      log.log('Error Get Component Types From PackageXML ' + e);
      reject(e);
    }
  });
}

function createComponents(packageTypeMap, type, packageName) {
  if (!packageTypeMap[packageName]) {
    packageTypeMap[packageName] = {};
  }
  packageTypeMap[packageName][type.name] = {
    type: type.name,
    componentList: [],
    packageName
  };

  if (typeof type.members === 'string') {
    packageTypeMap[packageName][type.name].componentList.push({
      apiName: type.members,
      componentType: type.name,
      fileList: []
    });
  } else {
    type.members.forEach((member) => {
      packageTypeMap[packageName][type.name].componentList.push({
        apiName: member,
        componentType: type.name,
        fileList: []
      });
    });
  }

  return packageTypeMap;
}

function getMetadataInfo(accessToken, projectName, packageMap, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Get Metadata Info');
      const metadataInfoMap = {};
      let promiseChain = Promise.resolve();
      const antiDuplicateSet = new Set();
      Object.values(packageMap).forEach((packageTypeMap) => {
        Object.values(packageTypeMap).forEach((componentType) => {
          if (!antiDuplicateSet.has(componentType.type)) {
            antiDuplicateSet.add(componentType.type);
            promiseChain = promiseChain
              .then(() => childProcess.call(
                constants.getSFDXMetadataInfo(componentType.type, accessToken),
                log,
                { cwd: `./${projectName}`, maxBuffer: 1024 * 8000 },
                false,
                false
              ))
              .then((metadataInfo) => {
                log.log('Received Metadata Info, ' + componentType.type);
                metadataInfoMap[componentType.type] = JSON.parse(metadataInfo)
              });
          }
        });
      });

      promiseChain
        .then(() => {
          log.log('End Get Metadata Info');
          resolve({ metadataInfoMap, packageMap });
        })
        .catch((e) => {
          log.log('Error Get Metadata Info ' + e);
          reject(e);
        });
    } catch (e) {
      log.log('Error Get Metadata Info ' + e);
      reject(e);
    }
  });
}

function mergeComponentsWithMetadataInfo(metadataInfoMap, packageMap, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Merge Components With MetadataInfo');
      Object.values(packageMap).forEach((packageTypeMap) => {
        Object.values(packageTypeMap).forEach((componentType) => {
          const metadataInfoType = metadataInfoMap[componentType.type];
          if (metadataInfoType && metadataInfoType.result && metadataInfoType.result.length) {
            componentType.componentList.forEach((component) => {
              const metadataInfo = metadataInfoType.result.find((metadataInfo) => metadataInfo.fullName === component.apiName);
              if (metadataInfo) {
                component.lastModifiedDate = metadataInfo.lastModifiedDate;
                component.lastModifiedBy = metadataInfo.lastModifiedByName;
                component.label = metadataInfo.fileName;
              }
            });
          }
        });
      });

      resolve(packageMap);
      log.log('End Merge Components With MetadataInfo');
    } catch (e) {
      log.log('Error Merge Components With MetadataInfo ' + e);
      reject(e);
    }
  });
}

function createZipComponents(projectPath, packageName, dependencyList, packageMap, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Create Zip Components');

      dependencyList.push(packageName);
      let metadataTypeParser = new MetadataTypeParser(projectPath, log);
      const chunkList = []

      dependencyList.forEach((dependencyPackageName) => {
        metadataTypeParser.packageName = dependencyPackageName;
        metadataTypeParser.packageTypeMap = packageMap[dependencyPackageName];
        chunkList.push(...metadataTypeParser.parseMetadata());
      });

      resolve(chunkList);
      log.log('End Create Zip Components');
    } catch (e) {
      log.log('Error Create Zip Components ' + e);
      reject(e);
    }
  });
}

function sendComponents(flosumUrl, flosumToken, namespacePrefix, chunkList, packageName, snapshotName, orgId, metadataLogId, log) {
  return new Promise((resolve, reject) => {
    try {
      log.log('Start Send Components');
      let snapshotId = '';
      let promiseChain = Promise.resolve();
      for (let i = 0; i < chunkList.length; i++) {
        if (i === 0) {
          promiseChain = promiseChain
            .then(() => callCreateSnapshot(flosumUrl, flosumToken, namespacePrefix, chunkList[i], packageName, snapshotName, orgId, metadataLogId, log))
            .then((res) => snapshotId = res);
        } else {
          promiseChain = promiseChain.then(() => callSentComponents(flosumUrl, flosumToken, namespacePrefix, chunkList[i], packageName, snapshotId, orgId, log));
        }
      }

      promiseChain.then(() => {
        log.log(`End Send Components`);
        resolve();
      })
        .catch((e) => {
          log.log('Error Send Components ' + e);
          reject(e);
        });

    } catch (e) {
      log.log('Error Send Components ' + e);
      reject(e);
    }
  });
}

function callCreateSnapshot(flosumUrl, flosumToken, namespacePrefix, chunk, packageName, snapshotName, orgId, metadataLogId, log) {
  return new Promise((resolve, reject) => {
    try {
      const resBody = { packageName, typeList: chunk.typeList, orgId, snapshotName, metadataLogId };
      const body = { methodType: constants.METHOD_TYPE_CREATE_SNAPSHOT, body: JSON.stringify(resBody) };
      http.post(flosumUrl, flosumToken, namespacePrefix.replace('__', ''), JSON.stringify(body))
        .then((res) => {
          resolve(res.data);
          if (res.data === 'Wrong method type') {
            log.log('You have an old version of the Flosum package, please update.');
            reject();
          }
        })
        .catch((error) => {
          reject(error);
        });
    } catch (e) {
      reject(e);
    }
  });
}

function callSentComponents(flosumUrl, flosumToken, namespacePrefix, chunk, packageName, snapshotId, orgId, log) {
  return new Promise((resolve, reject) => {
    try {
      const resBody = { packageName, typeList: chunk.typeList, orgId, snapshotId };
      const body = { methodType: constants.METHOD_TYPE_ADD_COMPONENTS_TO_SNAPSHOT, body: JSON.stringify(resBody) };
      http.post(flosumUrl, flosumToken, namespacePrefix.replace('__', ''), JSON.stringify(body))
        .then(() => {
          resolve()
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

function callUpdateInfo(flosumUrl, flosumToken, logId, nameSpacePrefix, attachmentLogId, isSuccess, log, isError = false) {
  return new Promise((resolve, reject) => {
    try {
      nameSpacePrefix = (nameSpacePrefix && nameSpacePrefix.length) ? nameSpacePrefix.replace('__', '') : '';
      log.log(`Start Update Log is Success = ${isSuccess}`);
      const resBody = {
        logId,
        attachmentLogId,
        isJobCompleted: true,
        status: isSuccess ? 'Completed' : 'Exception',
        isSuccess,
        isError,
        attachmentBody: `Create Snapshot From Unlocked Package:\n\nFull Process:\n\n${log.logs.join('\n')}`,
      };
      const body = { methodType: constants.METHOD_UPDATE_LOG, body: JSON.stringify(resBody) };
      http.post(flosumUrl, flosumToken, nameSpacePrefix, body)
        .then(() => {
          log.log(`End Update Log`);
          resolve();
        })
        .catch((error) => {
          log.log(`Error Update Log`);
          reject(error);
        });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  retrievePackages,
  unzipPackages,
  getComponentTypesFromPackageXML,
  getMetadataInfo,
  mergeComponentsWithMetadataInfo,
  createZipComponents,
  sendComponents,
  callUpdateInfo
}

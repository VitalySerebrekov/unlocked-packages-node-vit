const childProcess = require('child_process');
const constants = require('../../constants');

function call(command, log, options = {}, isCreateProject = false, isShowLogs = true) {
  return new Promise((resolve, reject) => {
    try {
      log.log(`Start Call Child Process ${command.split('-u')[0]}`);
      childProcess.exec(command, options, ((e, stdout, stderr) => {
        if (e) {
          if (isCreateProject) {
            if (e.message.indexOf(constants.PACKAGE_NAME_MUST_BE_UNIQUE) > -1) {
              log.log(constants.PACKAGE_WITH_THIS_NAME_IS_EXIST);
              resolve(constants.PACKAGE_WITH_THIS_NAME_IS_EXIST);
            }
          }
          log.log(`Error Call Child Process ${command.split('-u')[0]}\n${e}\n${stdout}`);
          reject(e);
        } else {
          log.log(`End Call Child Process ${command.split('-u')[0]}`);
          if (isShowLogs) {
            log.log(stdout);
          }
          resolve(stdout);
        }
      }));
    } catch (e) {
      log.log(`Error Call Child Process ${command.split('-u')[0]}\n${e}`);
      reject(e);
    }
  });
}

module.exports = {
  call
}

const AdmZip = require('adm-zip');
const fs = require('fs');
const X2JS = require('x2js');
const constants = require('../../../constants');
const path = require('path');
const xmlFormat = require('xml-formatter');

class MetadataTypeParser {
  count;
  chunkCounter;
  componentList;
  zip;
  size;
  functionMap;
  packageTypeMap;
  chunkList;
  projectPath;
  packageName;
  log;
  componentTypeListWithMetaXML;

  constructor(projectPath, log) {
    this.projectPath = projectPath;
    this.log = log;

    this.componentTypeListWithMetaXML = [
      'ApexClass',
      'ApexComponent',
      'ApexPage',
      'ApexTrigger',
      'StaticResource',
      'Document'
    ];

    this.innerXMLHeaderMap = {
      CustomApplication: '<?xml version="1.0" encoding="UTF-8"?><CustomApplication xmlns="http://soap.sforce.com/2006/04/metadata">',
      PermissionSetGroup: '<?xml version="1.0" encoding="UTF-8"?><PermissionSetGroup xmlns="http://soap.sforce.com/2006/04/metadata">',
      FlexiPage: '<?xml version="1.0" encoding="UTF-8"?><FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">',
      CustomLabel: '<?xml version="1.0" encoding="UTF-8"?><CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">',
      AssignmentRule: '<?xml version="1.0" encoding="UTF-8"?><AssignmentRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      AutoResponseRule: '<?xml version="1.0" encoding="UTF-8"?><AutoResponseRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowTask: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowOutboundMessage: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowFieldUpdate: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowKnowledgePublish: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowAlert: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      WorkflowRule: '<?xml version="1.0" encoding="UTF-8"?><Workflow xmlns="http://soap.sforce.com/2006/04/metadata">',
      SharingCriteriaRule: '<?xml version="1.0" encoding="UTF-8"?><SharingRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      SharingOwnerRule: '<?xml version="1.0" encoding="UTF-8"?><SharingRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      EscalationRule: '<?xml version="1.0" encoding="UTF-8"?><EscalationRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      MatchingRule: '<?xml version="1.0" encoding="UTF-8"?><MatchingRules xmlns="http://soap.sforce.com/2006/04/metadata">',
      ManagedTopic: '<?xml version="1.0" encoding="UTF-8"?><ManagedTopics xmlns="http://soap.sforce.com/2006/04/metadata">',
      EmailTemplate: '<?xml version="1.0" encoding="UTF-8"?><EmailTemplate xmlns="http://soap.sforce.com/2006/04/metadata">',
      Other: '<?xml version="1.0" encoding="UTF-8"?><CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">'
    };

    this.innerSRCJSONMap = {
      CustomLabel: 'CustomLabels',
      CustomField: 'CustomObject',
      ListView: 'CustomObject',
      CompactLayout: 'CustomObject',
      WebLink: 'CustomObject',
      RecordType: 'CustomObject',
      FieldSet: 'CustomObject',
      EmailTemplate: 'EmailTemplate',
      ValidationRule: 'CustomObject',
      BusinessProcess: 'CustomObject',
      SharingReason: 'CustomObject',
      AssignmentRule: 'AssignmentRules',
      AutoResponseRule: 'AutoResponseRules',
      WorkflowTask: 'Workflow',
      WorkflowOutboundMessage: 'Workflow',
      WorkflowFieldUpdate: 'Workflow',
      WorkflowKnowledgePublish: 'Workflow',
      WorkflowAlert: 'Workflow',
      WorkflowRule: 'Workflow',
      SharingCriteriaRule: 'SharingRules',
      SharingOwnerRule: 'SharingRules',
      EscalationRule: 'EscalationRules',
      MatchingRule: 'MatchingRules',
      ManagedTopic: 'ManagedTopics'
    };

    this.customObjectChildMap = {
      CustomLabel: 'labels',
      CustomField: 'fields',
      ListView: 'listViews',
      CompactLayout: 'compactLayouts',
      WebLink: 'webLinks',
      RecordType: 'recordTypes',
      FieldSet: 'fieldSets',
      ValidationRule: 'validationRules',
      BusinessProcess: 'businessProcesses',
      SharingReason: 'sharingReasons',
      AssignmentRule: 'assignmentRule',
      AutoResponseRule: 'autoResponseRule',
      WorkflowTask: 'tasks',
      WorkflowOutboundMessage: 'outboundMessages',
      WorkflowFieldUpdate: 'fieldUpdates',
      WorkflowKnowledgePublish: 'knowledgePublishes',
      WorkflowAlert: 'alerts',
      WorkflowRule: 'rules',
      SharingCriteriaRule: 'sharingCriteriaRules',
      SharingOwnerRule: 'sharingOwnerRules',
      EscalationRule: 'escalationRule',
      MatchingRule: 'matchingRules',
      ManagedTopic: 'managedTopic'
    };

    this.functionMap = {
      ApexClass: this.getDefaultTypes,
      ApexComponent: this.getDefaultTypes,
      ApexPage: this.getDefaultTypes,
      ApexTrigger: this.getDefaultTypes,
      AppMenu: this.getDefaultTypes,
      AssignmentRule: this.getChildTypesFromCustomObject,
      AutoResponseRule: this.getChildTypesFromCustomObject,
      AuraDefinitionBundle: this.getDefaultTypes,
      ApexTestSuite: this.getDefaultTypes,
      BrandingSet: this.getDefaultTypes,
      BusinessProcess: this.getChildTypesFromCustomObject,
      CustomObject: this.getDefaultTypes,
      CustomPermission: this.getDefaultTypes,
      CustomNotificationType: this.getDefaultTypes,
      CustomObjectTranslation: this.getDefaultTypes,
      CustomTab: this.getDefaultTypes,
      ContentAsset: this.getDefaultTypes,
      CustomMetadata: this.getDefaultTypes,
      CustomApplication: this.getDefaultTypes,
      CustomLabel: this.customLabelProcessor,
      // CustomLabel: this.getDefaultTypes,
      // CustomLabels: this.customLabelProcessor,
      CustomField: this.getChildTypesFromCustomObject,
      CompactLayout: this.getChildTypesFromCustomObject,
      Document: this.getTypesFromFolder,
      EscalationRule: this.getChildTypesFromCustomObject,
      EmailTemplate: this.getFolderWithTypesFromFolder,
      FlexiPage: this.getDefaultTypes,
      Flow: this.getDefaultTypes,
      FlowDefinition: this.getDefaultTypes,
      FieldSet: this.getChildTypesFromCustomObject,
      GlobalValueSet: this.getDefaultTypes,
      Group: this.getDefaultTypes,
      HomePageLayout: this.getDefaultTypes,
      IframeWhiteListUrlSettings: this.getDefaultTypes,
      Layout: this.getDefaultTypes,
      LightningComponentBundle: this.getDefaultTypes,
      LightningExperienceTheme: this.getDefaultTypes,
      ListView: this.getChildTypesFromCustomObject,
      MatchingRule: this.getChildTypesFromCustomObject,
      ManagedTopic: this.getChildTypesFromCustomObject,
      NamedCredential: this.getDefaultTypes,
      PermissionSet: this.getDefaultTypes,
      PermissionSetGroup: this.getDefaultTypes,
      PathAssistant: this.getDefaultTypes,
      Queue: this.getDefaultTypes,
      QuickAction: this.getDefaultTypes,
      RemoteSiteSetting: this.getDefaultTypes,
      Report: this.getTypesFromFolder,
      ReportType: this.getDefaultTypes,
      RecordType: this.getRecordTypes,
      Role: this.getDefaultTypes,
      StaticResource: this.getDefaultTypes,
      SharingOwnerRule: this.getChildTypesFromCustomObject,
      SharingCriteriaRule: this.getChildTypesFromCustomObject,
      SharingReason: this.getChildTypesFromCustomObject,
      Settings: this.getDefaultTypes,
      StandardValueSet: this.getDefaultTypes,
      ValidationRule: this.getChildTypesFromCustomObject,
      WebLink: this.getChildTypesFromCustomObject,
      Workflow: this.getDefaultTypes,
      WorkflowTask: this.getChildTypesFromCustomObject,
      WorkflowOutboundMessage: this.getChildTypesFromCustomObject,
      WorkflowFieldUpdate: this.getChildTypesFromCustomObject,
      WorkflowKnowledgePublish: this.getChildTypesFromCustomObject,
      WorkflowAlert: this.getChildTypesFromCustomObject,
      WorkflowRule: this.getChildTypesFromCustomObject
    }
  }

  init() {
    this.zip = new AdmZip();
    this.count = 0;
    this.chunkCounter = 0;
    this.componentList = [];
    this.size = 0;
    this.chunkList = [{ typeList: [] }];
  }

  parseMetadata() {
    this.init();
    if (!this.packageTypeMap || !this.packageName) {
      throw new Error('Please set properties \'packageTypeMap\' and \'packageName\'')
    }
    Object.values(this.packageTypeMap).forEach((type) => {
      const folderType = constants.METADATA_FOLDER_TYPE_MAP[type.type];
      const folderTypePath = `${this.projectPath}/${this.packageName}/${folderType}`;
      if (folderType && fs.existsSync(folderTypePath)) {
        const folderContentList = fs.readdirSync(folderTypePath, { withFileTypes: true });
        if (this.functionMap[type.type]) {
          this.functionMap[type.type].call(this, type, folderContentList, folderType);
        } else {
          this.log.log(`Unsupported Component Type ${type.type}. Handler Not Found.`);
        }
      } else {
        this.log.log(`Unsupported Component Type ${type.type}. Folder Not Found.`);
      }

      const zipBuffer = this.zip.toBuffer().toString('base64');
      if (zipBuffer !== 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==') {
        this.chunkList[this.chunkCounter].typeList.push({ componentList: this.componentList, type: type.type, zip: zipBuffer });
        this.log.log(`Component Type: ${type.type}, count: ${this.count}`);
      }
      this.zip = new AdmZip();
      this.componentList = [];
      this.count = 0;
    });

    return this.chunkList;
  }

  //  EmailTemplate (folders)
  getFolderWithTypesFromFolder(type, folderContentList, folderType) {
    folderContentList.forEach((folderContentDirent) => {
      if (folderContentDirent.name.includes('-meta.xml')) {
        const folderXMLPath = `${this.projectPath}/${this.packageName}/${folderType}/${folderContentDirent.name}`;
        this.zip.addLocalFile(`${folderXMLPath}`, `${folderType}`);   //  folder retrieved => new ZIP component
      }
    });
    this.getTypesFromFolder(type, folderContentList, folderType);
  }

  //Document, EmailTemplate, Report
  getTypesFromFolder(type, folderContentList, folderType) {
    const typePath = `${this.projectPath}/${this.packageName}/${folderType}`;
    type.componentList.forEach((component) => {
      const componentPathList = component.apiName.split('/');
      const componentFolder = componentPathList[0];
      const componentFile = componentPathList[1];
      const componentFolderPath = `${typePath}/${componentFolder}`
      if (fs.existsSync(componentFolderPath)) {
        const folderComponentContentList = fs.readdirSync(componentFolderPath, { withFileTypes: true });
        folderComponentContentList.forEach((content) => {
          if (`${componentFolder}/${content.name}`.includes(`${componentFile}.`)) {
            this.size += fs.statSync(`${componentFolderPath}/${content.name}`).size;
            this.zip.addLocalFile(`${componentFolderPath}/${content.name}`, `${folderType}/${componentFolder}`);
            if (!content.name.includes('-meta.xml')) {
              component.label = `${folderType}/${componentFolder}/${content.name}`;
              if (type.type === 'Document') {
                component.apiName = `${componentFolder}/${content.name}`;
              }
              component.folder = componentFolder;
              this.componentList.push(component);
              this.count++;
              this.updateChunkList(type);
            }
          }
        });
      }
      delete component.isDirectory;
      delete component.fileList;
    });
  }

  // ApexClass, ApexComponent, ApexPage, ApexTrigger, AppMenu, AuraDefinitionBundle,
  // CustomObjects, CustomPermission, CustomTab, FlexiPage, Flow, FlowDefinition, GlobalValueSet,
  // HomePageLayout, IframeWhiteListUrlSettings, Layout, LightningComponentBundle, NamedCredential,
  // PermissionSet, PermissionSetGroup, RemoteSiteSetting, ReportType, Workflow, ApexTestSuite, StandardValueSet, Settings,
  // Role, QuickAction, Queue, PathAssistant, CustomObjectTranslation, CustomNotificationType,
  // LightningExperienceTheme, Group, CustomMetadata, ContentAsset, CustomApplication
  getDefaultTypes(type, folderContentList, folderType){
    const typePath = `${this.projectPath}/${this.packageName}/${folderType}`;
    type.componentList.forEach((component) => {
      folderContentList.forEach((content) => {
        const objectExtend = path.parse(content.name)
        if (objectExtend.name === component.apiName
          || (objectExtend.ext === '.xml' && objectExtend.name.includes(component.apiName + '.'))
        ) {
          component.fileList.push(content.name);
          component.isDirectory = content.isDirectory();
          if (!content.name.includes('-meta.xml')) {
            component.label = `${folderType}/${content.name}`;
          }
        }
      });
    });

    type.componentList.forEach((component) => {
      this.componentList.push(component);
      this.count++;
      component.fileList.forEach((file) => {
        this.size += fs.statSync(`${typePath}/${file}`).size;
        if (component.isDirectory) {
          this.zip.addLocalFolder(`${typePath}/${file}`, `${folderType}/${file}`);
        } else {
          this.zip.addLocalFile(`${typePath}/${file}`, folderType);
        }
      });
      this.updateChunkList(type);
      delete component.isDirectory;
      delete component.fileList;
    });

  }

  // CustomField, ListView, ValidationRule, WebLink
  getChildTypesFromCustomObject(type, folderContentList, folderType) {
    if (!this.customObjectChildMap[type.type]) {
      this.log.log(`Unsupported Component Type ${type.type}. Child Type Not Found.`);
      return
    }
    const typePath = `${this.projectPath}/${this.packageName}/${folderType}`;
    const prepareObjectMap = {};
    folderContentList.forEach((content) => {
      type.componentList.forEach((component) => {
        if (component.apiName.split('.')[0] === path.parse(content.name).name) {
          if (!prepareObjectMap[content.name]) {
            prepareObjectMap[content.name] = { name : content.name, componentList: [component] }
          } else {
            prepareObjectMap[content.name].componentList.push(component);
          }
          component.label = `${folderType}/${content.name}`;
          type.fileName = content.name;
        }
      });
    });

    const customObjectList = [];
    Object.keys(prepareObjectMap).forEach((key) => {
      const content = prepareObjectMap[key];
      customObjectList.push({
        file: fs.readFileSync(`${typePath}/${content.name}`, 'utf8'),
        fileName: content.name,
        componentList: content.componentList
      });
    });

    const customFieldList = this.convertToChildType(customObjectList, this.customObjectChildMap[type.type]);
    customFieldList.forEach((customField) => {
      this.size += customField.file.length;
      this.zip.addFile(`objects/${customField.fileName}`, Buffer.from(customField.file, 'utf-8'), '');
      this.componentList.push(...customField.componentList);
      this.count += customField.componentList.length;
      this.updateChunkList(type);
    });
    type.zip = this.zip.toBuffer().toString('base64');
  }

  customLabelProcessor(type, folderContentList, folderType) {
    const customLabelPath = `${this.projectPath}/${this.packageName}/${folderType}/CustomLabels.labels`;

    const xml = fs.readFileSync(customLabelPath)?.toString('utf8');
    const header = this.getHeader('CustomLabel');
    let fullLabelXML = '';
    const footer = this.getFooter('CustomLabel');
    let count = 0;
    type.componentList.forEach((component) => {
      const labelXML = this.getChildXML(xml, component.componentType, component.apiName);
      if (labelXML) {
        fullLabelXML += labelXML;
        this.componentList.push(component);
        count++;
      }
      if (count > 1000) {
        // const full = `${header}${fullLabelXML}${footer}`;
        const full = xmlFormat(`${header}${fullLabelXML}${footer}`, { collapseContent: true, lineSeparator: '\n' });

        this.zip.addFile(`${folderType}/CustomLabels.labels`, full);
        this.updateChunkList('CustomLabel');
        fullLabelXML = '';
      }
    });

    if (this.componentList.length) {
      // const full = `${header}${fullLabelXML}${footer}`;
      const full = xmlFormat(`${header}${fullLabelXML}${footer}`, { collapseContent: true, lineSeparator: '\n' });

      this.zip.addFile(`${folderType}/CustomLabels.labels`, full);
      this.updateChunkList('CustomLabel');
    }
  }

  getFooter (type) {
    return `</${this.innerSRCJSONMap[type]}>`
  }

  getHeader (type) {
    return this.innerXMLHeaderMap[type] ? this.innerXMLHeaderMap[type] : this.innerXMLHeaderMap.Other;
  }

  getChildXML(xml, type, componentName) {
    componentName = componentName.includes('.') ? componentName.split('.')[1] : componentName;
    const x2js = new X2JS({ useDoubleQuotes: true, stripWhitespaces: false, escapeMode: true });

    let jsonItem = {};
    const srcJson = x2js.xml2js(xml);

    const getBody = (tempJSON, type) => {
      return `<${this.customObjectChildMap[type]}>${x2js.js2xml(JSON.parse(tempJSON))}</${this.customObjectChildMap[type]}>`
    }

    if (srcJson) {
      const srcItemList = srcJson[this.innerSRCJSONMap[type]][this.customObjectChildMap[type]];
      if (srcItemList) {
        if (srcItemList.fullName && srcItemList.fullName === componentName) {
          jsonItem = JSON.stringify(srcItemList);
        } else {
          srcItemList.forEach((item) =>  {
            if (item.fullName === componentName) {
              jsonItem = JSON.stringify(item)
            }
          });
        }
      }
    }

    if (jsonItem) {
      return getBody(jsonItem, type);
    }
    return '';
  }

  getRecordTypes(type, folderContentList, folderType) {
    const typePath = `${this.projectPath}/${this.packageName}/${folderType}`;
    const antiDuplicateFieldSet = new Set();
    folderContentList.forEach((content) => {
      type.componentList.forEach((component) => {
        if (path.parse(content.name).name === component.apiName.split('.')[0]) {
          this.componentList.push(component);
          this.count++;
          component.label = `${folderType}/${content.name}`;

          if (!antiDuplicateFieldSet.has(content.name)) {
            antiDuplicateFieldSet.add(content.name);
            this.zip.addLocalFile(`${typePath}/${content.name}`, folderType);
            this.updateChunkList(type);
          }
        }
      });
    });
  }

  updateChunkList(type) {
    if (this.size > constants.MAX_SIZE_UNZIP_ATTACHMENT) {
      this.log.log(`Component Type: ${type.type}, count: ${this.count}`);
      this.chunkList[this.chunkCounter].typeList.push({ componentList: this.componentList, type: type.type, zip :  this.zip.toBuffer().toString('base64') });
      this.chunkList.push({ typeList: [] });
      this.zip = new AdmZip();
      this.size = 0;
      this.chunkCounter++;
      this.componentList = [];
      this.count = 0
    }
  }

  convertToChildType(customObjectList, childType) {
    const customFieldList = [];
    customObjectList.forEach((customObjectXML) => {
      const customFieldRows = [];
      const rows = customObjectXML.file.split('\n');
      let start = false;
      rows.forEach((row) => {

        if (
          row.includes('<?xml version="1.0" encoding="UTF-8"?>') ||
          row.startsWith('<CustomObject') ||
          row.startsWith('</CustomObject')
        ) {
          customFieldRows.push(row);
        }
        if (row.includes(`<${childType}>`)) {
          start = true;
        }
        if (start) {
          customFieldRows.push(row);
        }

        if (row.includes(`</${childType}>`)) {
          start = false;
        }

      });
      customFieldList.push({
        fileName: customObjectXML.fileName,
        file: customFieldRows.join('\n'),
        componentList: customObjectXML.componentList
      });
    });
    return customFieldList;
  }
}

module.exports = {
  MetadataTypeParser
}

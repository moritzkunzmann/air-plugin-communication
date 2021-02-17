require("../css/styles.css");

const pluginName = "air-plugin-communication";
const pluginVersion = "0.1.0";

const containerName = pluginName + "-container";

const minervaProxyServer = "https://minerva-dev.lcsb.uni.lu/minerva-proxy/";

const globals = {
  selected: [],
  allBioEntities: [],
  pickedRandomly: undefined,
};

let $ = window.$;
if ($ === undefined && minerva.$ !== undefined) {
  $ = minerva.$;
}

// ******************************************************************************
// ********************* PLUGIN REGISTRATION WITH MINERVA *********************
// ******************************************************************************

let minervaProxy;
let pluginContainer;
let pluginContainerId;
let minervaVersion;

const register = function (_minerva) {
  console.log("registering " + pluginName + " plugin");

  _minerva.pluginData.setGlobalParam("test", "yupi");

  $(".tab-content").css("position", "relative");

  minervaProxy = _minerva;
  pluginContainer = $(minervaProxy.element);
  pluginContainerId = pluginContainer.attr("id");
  if (!pluginContainerId) {
    //the structure of plugin was changed at some point and additional div was added which is the container but does not have any properties (id or height)
    pluginContainerId = pluginContainer.parent().attr("id");
  }

  console.log("minerva object ", minervaProxy);
  console.log("project id: ", minervaProxy.project.data.getProjectId());
  console.log("model id: ", minervaProxy.project.data.getModels()[0].modelId);

  return minerva.ServerConnector.getConfiguration().then(function (conf) {
    minervaVersion = parseFloat(
      conf.getVersion().split(".").slice(0, 2).join(".")
    );
    console.log("minerva version: ", minervaVersion);
    initPlugin();
  });
};

const unregister = function () {
  console.log("unregistering " + pluginName + " plugin");

  unregisterListeners();
  return deHighlightAll();
};

const getName = function () {
  return pluginName;
};

const getVersion = function () {
  return pluginVersion;
};

/**
 * Function provided by Minerva to register the plugin
 */
minervaDefine(function () {
  return {
    register: register,
    unregister: unregister,
    getName: getName,
    getVersion: getVersion,
    minWidth: 400,
    defaultWidth: 500,
  };
});

function initPlugin() {
  registerListeners();
  initMainPageStructure();
  pluginContainer.find(`.${containerName}`).data("minervaProxy", minervaProxy);
}

function registerListeners() {
  minervaProxy.project.map.addListener({
    dbOverlayName: "search",
    type: "onSearch",
    callback: searchListener,
  });
}

function unregisterListeners() {
  minervaProxy.project.map.removeAllListeners();
}

// ****************************************************************************
// ********************* MINERVA INTERACTION*********************
// ****************************************************************************

function deHighlightAll() {
  return minervaProxy.project.map
    .getHighlightedBioEntities()
    .then((highlighted) => minervaProxy.project.map.hideBioEntity(highlighted));
}

// ****************************************************************************
// ********************* PLUGIN STRUCTURE AND INTERACTION*********************
// ****************************************************************************

function initMainPageStructure() {
  const container = $(`<div class=${containerName}></div>`).appendTo(
    pluginContainer
  );

  container.append(`
        <div class="panel panel-default card panel-events mb-2">
            <div class="panel-heading card-header">Events (Select an element in the map)</div>
            <div class="panel-body card-body">                
            </div>
        </div>
    `);

  container.append("<hr>");
  container.append(
    '<button type="button" class="btn-load btn btn-primary btn-default btn-block">Retrieve Global Parameter</button>'
  );
  container.append(`
        <div class="panel panel-default card panel-global-param mb-2">
            <div class="panel-heading card-header">Global Parameter</div>
            <div class="panel-body card-body">                
            </div>
        </div>
    `);

  container.find(".btn-load").on("click", () => loadParam());
}

function searchListener(entites) {
  globals.selected = entites[0];

  let str = "";
  if (globals.selected.length > 0) {
    globals.selected.forEach((e) => {
      if (e.constructor.name === "Alias")
        str += `<div>${e.getName()} - ${e.getElementId()}</div>`;
    });
  }
  pluginContainer.find(".panel-events .panel-body").html(str);
}

function loadParam() {
  let paramGlobal = minervaProxy.getGlobalParam("rObject");
  let paramUser = minervaProxy.getUserParam("rObject");
  let param = paramGlobal;

  console.log("global Param: ", paramGlobal, "\nuser Param: ", paramUser);

  let str = "";
  !!param
    ? (str += `<div>${param}</div>`)
    : (str += `<div>rObject Undefined</div>`);
  if (!!param) {
    str += `<div>${param}</div>`;
  }

  pluginContainer.find(".panel-global-param .panel-body").html(str);
}

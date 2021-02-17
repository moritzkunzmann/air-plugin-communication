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
  container.append(
    '<button type="button" class="btn-focus btn btn-primary btn-default btn-block">Focus</button>'
  );
  container.append(
    '<button type="button" class="btn-highlight btn btn-primary btn-default btn-block">Highlight (icon)</button>'
  );

  container.append("<hr>");
  container.append(
    '<button type="button" class="btn-pick-random btn btn-primary btn-default btn-block">Retrieve random object from map</button>'
  );
  container.append(`
        <div class="panel panel-default card panel-randomly-picked mb-2">
            <div class="panel-heading card-header">Randomly picked object</div>
            <div class="panel-body card-body">                
            </div>
        </div>
    `);
  container.append(
    '<button type="button" class="btn-focus-random btn btn-primary btn-default btn-block">Focus</button>'
  );
  container.append(
    '<button type="button" class="btn-highlight-random btn btn-primary btn-default btn-block">Highlight (surface)</button>'
  );

  container.append("<hr>");
  container.append("<h4>Query UniProt API</h4>");
  container.append(
    '<button type="button" class="btn-uniprot btn btn-primary btn-default btn-block" ' +
      'title="Queries UniProt using the element selected from the map">Retrieve from UniProt</button>'
  );
  container.append(`
        <div class="panel panel-default card panel-uniprot">
            <div class="panel-heading card-header">Uniprot records for the selected element</div>
            <div class="panel-body card-body">
                <code></code>
            </div>
        </div>
    `);

  container.append("<hr>");
  container.append("<h4>Query Minerva API</h4>");
  container.append(`
        <form class="form-horizontal">
            <div class="form-group row">
                <label class="col-sm-2 control-label">Address</label>
                <div class="col-sm-10">
                    <input class="input-minerva-address form-control" value="https://minerva-dev.lcsb.uni.lu/minerva">
                </div>
            </div>
            <div class="form-group row">
                <label class="col-sm-2 control-label">Project ID</label>
                <div class="col-sm-10">
                    <input class="input-minerva-projectid form-control" value="sample">
                </div>
            </div>                        
        </form>
        <button type="button" class="btn-minerva btn btn-primary btn-default btn-block">Retrieve from Minerva</button>
        <div class="panel panel-default card panel-minerva">
            <div class="panel-heading card-header">Names of elements</div>
            <div class="panel-body card-body">                
            </div>
        </div>
    `);

  container.find(".btn-highlight").on("click", () => highlightSelected());
  container.find(".btn-focus").on("click", () => focusOnSelected());
  container.find(".btn-pick-random").on("click", () => pickRandom());
  container
    .find(".btn-highlight-random")
    .on("click", () => highlightSelected(true));
  container.find(".btn-focus-random").on("click", () => focusOnSelected(true));
  container.find(".btn-uniprot").on("click", () => retrieveUniprot());
  container.find(".btn-minerva").on("click", () => retrieveMinerva());
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

function pickRandom() {
  function pick() {
    globals.pickedRandomly =
      globals.allBioEntities[
        Math.floor(Math.random() * globals.allBioEntities.length)
      ];

    let html = `${globals.pickedRandomly.constructor.name} - `;
    if (globals.pickedRandomly.constructor.name === "Alias")
      html += `${globals.pickedRandomly.getElementId()} - ${globals.pickedRandomly.getName()}`;
    else html += `${globals.pickedRandomly.getReactionId()}`;
    pluginContainer.find(".panel-randomly-picked .panel-body").html(html);
  }
  if (globals.allBioEntities.length > 0) {
    pick();
  } else {
    minervaProxy.project.data.getAllBioEntities().then(function (bioEntities) {
      globals.allBioEntities = bioEntities;
      pick();
    });
  }
}

function highlightSelected(pickedRandomly = false) {
  const highlightDefs = [];

  if (pickedRandomly) {
    if (globals.pickedRandomly) {
      highlightDefs.push({
        element: {
          id: globals.pickedRandomly.id,
          modelId: globals.pickedRandomly.getModelId(),
          type: globals.pickedRandomly.constructor.name.toUpperCase(),
        },
        type: "SURFACE",
        options: {
          color: "#00FF00",
          opacity: 0.2,
        },
      });
    }
  } else {
    globals.selected.forEach((e) => {
      highlightDefs.push({
        element: {
          id: e.id,
          modelId: e.getModelId(),
          type: "ALIAS",
        },
        type: "ICON",
      });
    });
  }

  minervaProxy.project.map.showBioEntity(highlightDefs);
}

function focusOnSelected(pickedRandomly = false) {
  function focus(entity) {
    if (entity.constructor.name === "Alias") {
      minervaProxy.project.map.fitBounds({
        modelId: entity.getModelId(),
        x1: entity.getX(),
        y1: entity.getY(),
        x2: entity.getX() + entity.getWidth(),
        y2: entity.getY() + entity.getHeight(),
      });
    } else {
      minervaProxy.project.map.fitBounds({
        modelId: entity.getModelId(),
        x1: entity.getCenter().x,
        y1: entity.getCenter().y,
        x2: entity.getCenter().x,
        y2: entity.getCenter().y,
      });
    }
  }

  if (!pickedRandomly && globals.selected.length > 0)
    focus(globals.selected[0]);
  if (pickedRandomly && globals.pickedRandomly) focus(globals.pickedRandomly);
}

function retrieveUniprot() {
  let query = pluginContainer.find(".panel-events .panel-body").text();
  query = query.substring(0, query.indexOf(" - "));
  console.log(query);
  $.ajax({
    type: "GET",
    url:
      "https://www.uniprot.org/uniprot/?query=" +
      query +
      "&sort=score&columns=id,entry%20name,reviewed,protein%20names,3d,genes,organism,length&format=tab&limit=10",
  }).then(function (result) {
    pluginContainer.find(".panel-uniprot .panel-body code").text(result);
  });
}

function retrieveMinerva() {
  const address = pluginContainer.find(".input-minerva-address").val();
  const projectId = pluginContainer.find(".input-minerva-projectid").val();

  $.ajax({
    type: "GET",
    url: `${minervaProxyServer}?url=${address}/api/projects/${projectId}/models/`,
    dataType: "json",
  })
    .then((models) => {
      console.log(`Retrived models from ${minervaProxyServer}`, models);
      const firstModelId = models[0].idObject;
      return $.ajax({
        type: "GET",
        url: `${minervaProxyServer}?url=${address}/api/projects/${projectId}/models/${firstModelId}/bioEntities/elements/`,
        dataType: "json",
      });
    })
    .then((elements) => {
      console.log(`Retrived elements from ${minervaProxyServer}`, elements);
      let names = "";
      elements.forEach(function (element) {
        names += element.name + "<br/>";
      });
      pluginContainer.find(".panel-minerva .panel-body").html(names);
    });
}

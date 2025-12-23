function _1(md){return(
md`# Spike Globe

這是一個以人口資料呈現的 3D spike globe，讓你從地球視角理解各國人口分布的差異。

資料來源： [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/)。`
)}

async function* _2(d3,size,styles,worldGeo,path,projection,geometric,spike,settings,filteredGeo,maxPopulation,visibility)
{
  const svg = d3.create("svg")
      .attr("class", "globe")
      .attr("width", size)
      .attr("height", size);
  
  svg.append("style").html(styles);

  const sphere = svg.append("path")
      .datum({type: "Sphere"})
      .attr("class", "sphere");
  
  const countries = svg.selectAll(".country")
      .data(worldGeo.features)
    .enter().append("path")
      .attr("class", "country");
  
  const spikes = svg.selectAll(".spike")
      .data(filteredGeo.features, d => d.properties.ISO_A3)
    .enter().append("polyline")
      .attr("class", "spike")
      .attr("fill-opacity", settings.spikeOpacity);

  const labels = svg.append("g")
      .attr("class", "spike-labels")
    .selectAll("text")
      .data(filteredGeo.features, d => d.properties.ISO_A3)
    .enter().append("text")
      .attr("class", "spike-label")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.35em");

  const formatNumber = new Intl.NumberFormat("en", {notation: "compact"});
  const heightScale = d3.scaleLinear()
      .domain([0, maxPopulation])
      .range([0, settings.maxSpikeHeight]);

  function getLabelText(d){
    const name = d.properties.ADMIN;
    const value = formatNumber.format(d.properties.POP_EST);
    if (settings.showNames && settings.showNumbers) return `${name} (${value})`;
    if (settings.showNames) return name;
    if (settings.showNumbers) return value;
    return "";
  }

  function render(){
    sphere.attr("d", path);
    countries.attr("d", path);
    spikes
        .classed("hide", d => !path({ type: "Point", coordinates: d.base }))
        .attr("points", d => {
          const p = projection(d.base),
                a = geometric.lineAngle([[size / 2, size / 2], p]);

          return spike()
              .x(p[0])
              .y(p[1])
              .angle(a)
              .width(settings.spikeWidth)
              .height(heightScale(d.properties.POP_EST))
              ();
        })
        .attr("fill-opacity", settings.spikeOpacity);

    labels
        .text(getLabelText)
        .classed("hide", d => !path({ type: "Point", coordinates: d.base }))
        .style("display", settings.showNames || settings.showNumbers ? null : "none")
        .attr("x", d => {
          const p = projection(d.base);
          const a = geometric.lineAngle([[size / 2, size / 2], p]);
          const tip = geometric.pointTranslate(p, a, heightScale(d.properties.POP_EST));
          return tip[0];
        })
        .attr("y", d => {
          const p = projection(d.base);
          const a = geometric.lineAngle([[size / 2, size / 2], p]);
          const tip = geometric.pointTranslate(p, a, heightScale(d.properties.POP_EST));
          return tip[1];
        });
  }
  
  let spin = true;
 
  d3.geoInertiaDrag(svg, _ => {
    spin = false;
    spikes.classed("fast-fade", 1);
    render();
  }, projection);
  
  yield svg.node();
  
  for (let x = 0; spin; ++x) {
    projection.rotate([x * settings.rotationSpeed, 0, 0]);
    render();
    yield svg.node();
    await visibility();
  }
}

function _viewofSettings(html){
  const form = html`<form class="control-panel">
    <div class="panel-header">參數調整</div>
    <label class="control-row">
      <span>調整模式</span>
      <select name="mode">
        <option value="dynamic" selected>動態調整（即時生效）</option>
        <option value="static">靜態調整（按下確認）</option>
      </select>
    </label>
    <label class="control-row">
      <span>最大 spike 高度</span>
      <input name="maxSpikeHeight" type="range" min="80" max="300" step="10" value="200" />
      <span class="value" data-for="maxSpikeHeight">200</span>
    </label>
    <label class="control-row">
      <span>spike 寬度</span>
      <input name="spikeWidth" type="range" min="2" max="16" step="1" value="7" />
      <span class="value" data-for="spikeWidth">7</span>
    </label>
    <label class="control-row">
      <span>spike 透明度</span>
      <input name="spikeOpacity" type="range" min="0.1" max="1" step="0.05" value="0.3" />
      <span class="value" data-for="spikeOpacity">0.3</span>
    </label>
    <label class="control-row">
      <span>旋轉速度</span>
      <input name="rotationSpeed" type="range" min="0.05" max="0.6" step="0.05" value="0.25" />
      <span class="value" data-for="rotationSpeed">0.25</span>
    </label>
    <label class="control-row checkbox">
      <input name="showNumbers" type="checkbox" />
      <span>顯示人口數字</span>
    </label>
    <label class="control-row checkbox">
      <input name="showNames" type="checkbox" />
      <span>顯示國家名稱</span>
    </label>
    <label class="control-row checkbox">
      <input name="panelTransparent" type="checkbox" />
      <span>浮動窗格半透明</span>
    </label>
    <button class="apply-button" type="button" disabled>確認套用</button>
  </form>`;

  const valueEls = new Map(
    Array.from(form.querySelectorAll(".value")).map(el => [el.dataset.for, el])
  );
  const applyButton = form.querySelector(".apply-button");
  const modeSelect = form.querySelector("select[name=mode]");
  const panelTransparent = form.querySelector("input[name=panelTransparent]");

  const readValues = () => ({
    mode: modeSelect.value,
    maxSpikeHeight: Number(form.maxSpikeHeight.value),
    spikeWidth: Number(form.spikeWidth.value),
    spikeOpacity: Number(form.spikeOpacity.value),
    rotationSpeed: Number(form.rotationSpeed.value),
    showNumbers: form.showNumbers.checked,
    showNames: form.showNames.checked,
    panelTransparent: panelTransparent.checked
  });

  const updateValueLabels = () => {
    valueEls.get("maxSpikeHeight").textContent = form.maxSpikeHeight.value;
    valueEls.get("spikeWidth").textContent = form.spikeWidth.value;
    valueEls.get("spikeOpacity").textContent = form.spikeOpacity.value;
    valueEls.get("rotationSpeed").textContent = form.rotationSpeed.value;
  };

  const setPanelTransparency = () => {
    form.classList.toggle("panel--transparent", panelTransparent.checked);
  };

  const commit = () => {
    form.value = readValues();
    form.dispatchEvent(new Event("input", {bubbles: true}));
  };

  form.addEventListener("input", event => {
    if (event.target.name === "panelTransparent") {
      setPanelTransparency();
    }
    if (event.target.matches("input[type=range]")) {
      updateValueLabels();
    }
    if (event.target.name === "mode") {
      applyButton.disabled = modeSelect.value === "dynamic";
      if (modeSelect.value === "dynamic") {
        commit();
      }
      return;
    }
    if (modeSelect.value === "dynamic") {
      commit();
    }
  });

  applyButton.addEventListener("click", () => {
    commit();
  });

  updateValueLabels();
  setPanelTransparency();
  applyButton.disabled = modeSelect.value === "dynamic";
  form.value = readValues();

  return form;
}

function _settings(Generators,viewofSettings){
  return Generators.input(viewofSettings);
}

function _viewofCountrySelection(html,worldGeo){
  const container = html`<section class="country-filter">
    <div class="filter-header">
      <h2>國家篩選</h2>
      <div class="filter-actions">
        <button type="button" data-action="select-all">全選</button>
        <button type="button" data-action="clear">全不選</button>
      </div>
    </div>
    <label class="filter-search">
      <span>搜尋國家</span>
      <input type="search" placeholder="輸入國家名稱" />
    </label>
    <div class="filter-count"></div>
    <div class="filter-table">
      <table>
        <thead>
          <tr>
            <th>顯示</th>
            <th>國家</th>
            <th>人口（估計）</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </section>`;

  const searchInput = container.querySelector("input[type=search]");
  const tbody = container.querySelector("tbody");
  const count = container.querySelector(".filter-count");
  const selectAllButton = container.querySelector("button[data-action=select-all]");
  const clearButton = container.querySelector("button[data-action=clear]");

  const data = worldGeo.features
    .map(d => ({
      id: d.properties.ISO_A3 || d.properties.ADMIN,
      name: d.properties.ADMIN,
      population: d.properties.POP_EST
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selection = new Set(data.map(d => d.id));
  const formatter = new Intl.NumberFormat("en", {notation: "compact"});

  const updateCount = () => {
    count.textContent = `已選擇 ${selection.size} / ${data.length} 個國家`;
  };

  const updateValue = () => {
    container.value = new Set(selection);
    container.dispatchEvent(new Event("input", {bubbles: true}));
    updateCount();
  };

  const rows = data.map(d => {
    const row = document.createElement("tr");
    row.dataset.name = d.name.toLowerCase();
    row.dataset.id = d.id;

    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selection.add(d.id);
      } else {
        selection.delete(d.id);
      }
      updateValue();
    });
    checkboxCell.appendChild(checkbox);

    const nameCell = document.createElement("td");
    nameCell.textContent = d.name;

    const popCell = document.createElement("td");
    popCell.textContent = formatter.format(d.population);

    row.appendChild(checkboxCell);
    row.appendChild(nameCell);
    row.appendChild(popCell);
    tbody.appendChild(row);
    return row;
  });

  const applySearch = () => {
    const query = searchInput.value.trim().toLowerCase();
    rows.forEach(row => {
      row.style.display = !query || row.dataset.name.includes(query) ? "" : "none";
    });
  };

  searchInput.addEventListener("input", applySearch);

  selectAllButton.addEventListener("click", () => {
    selection.clear();
    data.forEach(d => selection.add(d.id));
    rows.forEach(row => {
      row.querySelector("input[type=checkbox]").checked = true;
    });
    updateValue();
  });

  clearButton.addEventListener("click", () => {
    selection.clear();
    rows.forEach(row => {
      row.querySelector("input[type=checkbox]").checked = false;
    });
    updateValue();
  });

  updateValue();

  return container;
}

function _countrySelection(Generators,viewofCountrySelection){
  return Generators.input(viewofCountrySelection);
}

function _world(FileAttachment){return(
FileAttachment("ne_110m_admin_0_countries_lakes.json").json()
)}

function _worldGeo(topojson,world,base)
{
  const json = topojson.feature(world, world.objects.ne_110m_admin_0_countries_lakes);
  json.features.forEach(d => {
    d.base = base(d);
    return;
  });
  return json;
}

function _filteredGeo(worldGeo,countrySelection){
  const selected = countrySelection;
  const features = worldGeo.features.filter(d => selected.has(d.properties.ISO_A3 || d.properties.ADMIN));
  return {...worldGeo, features};
}

function _size(width){return(
Math.min(600, width)
)}

function _projection(d3,size){return(
d3.geoOrthographic()
    .fitSize([size, size], { type: "Sphere" })
)}

function _path(d3,projection){return(
d3.geoPath(projection)
)}

function _d3(require){return(
require("d3-array@2", "d3-geo@1", "d3-inertia@0.1.0", "d3-scale@3", "d3-selection@1")
)}

function _geometric(require){return(
require("geometric@2")
)}

function _polylabel(require){return(
require('https://bundle.run/polylabel@1.1.0')
)}

function _topojson(require){return(
require("topojson@3")
)}

function _maxPopulation(d3,worldGeo){return(
d3.max(worldGeo.features, d => d.properties.POP_EST)
)}

function _styles(){return(
`
body {
  font-family: "Helvetica Neue", Arial, sans-serif;
}

.globe {
  display: table;
  margin: 0 auto 2rem;
  overflow: visible;
}
.country {
  fill: #e0e0e0;
  stroke: #ccc;
  stroke-linejoin: round;
}
.sphere {
  fill: none;
  stroke: #ccc;
  stroke-width: 2px;
}
.spike {
  fill: red;
  stroke: red;
  transition: opacity 350ms;
}
.spike.fast-fade {
  transition: opacity 150ms;
}
.spike.hide {
  opacity: 0;
}
.spike-label {
  font-size: 10px;
  fill: #222;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
}
.spike-label.hide {
  opacity: 0;
}
.control-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  padding: 1rem 1.2rem;
  width: 260px;
  display: grid;
  gap: 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.control-panel.panel--transparent {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
}
.panel-header {
  font-weight: 600;
  font-size: 1rem;
}
.control-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}
.control-row select,
.control-row input[type=range] {
  width: 140px;
}
.control-row.checkbox {
  grid-template-columns: auto 1fr;
}
.control-row .value {
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
}
.apply-button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: none;
  background: #222;
  color: #fff;
  cursor: pointer;
}
.apply-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.country-filter {
  max-width: 760px;
  margin: 0 auto 3rem;
  padding: 0 1.5rem;
}
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.filter-actions button {
  margin-left: 0.4rem;
}
.filter-search {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.6rem 0;
}
.filter-search input {
  flex: 1;
}
.filter-table {
  max-height: 320px;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.filter-table table {
  width: 100%;
  border-collapse: collapse;
}
.filter-table th,
.filter-table td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  font-size: 0.9rem;
}
.filter-table thead th {
  position: sticky;
  top: 0;
  background: #f7f7f7;
}
.filter-count {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #555;
}
`
)}

function _base(polylabel,d3){return(
function base(d){
  const c = d.geometry.coordinates;
  
  if (d.geometry.type === "Polygon"){
    return polylabel(c);
  }
  else {
    let largestArea = 0, largestIndex = -1;
    for (let i = 0, l = c.length; i < l; i++){
      const area = d3.geoArea({ type: "Polygon", coordinates: c[i] });
      if (area > largestArea){
        largestArea = area;
        largestIndex = i;
      }
    }
    return polylabel(c[largestIndex]);
  }
}
)}

function _spike(geometric){return(
function spike(){
  let x = 0,
      y = 0,
      width = 0,
      height = 0,
      angle = -90,
      closed = false;
  
  function spike(datum){
    const dx = typeof x === "function" ? x(datum) : x,
          dy = typeof y === "function" ? y(datum) : y,
          dwidth = typeof width === "function" ? width(datum) : width,
          dheight = typeof height === "function" ? height(datum) : height,
          dangle = typeof angle === "function" ? angle(datum) : angle,
          base = [dx, dy],
          a = geometric.pointTranslate(base, dangle - 90, dwidth / 2),
          b = geometric.pointTranslate(base, dangle, dheight),
          c = geometric.pointTranslate(base, dangle + 90, dwidth / 2);      

    return closed ? [a, b, c, a] : [a, b, c];    
  }
  
  spike.x = function(n){ return arguments.length ? (x = n, spike) : x; }
  spike.y = function(n){ return arguments.length ? (y = n, spike) : y; }
  spike.width = function(n){ return arguments.length ? (width = n, spike) : width; }
  spike.height = function(n){ return arguments.length ? (height = n, spike) : height; }
  spike.angle = function(n){ return arguments.length ? (angle = n, spike) : angle; }
  spike.closed = function(b){ return arguments.length ? (closed = b, spike) : closed; }
  
  return spike;
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["ne_110m_admin_0_countries_lakes.json", {url: new URL("./files/32a8ce8b5db014dac6fe5d9561c7e24e75caabe3e6f457456cabc4aa09c21b43433ad952ab056cd0dff020e26668f8c45704b8d733d19b812acfc5c13b7a6e81.json", import.meta.url), mimeType: "application/json", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("viewof settings")).define("viewof settings", ["html"], _viewofSettings);
  main.variable(observer("settings")).define("settings", ["Generators", "viewof settings"], _settings);
  main.variable(observer()).define(["d3","size","styles","worldGeo","path","projection","geometric","spike","settings","filteredGeo","maxPopulation","visibility"], _2);
  main.variable(observer("viewof countrySelection")).define("viewof countrySelection", ["html","worldGeo"], _viewofCountrySelection);
  main.variable(observer("countrySelection")).define("countrySelection", ["Generators", "viewof countrySelection"], _countrySelection);
  main.variable(observer("world")).define("world", ["FileAttachment"], _world);
  main.variable(observer("worldGeo")).define("worldGeo", ["topojson","world","base"], _worldGeo);
  main.variable(observer("filteredGeo")).define("filteredGeo", ["worldGeo","countrySelection"], _filteredGeo);
  main.variable(observer("size")).define("size", ["width"], _size);
  main.variable(observer("projection")).define("projection", ["d3","size"], _projection);
  main.variable(observer("path")).define("path", ["d3","projection"], _path);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("geometric")).define("geometric", ["require"], _geometric);
  main.variable(observer("polylabel")).define("polylabel", ["require"], _polylabel);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  main.variable(observer("maxPopulation")).define("maxPopulation", ["d3","worldGeo"], _maxPopulation);
  main.variable(observer("styles")).define("styles", _styles);
  main.variable(observer("base")).define("base", ["polylabel","d3"], _base);
  main.variable(observer("spike")).define("spike", ["geometric"], _spike);
  return main;
}

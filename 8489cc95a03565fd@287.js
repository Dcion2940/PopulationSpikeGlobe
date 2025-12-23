import define1 from "./0d64f2229c613239@129.js";

function _1(md){return(
md`# Spike Globe

This notebook contains code to produce a simple spike globe, similar to those seen in the Washington Post article [“Six months, six countries, six families — and one unrelenting, unforgiving epidemic”](https://www.washingtonpost.com/graphics/2020/world/coronavirus-pandemic-lives-upended/), published on July 9, 2020.

To produce this [psuedo-3D](https://en.wikipedia.org/wiki/2.5D) effect, rotate each spike according to the angle between the center of the globe and the base of the spike. When done, you should be able to draw a straight line from the center of the globe through the spike’s base and ending at the spike’s tip.

The below map shows estimated population by country, 2017, using data from [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/).`
)}

async function* _2(d3,size,styles,worldGeo,path,projection,geometric,spike,height,visibility)
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
      .data(worldGeo.features)
    .enter().append("polyline")
      .attr("class", "spike");
  
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
              .width(7)
              .height(height(d.properties.POP_EST))
              ();
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
    projection.rotate([x / 4, 0, 0]);
    render();
    yield svg.node();
    await visibility();
  }
}


function _3(toc){return(
toc({selector: "h2", heading: "Jump to:"})
)}

function _4(md){return(
md`## Data`
)}

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


function _7(md){return(
md`## Dimensions`
)}

function _size(width){return(
Math.min(600, width)
)}

function _9(md){return(
md`## Geo`
)}

function _projection(d3,size){return(
d3.geoOrthographic()
    .fitSize([size, size], { type: "Sphere" })
)}

function _path(d3,projection){return(
d3.geoPath(projection)
)}

function _12(md){return(
md`## Imports`
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

function _18(md){return(
md`## Scales`
)}

function _height(d3,worldGeo){return(
d3.scaleLinear()
    .domain([0, d3.max(worldGeo.features, d => d.properties.POP_EST)])
    .range([0, 200])
)}

function _20(md){return(
md`## Styles`
)}

function _styles(){return(
`
.globe {
  display: table;
  margin: 0 auto;
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
  fill-opacity: 0.3;
  stroke: red;
  transition: opacity 350ms;
}
.spike.fast-fade {
  transition: opacity 150ms;
}
.spike.hide {
  opacity: 0;
}
`
)}

function _22(md){return(
md`## Utilities`
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
  main.variable(observer()).define(["d3","size","styles","worldGeo","path","projection","geometric","spike","height","visibility"], _2);
  main.variable(observer()).define(["toc"], _3);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer("world")).define("world", ["FileAttachment"], _world);
  main.variable(observer("worldGeo")).define("worldGeo", ["topojson","world","base"], _worldGeo);
  main.variable(observer()).define(["md"], _7);
  main.variable(observer("size")).define("size", ["width"], _size);
  main.variable(observer()).define(["md"], _9);
  main.variable(observer("projection")).define("projection", ["d3","size"], _projection);
  main.variable(observer("path")).define("path", ["d3","projection"], _path);
  main.variable(observer()).define(["md"], _12);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("geometric")).define("geometric", ["require"], _geometric);
  main.variable(observer("polylabel")).define("polylabel", ["require"], _polylabel);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  const child1 = runtime.module(define1);
  main.import("toc", child1);
  main.variable(observer()).define(["md"], _18);
  main.variable(observer("height")).define("height", ["d3","worldGeo"], _height);
  main.variable(observer()).define(["md"], _20);
  main.variable(observer("styles")).define("styles", _styles);
  main.variable(observer()).define(["md"], _22);
  main.variable(observer("base")).define("base", ["polylabel","d3"], _base);
  main.variable(observer("spike")).define("spike", ["geometric"], _spike);
  return main;
}

const width = 960;
const height = 500;
const colorScale = d3.scaleQuantize([1, 13369393], d3.schemeBlues[9].slice(1, 8))

let focused = null
let geoPath;
let svg;
let g;
let tooltip;

svg = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

svg.append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height);

g = svg.append("g")
  .append("g")
  .attr("id", "states");

tooltip = d3.select("#dataTooltip");

// Create Map Legend (gradient)
let defs = svg.append("defs");
let linearGradient = defs.append("linearGradient")
  .attr("id", "linear-gradient");

linearGradient.selectAll("stop")
  .data(colorScale.range())
  .enter().append("stop")
  .attr("offset", function (d, i) { return i / (colorScale.range().length - 1); })
  .attr("stop-color", function (d) { return d; });

svg.append("rect")
  .attr("class", "legend")
  .attr("width", 200)
  .attr("height", 20)
  .attr("x", -480)
  .attr("y", 900)
  .attr("transform", "rotate(270)")
  .style("fill", "url(#linear-gradient)");

svg.append("text")
  .attr("class", "legendKey")
  .attr("x", 880)
  .attr("y", 480)
  .text("0")

svg.append("text")
  .attr("class", "legendKey")
  .attr("x", 860)
  .attr("y", 290)
  .text("13M")


d3.json("./data/dataBundesLander.json").then(data => {
  let bounds = d3.geoBounds(data),
    bottomLeft = bounds[0],
    topRight = bounds[1],
    rotLong = -(topRight[0] + bottomLeft[0]) / 2,
    center = [(topRight[0] + bottomLeft[0]) / 2 + rotLong, (topRight[1] + bottomLeft[1]) / 2];

  let projection = d3.geoAlbers()
    .parallels([bottomLeft[1], topRight[1]])
    .rotate([rotLong, 0, 0])
    .translate([width / 2, height / 2])
    .center(center);

  let bottomLeftPx = projection(bottomLeft),
    topRightPx = projection(topRight),
    scaleFactor = 1.00 * Math.min(width / (topRightPx[0] - bottomLeftPx[0]), height / (-topRightPx[1] + bottomLeftPx[1]));

  projection = d3.geoAlbers()
    .parallels([bottomLeft[1], topRight[1]])
    .rotate([rotLong, 0, 0])
    .translate([width / 2, height / 2])
    .scale(scaleFactor * 0.975 * 1000)
    .center(center);

  geoPath = d3.geoPath().projection(projection);

  let graticule = d3.geoGraticule()
    .step([1, 1]);

  g.append("path")
    .datum(graticule)
    .attr("class", "graticuleLine")
    .attr("d", geoPath);

  let states = g.selectAll("path.feature")
    .data(data.features)
    .enter()
    .append("path")
    .attr("fill", d => colorScale(d.data.population["2022"]))
    .attr("class", "feature")
    .attr("d", geoPath)
    .on("click", clickPath)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
});

// Zoom map functionality
function clickPath(event, d) {
  let x = width / 2,
    y = height / 2,
    k = 1,
    name = d.properties.VARNAME_1 || d.properties.NAME_1

  g.selectAll("text")
    .remove();
  if ((focused === null) || !(focused === d)) {
    let centroid = geoPath.centroid(d);
    x = +centroid[0];
    y = +centroid[1];
    k = 1.75;
    focused = d;

    g.append("text")
      .text(name)
      .attr("x", x)
      .attr("y", y)
      .attr("class", "legendKey")
      .style("text-anchor", "middle")
      .style("font-size", "8px")
      .style("stroke-width", "0px")
      .style("fill", "black")
      .on("click", clickText);
  } else {
    focused = null;
  }

  g.selectAll("path")
    .classed("active", focused && function (d) { return d === focused; });

  g.transition()
    .duration(1000)
    .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")scale(" + k + ")translate(" + (-x) + "," + (-y) + ")")
    .style("stroke-width", 1.75 / k + "px");
}

function clickText(event, d) {
  focused = null;
  g.selectAll("text")
    .remove();
  g.selectAll("path")
    .classed("active", false);
  g.transition()
    .duration(1000)
    .attr("transform", "scale(" + 1 + ")translate(" + 0 + "," + 0 + ")")
    .style("stroke-width", 1.00 + "px");
}

let mouseover = function (d) {
  d3.select("#dataTooltip")
    .style("display", "block")
}
let mousemove = function (mouseEvent, pathData) {

  d3.select("#dataTooltip")
    .html(
      `${getTooltipHTMLLine("Federal state", getFederalStateName(pathData))} <br>
       ${getTooltipHTMLLine("Population", getPopulationData(pathData))}`
    )
    .style("left", (mouseEvent.pageX + 20) + "px")
    .style("top", (mouseEvent.pageY) + "px")
}
let mouseleave = function (d) {
  d3.select("#dataTooltip")
    .style("display", "none")
}

function formatNumber(number) {
  return d3.format(",")(number)
}

function getPopulationData(pathData) {
  return formatNumber(pathData.data.population["2022"]);
}

// Chooses english name when available
function getFederalStateName(pathData) {
  return pathData.properties.VARNAME_1 || pathData.properties.NAME_1
}

function getTooltipHTMLLine(variable, data) {
  return `${variable}: ${data}`;
}
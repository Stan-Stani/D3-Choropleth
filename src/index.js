import css from "./style.css";
import * as topojson from 'topojson-client';
import * as d3 from 'd3';



// Define global variables
const WIDTH = 1366;
const HEIGHT = 768;


fetch(
    "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json",
    {method: "GET", header: "Content-Type: application/json"}
)
.then(res => res.json())
.then(data => { 



    
    q(data)
    q(topojson.feature(data, 'nation'))
})


let projection = d3.geoEquirectangular();

let geoGenerator = d3.geoPath()
    .projection(projection);


const svgWrapper = d3.select('#svg-wrapper')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

svgWrapper
    .append('path')
    // .attr('d', geoGenerator(HARDCODED_GEOJSON))
    // .attr('fill', 'none')
    // .attr('stroke', 'black')


// utility functions
function q(...input) {
    console.log(...input);
}

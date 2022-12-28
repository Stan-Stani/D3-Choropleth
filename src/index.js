import css from "./style.css";
import * as topojson from 'topojson-client';
import * as d3 from 'd3';
import { color, svg } from "d3";




// Define global variables
const WIDTH = 1366;
const HEIGHT = 768;
const LEGEND_LENGTH = 300;

let data = {}


const state = {
    paletteIndex: 0,
    palettesArr: [],
    scales: {}
};

const svgWrapper = d3.select('#svg-wrapper')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

const mapItself = svgWrapper.append('g');

fetch(
    "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json",
    { method: "GET", header: "Content-Type: application/json" }
)
    .then(res => res.json())
    // Organize and return data from both apis
    .then(topojsonData => {
        data.topojson = topojsonData;

        return fetch("https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json",
            { method: "GET", header: "Content-Type: application/json" }).then(res => res.json())
    })
    .then(educationData => {
        data.education = educationData;

        // add scale to state
        buildScales(data.education);

        // create object with fips as keys, essentially creating dict that is
        // sorted by fips (us government geographic codes)
        let educationByFips = {}
        data.education.forEach(element => {
            let objCopy = Object.assign({}, element);
            delete objCopy.fips;
            educationByFips[element.fips] = objCopy;
        })


        let counties = topojson.feature(data.topojson, 'counties')
        let states = topojson.feature(data.topojson, 'states')
        q(data)
        let projection = d3.geoEquirectangular();

        let geoGenerator = d3.geoPath()
            .projection(null);

        // q(geoGenerator(counties))


        // mapItself
        //     .selectAll('path')
        //     .data(counties.features)
        //     .enter()
        //     .append('path')
        //     .attr('class', 'county')
        //     .attr('data-fips', d => d.id)
        //     .attr('d', d => { return geoGenerator(d) })
        //     .attr('fill', d => {
        //         let percentage = educationByFips[d.id].bachelorsOrHigher;
        //         return state.scales.eduToColor(percentage)
        //     })
        //     .attr('stroke', 'white')

        mapItself
            .append('path')
            .attr('d', d => geoGenerator(states))
            .attr('fill', 'none')
            .attr('stroke', 'white')
            
        mapItself
            .attr(
                'style', 
                `transform: translate(${WIDTH / 2 - mapItself.node().getBBox().width / 2}px, 0px);`
            )

        q('bbox', mapItself.node().getBBox())


        buildLegend();


    })




function buildScales(educationData) {
    state.palettesArr = [
        {
            name: "ColorBrewer's 9-class BuGn Sequential",
            colors: [
                '#f7fcfd',
                '#e5f5f9',
                '#ccece6',
                '#99d8c9',
                '#66c2a4',
                '#41ae76',
                '#238b45',
                '#006d2c',
                '#00441b'
            ].map(element => d3.color(element))
        }
    ]


    let extent = d3.extent(educationData, element => element.bachelorsOrHigher)
    q({extent})

    state.scales.eduToColor = d3.scaleQuantize()
        .domain([extent[0], extent[1]])
        .range(state.palettesArr[state.paletteIndex].colors)

    state.scales.eduToLegendPosition = d3.scaleLinear()
        .domain([extent[0], extent[1]])
        .range([0, LEGEND_LENGTH])

}

function buildLegend(data) {
    let colorScaleRange = state.palettesArr[state.paletteIndex].colors;
    let colorExtentsForLegend = colorScaleRange.map((color, index) => {
        return state.scales.eduToColor.invertExtent(color);
    });
    q(colorExtentsForLegend)


    let legendAxis = d3.axisBottom(state.scales.eduToLegendPosition)
        .tickValues(colorExtentsForLegend.map(element => element[1]));
    let legend = svgWrapper.append('g')
        .attr('id', 'legend-axis')
        .attr('style', `transform: translate(${20}px,
                ${HEIGHT - 30}px);`
        )
        .call(legendAxis)

    let rectHeight = 20;
    let rectWidth = state.scales.eduToLegendPosition(colorExtentsForLegend[0][1]);
    legend
        .selectAll('rect')
        .data(colorExtentsForLegend)
        .enter()
        .append('rect')
            .attr('x', d => state.scales.eduToLegendPosition(d[0]))
            .attr('y', - rectHeight )
            .attr('height', rectHeight)
            .attr('width', rectWidth)
            .attr('fill', d => state.scales.eduToColor(d[0]))
        
}



// utility functions
function q(...input) {
    console.log(...input);
}
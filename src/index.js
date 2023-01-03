// TODO: Debug highlighting just the state outline and then mousing out as
// it highlight stays and does not timeout
// TODO: Add way to zoom in as certain places e.g. around DC are too small to be
// highlighted
// TODO: Correct width and height passed to tooltip class
// TODO: Debug part of Alaska getting cut off when svgWrapper width is not 100%.
    // Hint: Search debug.drawBBox and enable it

import css from "./style.css";
import * as topojson from 'topojson-client';
import * as d3 from 'd3';
import { quadtree, svg } from "d3";





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
// .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);


const countyMap = svgWrapper.append('g')
    .attr('id', 'counties')

const stateMap = svgWrapper.append('g')
    .attr('id', 'states')



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

        let currentlyHighlightedCounty = null;
        let currentlyHighlightedState = null;


        countyMap
            .selectAll('path')
            .data(counties.features)
            .enter()
            .append('path')
            .attr('class', 'county')
            .attr('data-fips', d => d.id)
            .attr('data-education', d => educationByFips[d.id].bachelorsOrHigher)
            .attr('d', d => { return geoGenerator(d) })
            .attr('fill', d => {
                let percentage = educationByFips[d.id].bachelorsOrHigher;
                return state.scales.eduToColor(percentage)
            })
            .attr('stroke', 'white')
            .on('mouseover', function (e, d) {
                if (!currentlyHighlightedCounty) {
                    currentlyHighlightedCounty = this;
                } else {
                    currentlyHighlightedCounty.setAttribute('stroke', 'white');
                }


                let bbox = this.getBBox();


                currentlyHighlightedCounty = this;
                this.parentNode.appendChild(this);
                this.setAttribute('stroke', 'black')
                let x = bbox.x + stateMapXOffset + bbox.width + 5;
                let y = bbox.y + bbox.height + 5;


                tooltip.setTextElement('bachelors-or-higher',
                    `${educationByFips[d.id].area_name},\
                     ${educationByFips[d.id].state}:\
                     ${educationByFips[d.id].bachelorsOrHigher}%`


                )
                tooltip.setPos(x, y)
            })
            .on('mouseout', function (e, d) {
                tooltip.startDisappearTimer();
            })

        let mapBBox = countyMap.node().getBBox()
        q(mapBBox)

        let mapVisibleWidth = mapBBox.width + mapBBox.x;
        let mapVisibleHeight = mapBBox.height + mapBBox.y;

        svgWrapper
            .attr('viewBox', `0 0 ${mapVisibleWidth} ${mapVisibleHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid')



        // debug
        // debug.drawBBox(svgWrapper, countyMap)
        

        q({ states })
        stateMap
            .selectAll('path')
            .data(states.features)
            .enter()
            .append('path')
            .attr('d', d => geoGenerator(d))
            .attr('fill', 'rgba(0,0,0,0)')
            .attr('stroke', 'white')
            .on('mouseover', function (e, d) {
                !currentlyHighlightedState ? currentlyHighlightedState = this : null;

                var handleStateHighlightBound = handleStateHighlight.bind(this);

                handleStateHighlightBound();



            })
            .on('mouseout', function (e, d) {
                tooltip.doOnDisappear(() => {
                    this.setAttribute(
                        'stroke', 'white'
                    );
                    this.setAttribute('fill', 'rgba(0,0,0,0)');
                    currentlyHighlightedCounty.setAttribute(
                        'stroke', 'white'
                    )
                })
            })


        let stateMapXOffset = 0;


        countyMap
            .attr(
                'style',
                `transform: translate(${stateMapXOffset}px, 0px);`
            )

        stateMap
            .attr(
                'style',
                `transform: translate(${stateMapXOffset}px, 0px);`
            )



        const tooltipConfig = {
            container: svgWrapper,
            containerWidth: WIDTH,
            containerHeight: HEIGHT,
            timeoutDurationInMs: 3000,
        }

        let Tooltip = buildClasses()

        const tooltip = new Tooltip(tooltipConfig);


        buildLegend();

        // Adds highlight to state (and adds back fill to other states) 
        // and removes fill of currently hovered state
        // to allow below county to catch hover event and thus highlight.
        // Sort of convoluted because state and county maps are not directly
        // related as parent and child.
        // If they were directly related, the hover event would bubble through
        // both and this convolution would not be necessary.

        function handleStateHighlight() {

            currentlyHighlightedState.setAttribute('fill', 'rgba(0,0,0,0)');
            currentlyHighlightedState.setAttribute('stroke', 'white');

            this.parentNode.appendChild(this);
            this.setAttribute('stroke', 'black')
            this.setAttribute('fill', 'none')
            currentlyHighlightedState = this;
        }

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
    q({ extent })

    state.scales.eduToColor = d3.scaleQuantize()
        .domain([0, extent[1]])
        .range(state.palettesArr[state.paletteIndex].colors)

    state.scales.eduToLegendPosition = d3.scaleLinear()
        .domain([0, extent[1]])
        .range([0, LEGEND_LENGTH])

}

function buildLegend(data) {
    let colorScaleRange = state.palettesArr[state.paletteIndex].colors;
    let colorExtentsForLegend = colorScaleRange.map((color, index) => {
        return state.scales.eduToColor.invertExtent(color);
    });
    q(colorExtentsForLegend)

    let tickValues = colorExtentsForLegend.map(element => element[1]);
    tickValues.unshift(0);
    let legendAxis = d3.axisBottom(state.scales.eduToLegendPosition)
        .tickValues(tickValues)


    let legend = svgWrapper.append('g')
        .attr('id', 'legend-axis')
        .attr('style', `transform: translate(${20}px,
                ${HEIGHT - 30}px);`
        )
        .call(legendAxis)

    legend.selectAll('text')
        .text(function () {
            return this.innerHTML + '%';
        })


    let rectHeight = 20;
    let rectWidth = state.scales.eduToLegendPosition(colorExtentsForLegend[0][1]);
    legend
        .selectAll('rect')
        .data(colorExtentsForLegend)
        .enter()
        .append('rect')
        .attr('x', d => state.scales.eduToLegendPosition(d[0]))
        .attr('y', - rectHeight)
        .attr('height', rectHeight)
        .attr('width', rectWidth)
        .attr('fill', d => state.scales.eduToColor(d[0]))

}

function buildClasses() {
    class Tooltip {

        textElementQuantity = 0;
        textObj = {};
        tooltipTimeoutId = null;



        constructor(config) {
            this.container = config.container;
            this.containerWidth = config.containerWidth;
            this.containerHeight = config.containerHeight;
            this.paddingHorizontal = config.paddingHorizontal ? config.paddingHorizontal : 5;
            this.paddingVertical = config.paddingVertical ? config.paddingVertical : 5;
            this.timeoutDurationInMs = config.timeoutDurationInMs ? config.timeoutDurationInMs : 1000;

            this.tooltip = this.container
                .append('g')
                .attr('id', 'tooltip')


            this.tooltipRect = this.tooltip.append('rect')
                .attr('rx', '.75%')
                .attr('ry', '.75%')
                // Setting these attributes to 0 so that NaN doesn't have to be parsed
                // later 
                .attr('width', 0)
                .attr('height', 0);

        }





        addTextElement(id) {
            let paddingVerticalEms = this.paddingVertical / this.#pixelsPerEm();
            let yOffset = (this.textElementQuantity === 0) ? 0 : (2 * this.textElementQuantity);;



            let textElement = this.tooltip.append('text')
                .attr('id', id)
                // dy: 1em; effectively shifts origin of text from bottom left to top left
                .attr('dy', '1em')
                .attr('y', paddingVerticalEms + yOffset + 'em')


            // height of rect is set to include all textElements + a vert padding

            this.tooltipRect
                .attr('height', (yOffset + 1 + 2 * paddingVerticalEms) + 'em');



            this.textObj[id] = {};
            this.textObj[id].text = null;
            this.textObj[id].length = null;


            this.textElementQuantity++;
            this.textObj[id].index = this.textElementQuantity - 1;



            return textElement;
        }

        setTextElement(id, textValue) {
            if (this.textObj[id] === undefined) {
                this.addTextElement(id);
            }


            this.textObj[id].text = textValue;
            let textElement = this.tooltip.select('#' + id)
                .text(textValue);

            // Dynamically resize tooltip rect based on text length
            let rectWidth = parseFloat(this.tooltipRect.attr('width'));
            let textElementWidth = textElement.node().getComputedTextLength();


            this.textObj[id].length = textElementWidth;

            let lengthArr = [];
            for (const textId in this.textObj) {
                let length = this.textObj[textId].length
                lengthArr.push(length);
            }
            let maxLength = d3.max(lengthArr);

            if (maxLength > rectWidth || maxLength < rectWidth) {
                this.tooltipRect.attr('width', maxLength + 2 * this.paddingHorizontal);
                rectWidth = maxLength + 2 * this.paddingHorizontal;
            }

            // Horizontally center all textElements
            for (const textId in this.textObj) {
                let length = this.textObj[textId].length
                let textStartX = (rectWidth - length) / 2;
                this.tooltip.select('#' + textId).attr('x', textStartX)
            }


        }

        setPos(x, y, isHorizontallyCenteredOnPoint = false) {
            this.timeoutId ? clearTimeout(this.timeoutId) : null;

            // Handle horizontally centering 
            let leftSideX;
            let topSideY;
            if (isHorizontallyCenteredOnPoint === false) {
                leftSideX = x;
                topSideY = y;
            } else if (isHorizontallyCenteredOnPoint === true) {
                leftSideX = x - parseFloat(this.tooltipRect.attr('width') / 2);
                topSideY = y;
            }


            // Reposition if overflow would happen
            let rightSideX = leftSideX + parseFloat(this.tooltipRect.attr('width'));

            let rectHeightInPixels = parseFloat(this.tooltipRect.attr('height')) * this.#pixelsPerEm();
            let bottomSideY = topSideY + rectHeightInPixels;

            if (leftSideX < 0) {
                leftSideX = 0;
            } else if (rightSideX > this.containerWidth) {
                leftSideX = this.containerWidth - this.tooltipRect.attr('width');
            }
            let containerHeight = this.containerHeight;

            if (topSideY < 0) {
                topSideY = 0;
            } else if (bottomSideY > this.containerHeight) {
                topSideY = this.containerHeight - rectHeightInPixels;
            }



            this.tooltip
                .attr('style', `transform: translate(${leftSideX}px, ${topSideY}px)`)




        }

        getTooltip() {
            return this.tooltip;
        }

        doOnDisappear(func) {
            if (this.onDisappear) {
                this.onDisappear.push(func);
            } else {
                this.onDisappear = [];
                this.onDisappear.push(func);
            }
        }

        startDisappearTimer() {
            this.timeoutId = setTimeout(() => {
                this.disappear();
                this.onDisappear ? this.onDisappear.forEach((element) => {
                    element();
                }) : null;
            }, this.timeoutDurationInMs);
        }

        disappear() {
            this.tooltip
                .attr('style', 'visibility: hidden');
        }

        #pixelsPerEm() {
            return parseFloat(getComputedStyle(this.tooltipRect.node().parentNode).fontSize);
        }

    }

    return Tooltip
}


// Debug object

let debug = {
    drawBBox: function (container, element) {
        let rect = element.node().getBBox();
            
        container.append('rect')
            .attr('x', rect.x)
            .attr('y', rect.y)
            .attr('width', rect.width)
            .attr('height', rect.height)
    }
}

// utility functions
function q(...input) {
    console.log(...input);
}
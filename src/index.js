// TODO: Adjust final tick so it is in middle of last datum column, not at end
// TODO: Remove datum highlight when not hovering over a datum

// Define global variables
const WIDTH = 1366;
const HEIGHT = 768;
const PADDING = 25;
const BOTTOM_PADDING = 75;

const PLOT_WIDTH = WIDTH - PADDING;
const PLOT_HEIGHT = HEIGHT - BOTTOM_PADDING;

const LEGEND_X = PADDING;
const LEGEND_Y = PLOT_HEIGHT + PADDING / 2;
var legendLength = 300;
const INITIAL_LEGEND_LENGTH = legendLength;
const LEGEND_RECT_HEIGHT = 10;


// input domain and range to yScale
// Domain is one extra element so there is exactly enough space for all elements
const yScale = d3.scaleLinear([1, 13], [PADDING, PLOT_HEIGHT]);


const DATUM_HEIGHT = yScale(2) - PADDING;
let datumWidth;

const svgWrapper = d3.select('#svg-wrapper')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

const state = {
    colorScaleIndex: 0,
    paletteIndex: 0
};



fetch(
    "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json",
    {method: "GET", header: "Content-Type: application/json"}
)
    .then(res => res.json())
    .then(data => {
        
        let baseTemperature = parseFloat(data.baseTemperature);
            data = data.monthlyVariance.map(e => {
                return {
                    year: e.year,
                    month: e.month,
                    temp: parseFloat(e.variance) + baseTemperature,
                    variance: e.variance
                }
            });


       let [
            xScale, 
            yScale, 
            legendScaleObj, 
            colorScalesArr, 
            palettesArr
        ] = [...buildScales(data)];

        let dataGroup = svgWrapper.append('g')
            .attr('class', 'data-group')

        const monthArr = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]

        dataGroup
            .selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('width', datumWidth)
            .attr('height', DATUM_HEIGHT)
            .attr('x', d => xScale(new Date(d.year, 0)))
            .attr('y', (d) => yScale(d.month))
            .attr('fill', d => {
                return colorScalesArr[state.colorScaleIndex](d.temp).formatHex();
                // Not an arrow function because vanilla anon will
                // get 'this' initialized to dom element event is happening on
            })
            // data attributes are for fCC tests
            .attr('data-month', d => d.month - 1)
            .attr('data-year', d => d.year)
            .attr('data-temp', d => d.temp)
            .attr('class', 'datum-rect cell')
            .on('mouseover', function(e, d) {
                clearTimeout(tooltip.timeoutId);
                datumOutline.attr('x', this.getAttribute('x'))
                datumOutline.attr('y', this.getAttribute('y'))
                datumOutline.attr('style', 'visibility: visible;')

                
                tooltip.setTextElement('tooltip-time', `${monthArr[d.month - 1]} ${d.year}`);
                tooltip.setTextElement('tooltip-absolute-temp', `${d.temp.toFixed(1)}°C`);
                tooltip.setTextElement('tooltip-variance-temp', `${d.variance.toFixed(1)}°C`);
                // data attribute for fCC test
                tooltip.getTooltip().attr('data-year', d.year);

                let xPos = xScale(new Date(parseInt((d.year)), 0));
                let yPos = parseInt(yScale(d.month)) + DATUM_HEIGHT + PADDING;
                tooltip.setPos(xPos, yPos, true)
                    
        
            })
            .on('mouseout', function(e, d) {
                tooltip.timeoutId = setTimeout(tooltip.disappear.bind(tooltip), tooltip.timeoutDurationInMs);
            });


        let config = {
            containerWidth: WIDTH,
            containerHeight: HEIGHT,
            paddingVertical: 12,
            paddingHorizontal: 20,
        };

        let buttons = buildButtons();

        let tooltip = new Tooltip(config);
        tooltip.setTextElement('tooltip-time', '')
        tooltip.setTextElement('tooltip-absolute-temp', '')
        tooltip.setTextElement('tooltip-variance-temp', '')

        handleButtonLogic(...buttons)

        
        let datumOutline = buildDatumOutline()

        buildAxes(xScale, yScale, legendScaleObj);




        function handleButtonLogic(cycleScaleButton, cyclePaletteButton) {
            cycleScaleButton.on('mouseover', (e) => tooltip.disappear());
            cyclePaletteButton.on('mouseover', (e) => tooltip.disappear());
            
            cycleScaleButton.on('mouseup', (e) => {
        
                state.colorScaleIndex++;
                (state.colorScaleIndex > colorScalesArr.length - 1) ? state.colorScaleIndex = 0 : null;
        
                dataGroup
                    .selectAll('rect')
                    .data(data)
                    .attr('x', d => xScale(new Date(d.year, 0)))
                    .attr('y', (d) => yScale(d.month))
                    .attr('fill', d => {
                        return colorScalesArr[state.colorScaleIndex](d.temp).formatHex();
                    })

                rebuildLegend(true);
            });
        
            cyclePaletteButton.on('mouseup', e => {
                state.paletteIndex++;
                (state.paletteIndex > palettesArr.length - 1) ? state.paletteIndex = 0 : null;
        
                colorScalesArr.forEach(scale => {
                    scale.range(palettesArr[state.paletteIndex].colors);
                })
        
                dataGroup
                .selectAll('rect')
                .data(data)
                .attr('x', d => xScale(new Date(d.year, 0)))
                .attr('y', (d) => yScale(d.month))
                .attr('fill', d => {
                    return colorScalesArr[state.colorScaleIndex](d.temp).formatHex();
                })

                
                rebuildLegend();

            })

            function rebuildLegend(hasColorScaleChanged) {
                let legend = svgWrapper.select('#legend')
                let newColorLengths = getColorLengths(colorScalesArr);
                legendScaleObj.colorLengths = newColorLengths;
                if (hasColorScaleChanged === true) {
                   
                    // if scale is quantile, adjust legend length
                    if (state.colorScaleIndex === 1) {
                        
                        legendScaleObj.legendScale.range([0, legendLength = INITIAL_LEGEND_LENGTH * 4]);
                    } else {
                        legendScaleObj.legendScale.range([0, legendLength = INITIAL_LEGEND_LENGTH]);
                    }
                    
                    svgWrapper.select('#legend-axis').remove();
                    buildLegendAxis(legendScaleObj);

                    legend
                        .selectAll('rect')
                        .data(newColorLengths)
                            .attr('x', d => {
                                return legendScaleObj.legendScale(d[0]);
                            })
                            .attr('fill', d => {
                                return generateLegendFill(d, colorScalesArr, state.colorScaleIndex);
                            })
                            .attr('width',  d => getWidth(d, newColorLengths))

                    
                    
                } else {
                    legend
                        .selectAll('rect')
                        .data(legendScaleObj.colorLengths)
                            .attr('fill', d => {
                                return generateLegendFill(d, colorScalesArr, state.colorScaleIndex);
                            })
                }
        
            }
        }
    })

function buildScales(data) {
    const xScale = d3.scaleTime();
    xScale.range([2.3 * PADDING, WIDTH - PADDING])




    let monthlyVariance = data
    let yearsObj = {};
    for (const element of monthlyVariance) {

        yearsObj[element.year] = element.year;
    }
    const yearCount = Object.keys(yearsObj).length;
    datumWidth = WIDTH / yearCount;
    
    let xDomainStart = new Date(monthlyVariance[0].year, parseInt(monthlyVariance[0].month) - 1);
    let xDomainEnd = new Date(
        monthlyVariance[monthlyVariance.length - 1].year,
        parseInt(monthlyVariance[monthlyVariance.length - 1].month) - 1
    );

    xScale.domain([xDomainStart, xDomainEnd]);


    let coldestVariance = d3.min(monthlyVariance, element => element.temp);
    let hottestVariance = d3.max(monthlyVariance, element => element.temp);

    let justVarianceArr = monthlyVariance.map(element => {
        return element.temp;
    })

    let palettesArr = [
        {
            name: "ColorBrewer's 11 Class RdBu Diverging",
            colors: [
                '#67001f',
                '#b2182b',
                '#d6604d',
                '#f4a582',
                '#fddbc7',
                '#f7f7f7',
                '#d1e5f0',
                '#92c5de',
                '#4393c3',
                '#2166ac',
                '#053061'
            ].map(element => d3.color(element)).reverse()

        },
        {
            name: "Stan's Palette",
            colors: [
                d3.color('#004352'),
                d3.color('#005f73'),
                d3.color('#0a9396'), 
                d3.color('#94d2bd'), 
                d3.color('#e9d8a6'),
                d3.color('#ee9b00'),
                d3.color('#ca6702'),
                d3.color('#bb3e03'),
                d3.color('#ae2012'),
                d3.color('#9b2226'),
                d3.color('#7a292c')
            ]
        },
        {   
            name: "freeCodeCamp's Palette",
            colors: [
                '#a50026',
                '#d73027',
                '#f46d43',
                '#fdae61',
                '#fee090',
                '#ffffbf',
                '#e0f3f8',
                '#abd9e9',
                '#74add1',
                '#4575b4',
                '#313695'
            ].map(element => d3.color(element)).reverse()
        }
    ]

    
    let colorScalesArr = [
        d3.scaleQuantize()
            .domain([coldestVariance, hottestVariance])
            .range(palettesArr[state.paletteIndex].colors), 
        d3.scaleQuantile()
            .domain(justVarianceArr)
            .range(palettesArr[state.paletteIndex].colors),
    ];


    let colorLengths = getColorLengths(colorScalesArr);
    


    let legendScale = d3.scaleLinear()
        .domain(colorScalesArr[state.colorScaleIndex].domain())
        .range([0, legendLength])

    let legend = svgWrapper.append('g')
        .attr('id', 'legend')
    legend
        .selectAll('rect')
        .data(colorLengths)
        .enter()
        .append('rect')
            .attr('x', d => legendScale(d[0]))
            .attr('style', `transform: translate(${LEGEND_X}px, ${LEGEND_Y}px);`)
            .attr('width',  d => getWidth(d, colorLengths))
            .attr('height', LEGEND_RECT_HEIGHT)
            .attr('fill', (d) => generateLegendFill(d, colorScalesArr, state.colorScaleIndex))



        
    let legendScaleObj = {legendScale, colorLengths};

    return [xScale, yScale, legendScaleObj, colorScalesArr, palettesArr];
    
    
}

function getColorLengths(colorScalesArr) {
    let colorScaleRange = colorScalesArr[state.colorScaleIndex].range();
    let colorLengths = colorScaleRange.map((color, index) => {
        return colorScalesArr[state.colorScaleIndex].invertExtent(color);
    });

    return colorLengths;
}

function getWidth(d, colorLengths) {
    let degreesPerColor = d[1] - d[0];
    // Removing space between 0 and color start by subtracting colorLengths[0][0]
    let highestDegreePerColor = colorLengths[colorLengths.length - 1][1] - colorLengths[0][0];
    let percentage = degreesPerColor / highestDegreePerColor;
    let colorsWidthInScale = legendLength * percentage;

    return(colorsWidthInScale);
}

function generateLegendFill(d, colorScalesArr, colorScaleIndex) {
    return colorScalesArr[colorScaleIndex](d[0]).formatHex()
}

function buildAxes(xScale, yScale, legendScaleObj) {

    let axesObj = {};


    let xAxis = d3.axisTop(xScale)
        .tickFormat(d3.timeFormat("%Y"))
        .ticks(d3.timeYear.every(15))
    svgWrapper.append('g')
        .attr('id', 'x-axis')
        // Set x such that ticks are aligned with middle of each datum
        .attr('style', `transform: translate(${datumWidth / 2}px, ${PADDING - 3}px);`)
        .call(xAxis)

        axesObj.xAxis = xAxis;

    // Build 12 element scale for 12 ticks
    // And make total height of axis 1/12 less than total height of datum heights
    // So space between axis ticks is same as height of datum
    const yAxisScale = d3.scaleLinear([1, 12], [PADDING, PLOT_HEIGHT * 11/12]);
    
    let yAxis = d3.axisLeft(yAxisScale)
        .tickSizeInner(3)
        .tickFormat(d => {
            let monthArr = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]
            return monthArr[d - 1];
        })
        .tickSize(0)
        .tickPadding(0)
        
    

    let yAxisGroup = svgWrapper.append('g')
        .attr('id', 'y-axis')
        // Set y such that ticks are aligned with middle of each datum
        .attr('style', `transform: translate(${2.1 * PADDING}px, ${DATUM_HEIGHT / 2}px);`)
        .call(yAxis)
    
    // remove axis line itself, leaving only labels
    yAxisGroup.select('path').remove();

    axesObj.yAxis = yAxis;
    
    axesObj.legendAxis = buildLegendAxis(legendScaleObj);


    return axesObj;

}

function buildLegendAxis(legendScaleObj) {
    let colorLengths = legendScaleObj.colorLengths;

    let tickValuesArr = colorLengths.map((element) => element[0]);
    // Only 11 colors but need 12 ticks so using final part of final color for last tick
    tickValuesArr.push(colorLengths[colorLengths.length - 1][1])

    
    let legendAxis = d3.axisBottom(legendScaleObj.legendScale)
        .tickValues(tickValuesArr)
        .tickArguments([tickValuesArr.length, ".1f"])
        
    
        
    svgWrapper.append('g')
        .attr('id', 'legend-axis')
        .attr('style', `transform: translate(${LEGEND_X}px,
                ${LEGEND_Y + LEGEND_RECT_HEIGHT}px);`)
        .call(legendAxis)


    // If scale is quantile, adjust tick lengths
    if (state.colorScaleIndex === 1) {
                        
        
        let oddElements = svgWrapper
            .select('#legend-axis')
            .selectAll('.tick:nth-child(odd)');

        oddElements
            .selectAll('line')
                .attr('y2', function(d) {
                    let currentTickLength = parseFloat(this.getAttribute('y2'));
                    return 20;
                });

        oddElements
            .selectAll('text')
                .attr('y', function(d) {
                    let currentY = parseFloat(this.getAttribute('y'));
                    return 2.5 * currentY;
                })
    }

        return legendAxis;
}

function buildButtons() {
    let widthScaleButton = 90;
    let widthPaletteButton = 64
    let heightButton = 30;

    let cycleScaleButton = 
    svgWrapper
        .append('g')
            .attr('id', 'cycle-scale-type-button')
            .attr('class', 'svg-rect-button')
        
    cycleScaleButton
        .attr('style', `transform: translate(${PADDING}px, ${HEIGHT - heightButton}px`)
    
    cycleScaleButton
        .append('rect')
            .attr('rx', '.75%')
            .attr('ry', '.75%')
            .attr('width', widthScaleButton)
            .attr('height', heightButton)

    cycleScaleButton
        .append('text')
            .text('scale type')
            .attr('x', '4')
            .attr('y', heightButton / 2)
            .attr('dy', '.25em')

    
    let cyclePaletteButton =
        svgWrapper.append('g')
            .attr('id', 'cycle-scale-type-button')
            .attr('class', 'svg-rect-button')
            
    cyclePaletteButton
        .attr(
            'style',
            `transform: translate(${1.5 * PADDING + widthScaleButton}px, ${HEIGHT - heightButton}px`
        )

    cyclePaletteButton
        .append('rect')
            .attr('rx', '.75%')
            .attr('ry', '.75%')
            .attr('width', widthPaletteButton)
            .attr('height', heightButton)

    cyclePaletteButton
        .append('text')
            .text('palette')
            .attr('x', '4')
            .attr('y', heightButton / 2)
            .attr('dy', '.25em')

    return [cycleScaleButton, cyclePaletteButton];
}





function buildDatumOutline() {
    let datumRect = svgWrapper.select('.datum-rect');
    let outlineRect = svgWrapper.append('rect');

    outlineRect
        .attr('id', 'datum-outline')
        .attr('width', datumRect.attr('width') - 1)
        .attr('height', datumRect.attr('height') - 1)
        .attr('stroke', 'black')
        .attr('stroke-width', '1')
        .attr('fill', 'none')
        .attr('style', 'visibility: hidden;')

    
    return outlineRect;
}


class Tooltip {
    tooltip = svgWrapper.append('g')
        .attr('id', 'tooltip')

    tooltipRect = this.tooltip.append('rect')
        .attr('rx', '.75%')
        .attr('ry', '.75%')
        // Setting these attributes to 0 so that NaN doesn't have to be parsed
        // later 
        .attr('width', 0)
        .attr('height', 0);
    
    textElementQuantity = 0;
    textObj = {};
    tooltipTimeoutId = null;

    

    constructor(config) {
        this.containerWidth = config.containerWidth;
        this.containerHeight = config.containerHeight;
        this.paddingHorizontal = config.paddingHorizontal ? config.paddingHorizontal : 0;
        this.paddingVertical = config.paddingVertical ? config.paddingVertical : 0;
        this.timeoutDurationInMs = config.timeoutDurationInMs ? config.timeoutDurationInMs : 1000;
    }

    addTextElement(id) {
        let paddingVerticalEms = this.paddingVertical / this.#pixelsPerEm();
        let yOffset = (this.textElementQuantity === 0) ? 0 : (2 * this.textElementQuantity);;



        let textElement = this.tooltip.append('text')
            .attr('id', id)
            // dy: 1em; effectively shifts origin of text from bottom left to top left
            .attr('dy', '1em')
            .attr('y', paddingVerticalEms + yOffset +'em')
        
        
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

    setPos(x, y, isHorizontallyCenteredOnPoint = false) {
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
        
        let pixelsPerEm = parseFloat(getComputedStyle(this.tooltipRect.node().parentNode).fontSize);
        let rectHeightInPixels = parseFloat(this.tooltipRect.attr('height')) * pixelsPerEm;
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

    disappear() {
        this.tooltip
            .attr('style', 'visibility: hidden');
    }

    #pixelsPerEm() {
        return parseFloat(getComputedStyle(this.tooltipRect.node().parentNode).fontSize);
    }
    
}



// utility functions
function q(...input) {
    console.log(...input);
}

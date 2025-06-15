
var Polygon2D = toxi.geom.Polygon2D,
    Vec2D = toxi.geom.Vec2D,
    Rect = toxi.geom.Rect,
    Circle = toxi.geom.Circle,
    ConvexPolygonClipper = toxi.geom.ConvexPolygonClipper;

var voronoi = new Voronoi();

let guiParams = {
    "backgroundColor" : [255, 255, 255],
    "number of cells": 12,
    "cell size" : 60,
    "organoid size" : 100,
    "show voronoi" : false,
    "show cell colors" : true,
    "show cell centers" : true,
    "show cell boundary" : true,
}

let colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255]]

let gui;

let {VerletParticle2D, VerletSpring2D} = toxi.physics2d;
let {GravityBehavior} = toxi.physics2d.behaviors;

let physics;

let cells = []
let voronoiCells = []

let tempShape;

function createGui(){
    gui = new lil.GUI();
    gui.addColor(guiParams, 'backgroundColor', 255)
    gui.add(guiParams, 'number of cells', 1, 100, 1)
    gui.add(guiParams, 'cell size', 1, 200, 1)
    gui.add(guiParams, 'organoid size', 1, 250, 1)
    gui.add(guiParams, 'show voronoi')
    gui.add(guiParams, 'show cell colors')
    gui.add(guiParams, 'show cell centers')
    gui.add(guiParams, 'show cell boundary')
    gui.add(guiParams, 'Reset')

}

function reset(p5){
    physics.clear();
    for (let i = 0; i < physics.behaviors.length; i++){
        physics.removeBehavior(physics.behaviors[0]);
    }
    // Remove existing GUI
    if (gui) {
        gui.destroy();
    }

    // Reset parameters
    guiParams = {
        "backgroundColor": [255, 255, 255],
        "number of cells": 12,
        "cell size": 60,
        "organoid size": 100,
        "show voronoi": false,
        "show cell colors": true,
        "show cell centers": true,
        "show cell boundary": true,
    };

    // Add back the Reset function
    guiParams['Reset'] = function(){
        reset(p5);
    };

    // Recreate GUI
    createGui();
}

function createCell(x, y, size){
    let cell = new Circle(new Vec2D(x, y), size);
    cells.push(cell);
}

function drawCells(p5, cells){
    let clippedCells = clipCells(cells, voronoiCells);
    for (var i = 0; i < cells.length; i++){
        if(guiParams['show cell colors']){
            p5.fill(colors[i % colors.length]);
        }
        var poly = clippedCells[i];
        if(guiParams['show cell boundary']){
            drawPoly(p5, poly);
        }
        if(guiParams['show cell centers']){
            p5.fill(0);
            p5.ellipse(cells[i].x, cells[i].y, 5, 5);
            p5.noFill();
        }
    }
}

function sortCells(cells){
    cells.sort((a, b) => {
        if (a.x === b.x) {
            return a.y - b.y; // Compare `y` if `x` is the same
        }
        return a.x - b.x; // Compare `x`
    });
}

function sortVoronoiCells(cells){
    cells.sort((a, b) => {
        if (a.site.x === b.site.x) {
            return a.site.y - b.site.y; // Compare `y` if `x` is the same
        }
        return a.site.x - b.site.x; // Compare `x`
    });
}

function clipCells(cells, voronoiCells){
    let clippedCells = [];
    for (let i = 0; i < cells.length; i++){
        let poly = cells[i].toPolygon2D(30);
        let clipCell = voronoiCells[i];
        let clipper = new ConvexPolygonClipper(clipCell);
        let clippedCell;
        if (clipCell.vertices.length > 0){
            clippedCell = clipper.clipPolygon(poly);
        } else {
            clippedCell = poly;
        }
        clippedCells.push(clippedCell);
    }
    return clippedCells;
}

function drawPoly(p5, poly) {
    let centerX = p5.width / 2;
    let centerY = p5.height / 2;

    p5.beginShape();
    for (let i = 0; i < poly.vertices.length; i++) {
        let v = poly.vertices[i];
        p5.vertex(v.x, v.y);
    }
    p5.endShape();

    for (let i = 0; i < poly.vertices.length; i++) {
        let v1 = poly.vertices[i];
        let v2 = poly.vertices[(i + 1) % poly.vertices.length];

        // Calculate midpoint of the edge
        let midX = (v1.x + v2.x) / 2;
        let midY = (v1.y + v2.y) / 2;

        // Calculate distance from edge midpoint to organoid center
        let distanceToCenter = Math.sqrt((midX - centerX) ** 2 + (midY - centerY) ** 2);

        let outerThreshold = guiParams["organoid size"] + guiParams["cell size"] / 2;
        let innerThreshold = guiParams["organoid size"] - guiParams["cell size"] / 2;

        let strokeColor;
        if (distanceToCenter > outerThreshold) {
            strokeColor = 'lime';  // Outer edge
        } else if (distanceToCenter < innerThreshold) {
            strokeColor = 'red';   // Inner edge
        } else {
            strokeColor = 'blue'; // Side edge
        }

        p5.stroke(strokeColor);
        p5.line(v1.x, v1.y, v2.x, v2.y);
    }

    p5.stroke('black');
}

function drawVoronoiCell(p5, cell){
    p5.beginShape();
    for(let i = 0; i < cell.halfedges.length; i++){
        let edge = cell.halfedges[i];
        let v1 = edge.getStartpoint();
        p5.vertex(v1.x, v1.y);
    }
    p5.endShape(p5.CLOSE);
}

function drawVoronoi(p5, diagram){
    for(let i = 0; i < diagram.cells.length; i++){
        drawVoronoiCell(p5, diagram.cells[i]);
    }
}

function voronoiCellToPolygon(cell){
    let poly = new Polygon2D();
    for(let i = 0; i < cell.halfedges.length; i++){
        let edge = cell.halfedges[i];
        let v1 = edge.getStartpoint();
        let point = new Vec2D(v1.x, v1.y);
        poly.add(point);
    }
    return poly;
}


new p5(function(p5){
    p5.setup = function(){
        guiParams['Reset'] = function(){
            reset(p5);
        }
        let canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
        physics = new toxi.physics2d.VerletPhysics2D();
        // physics.addBehavior(new GravityBehavior(new toxi.geom.Vec2D(0, 0.1)));
        // add drag
        physics.setDrag(0.5);
        // physics.setWorldBounds(new toxi.geom.Rect(0, 0, p5.width, p5.height));

        createGui()

        // tempShape = new Rect(p5.width/2-100, p5.height/2-100, 200, 200).toPolygon2D(30);
        tempShape = new Circle(new Vec2D(p5.width/2, p5.height/2), 100).toPolygon2D(6);


        p5.strokeWeight(2);
    }



    p5.draw = function(){
        physics.update();
        p5.background(guiParams['backgroundColor']);
        p5.noFill();
        p5.drawOrganoid();
        // var sites = cells.map((cell) => ({x: cell.x, y: cell.y}));
        var voronoiDiagram = voronoi.compute(cells, {xl: 0, xr: p5.width, yt: 0, yb: p5.height})
        sortCells(cells);
        sortVoronoiCells(voronoiDiagram.cells);
        voronoiCells = voronoiDiagram.cells.map(voronoiCellToPolygon);

        if(guiParams['show voronoi']){
            for(let i = 0; i < voronoiCells.length; i++){
                // p5.fill(colors[i % colors.length]);
                p5.noFill();
                drawPoly(p5, voronoiCells[i]);
            }
        }
        // drawVoronoi(p5, voronoiDiagram);

        drawCells(p5, cells);
        // drawPoly(p5, tempShape);

    }

    p5.windowResized = function() {
        p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    };

// p5.doubleClicked = function(){
//     createCell(p5.mouseX, p5.mouseY, guiParams["cell size"]);
// };

    p5.drawOrganoid = function(){
        cells = [];
        let centerX = p5.width / 2;
        let centerY = p5.height / 2;
        let radius = guiParams["organoid size"]; // Radius of the organoid
        let N = guiParams["number of cells"];       // Number of cells

        for (let i = 0; i < N; i++) {
            let angle = p5.TWO_PI * (i / N);
            let x = centerX + radius * Math.cos(angle);
            let y = centerY + radius * Math.sin(angle);
            createCell(x, y, guiParams["cell size"]);
        }
    };

});
let c, renderGen;
let p;
let granulated = false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {
    granulated = false;
    c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if (val.done) {
        noLoop();
        if(!granulated) {
            granulate(4);
            granulated = true;
        }
    }
}

class Composition {
    constructor() {
        let p = getPalette();
        p.shuffle();
        push();
        this.bgCol = p.get(0);
        // this.bgCol = color("#e3dac9");
        colorMode(HSB);
        this.bgCol = color(
            hue(this.bgCol),
            saturation(this.bgCol) * 0.5,
            brightness(this.bgCol),
        );
        colorMode(RGB);
        pop();
        p.remove(0);

        this.colInnerActive = p.get(0);
        this.colOuterActive = p.get(1);

        this.colInnerInactive = p.get(2);
        this.colOuterInactive = p.get(3);

        this.setup();
    }

    setup() {
        let layers = [
            [random([0, 1])], 
            [random([0, 1]), random([0, 1])],
            [random([0, 1]), random([0, 1]), random([0, 1])]
        ];
        
        let depth = floor(random(40, 120));
        // depth = 80;
        let automata = new ElementaryAutomata(round(random()*255));

        for(let i = 3; i < depth; i++) {
            let prevLayer = layers[i - 1];
            let newLayer = [];

            for(let j = 0; j < prevLayer.length; j++) {
                let curr = prevLayer[j];
                let left = prevLayer[(j - 1 + prevLayer.length) % prevLayer.length];
                let right = prevLayer[(j + 1) % prevLayer.length];

                let updatedState = automata.calculateState(left, curr, right);
                newLayer.push(updatedState); 
            }

            // Every layer, add 1 to 2 new cells
            for(let n = 0; n < round(random(1, 3)); n++) {
                let randIdx = floor(random() * (newLayer.length + 1));
                let currState = newLayer[(randIdx - 1 + newLayer.length) % newLayer.length];
                // Copy state of neighbor to keep some continuity
                newLayer.splice(randIdx, 0, currState);
            }
            
            layers.push(newLayer);
        }


        let center = [width/2, height/2];
        let radius = min(width, height) * 0.48;
        radius = min(width, height) * 1.0;
        let cellSize = radius / layers[layers.length - 1].length;

        this.circs = [];

        let angleMod = PI / round(random(128, 256));
        let angleOffset = random()*TAU;

        for(let i = 0; i < layers.length; i++) {
            let colActive = lerpColor(this.colInnerActive, this.colOuterActive, i / layers.length);
            let colInactive = lerpColor(this.colInnerInactive, this.colOuterInactive, i / layers.length);

            for(let j = 0; j < layers[i].length; j++) {
                let state = layers[i][j];

                let r = map(i, 0, layers.length, cellSize * 0.5, radius);
                let angle = angleOffset + map(j, 0, layers[i].length, 0, TWO_PI) + (i * angleMod);

                let x = center[0] + r * cos(angle);
                let y = center[1] + r * sin(angle);
                let pos = [x, y];
                

                let circle = new Circle(pos, random(0.80, 1.50) * cellSize/2, state, state ? colActive : colInactive);
                this.circs.push(circle);
            }
        }

        noiseSeed(floor(random(99999999)));
        let detail = random(0.005, 0.0125);
        for(let circ of this.circs) {
            circ.offsets = getPtsNoise(circ.pts, detail);
        }

        let offsetMag = random(0.0025, 0.0075) * min(width, height);

        noiseSeed(floor(random(99999999)));
        detail = random(0.02, 0.05);
        for(let circ of this.circs) {
            circ.pressures = getPtsNoise(circ.pts, detail);
            circ.offsetPts(offsetMag);
        }
    }

    *render() {
        noStroke();
        let center = [width/2, height/2];
        radialGradient(
            ...center, 0, 
            ...center, max(width, height)/2, 
            this.bgCol,
            lerpColor(this.bgCol, color(20), 0.25)
        );
        rect(-20, -20, width + 40, height + 40);
        yield;

        noStroke();
        for(let i = 0; i < this.circs.length; i++) {
            this.circs[i].render();
            if (i % 25 == 0) yield;
        }
    }
}

class Circle {
    constructor(center, radius, state, col) {
        this.center = center;
        this.radius = radius;
        this.state = state;
        this.col = col;
        this.edgeCols = [];
        for(let i = 0; i < 5; i++) {
            let alpha = 255 * map(i, 0, 4, 0.1, 0.6);
            this.edgeCols.push(colTrans(this.col, alpha));
        }

        this.pts = computeCirclePts(this.center, this.radius);
        this.offsets = [];
        this.pressures = [];
    }

    offsetPts(mag) {
        for(let i = 0; i < this.pts.length; i++) {
            let pt = this.pts[i];
            let offsetAngle = this.offsets[i]*TAU;
            let pressure = this.pressures[i];
            let offsetX = mag * cos(offsetAngle) * pressure;
            let offsetY = mag * sin(offsetAngle) * pressure;
            this.pts[i] = [pt[0] + offsetX, pt[1] + offsetY];
        }
    }

    render() {
        
        if(this.state) {
            fill(this.col);
            beginShape();
            for(let pt of this.pts) {
                vertex(...pt);
            }
            endShape(CLOSE);
        }

        // Edge
        let rRange = [0.00025, 0.0015];
        for(let i = 0; i < this.pts.length; i++) {
            let pt = this.pts[i];

            // if (random() < 0.005) {
            //     let offsetAngle = random()*TAU;
            //     let offsetAmt = random(0.025, 0.075) * min(width, height);
            //     let offsetX = cos(offsetAngle) * offsetAmt;
            //     let offsetY = sin(offsetAngle) * offsetAmt;
            //     pt = [pt[0] + offsetX, pt[1] + offsetY];
            // }

            let offsetAngle = random()*TAU;
            let offsetAmt = random(0.75)*random(0.33);
            if (random() < 0.005) offsetAmt = random(2, 8)
            offsetAmt *= this.radius;
            let offsetX = cos(offsetAngle) * offsetAmt;
            let offsetY = sin(offsetAngle) * offsetAmt;
            pt = [pt[0] + offsetX, pt[1] + offsetY];


            let pressure = this.pressures[i];
            let r = (lerp(...rRange, pressure)/1.5) + (lerp(...rRange, random())/3);
            r *= min(width, height);
            
            fill(random(this.edgeCols));
            circle(...pt, r);
        }
    }
}

class ElementaryAutomata {
    constructor(ruleValue) {
        this.ruleValue = ruleValue;
        this.ruleSet = this.ruleValue.toString(2).padStart(8, "0");
    }

    calculateState(a, b, c) {
        let neighborhood = "" + a + b + c;
        let value = 7 - parseInt(neighborhood, 2);
        return parseInt(this.ruleSet[value]);
    }
}

function computeCirclePts(center, radius) {
    let dens = 0.0001 * min(width, height);
    let circumference = TAU * radius;
    let nPts = floor(circumference / dens);
    let pts = [];
    for(let i = 0; i < nPts; i++) {
        let angle = map(i, 0, nPts, 0, TAU);
        let x = center[0] + radius * cos(angle);
        let y = center[1] + radius * sin(angle);
        pts.push([x, y]);
    }
    return pts;
}

function getPtsNoise(pts, detail) {
    let ns = [];
    for(let pt of pts) {
        ns.push(map(
            noise(pt[0]*detail, pt[1]*detail),
            0.1, 0.9,
            0, 1, true
        ));
    }
    return ns;
}
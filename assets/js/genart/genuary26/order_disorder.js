let p, renderGen, granulated = false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {

    p = getPalette();
    p.shuffle();

    background(lerpColor(p.r(), color("#ebebd8"), random(0.75, 0.925)));

    let c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if(val.done) {
        noLoop();
        if(!granulated) {
            granulated = true;
            granulate(3);
        }
    }
}

class Composition {
    constructor() {

        this.cells = [];

        let padding = 0.025*min(width, height);

        let desiredDim = 0.025 * min(width, height);
        let ct_x = ceil((width - 2*padding)/desiredDim);
        let dim_x = (width - 2*padding)/ct_x;
        let ct_y = ceil((height - 2*padding)/desiredDim);
        let dim_y = (height - 2*padding)/ct_y;

        noiseSeed(round(random()*99999)); 

        let det = 0.002;

        for (let i = 0; i < ct_x; i++) {
            for (let j = 0; j < ct_y; j++) {
                let cell = new Cell(padding + i*dim_x, padding + j*dim_y, dim_x, dim_y, det);
                this.cells.push(cell);
            }
        }

        let c = p.r();
        for(let cell of this.cells) {
            cell.computeDisorders(det, c);
        }

        noiseSeed(round(random()*99999));
        let angDet = 0.01;
        let angOffset = random(TAU);
        let offStrength = 0.03 * min(width, height);
        for(let cell of this.cells) {
            cell.computeAngles(angDet, angOffset);
            cell.offsetPts(offStrength);
        }


    }

    *render() {
        let skipper = 20;

        for(let i = 0; i < this.cells.length; i++) {
            this.cells[i].render();
            if(i%skipper == 0) yield;
        }
        yield;
    }
}

class Cell {
    constructor(x, y, w, h, det) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.verts = [];
        this.disorders = [];
        this.angles = [];
        this.setup(det);
        
    }

    setup(det) {
        let ctr = [this.x + this.w/2, this.y + this.h/2];
        let w = min(this.w, this.h) * 0.4;

        let approx_disorder = noise(ctr[0]*det, ctr[1]*det);
        approx_disorder = map(approx_disorder, 0.2, 0.8, 0, 1, true);

        let vertStep = min(width, height)*lerp(0.00001, 0.01, 1-approx_disorder);

        // Create a cross shape

        // let vertStep = 0.001*min(width,height);


        let crossTop = [ctr[0], ctr[1] - w];
        let crossBottom = [ctr[0], ctr[1] + w];
        let crossLeft = [ctr[0] - w, ctr[1]];
        let crossRight = [ctr[0] + w, ctr[1]];

        let wh = w/3;

        let crossTL = [crossTop[0] - wh, crossTop[1]];
        let crossTR = [crossTop[0] + wh, crossTop[1]];

        let crossBL = [crossBottom[0] - wh, crossBottom[1]];
        let crossBR = [crossBottom[0] + wh, crossBottom[1]];

        let crossLT = [crossLeft[0], crossLeft[1] - wh];
        let crossLB = [crossLeft[0], crossLeft[1] + wh];

        let crossRT = [crossRight[0], crossRight[1] - wh];
        let crossRB = [crossRight[0], crossRight[1] + wh];

        let innerTL = [ctr[0]-wh, ctr[1]-wh];
        let innerTR = [ctr[0]+wh, ctr[1]-wh];
        let innerBR = [ctr[0]+wh, ctr[1]+wh];
        let innerBL = [ctr[0]-wh, ctr[1]+wh];

        let crossTopPts = ptsAB(crossTL, crossTR, vertStep);

        let rightCornerTopA = ptsAB(crossTR, innerTR, vertStep);
        let rightCornerTopB = ptsAB(innerTR, crossRT, vertStep);

        let crossRightPts = ptsAB(crossRT, crossRB, vertStep);

        let rightCornerBottomA = ptsAB(crossRB, innerBR, vertStep);
        let rightCornerBottomB = ptsAB(innerBR, crossBR, vertStep);

        let crossBottomPts = ptsAB(crossBR, crossBL, vertStep);

        let leftCornerBottomA = ptsAB(crossBL, innerBL, vertStep);
        let leftCornerBottomB = ptsAB(innerBL, crossLB, vertStep);

        let crossLeftPts = ptsAB(crossLB, crossLT, vertStep);

        let leftCornerTopA = ptsAB(crossLT, innerTL, vertStep);
        let leftCornerTopB = ptsAB(innerTL, crossTL, vertStep);

        this.verts = [
            ...crossTopPts, 
            ...rightCornerTopA, ...rightCornerTopB,
            ...crossRightPts,
            ...rightCornerBottomA, ...rightCornerBottomB,
            ...crossBottomPts,
            ...leftCornerBottomA, ...leftCornerBottomB,
            ...crossLeftPts,
            ...leftCornerTopA, ...leftCornerTopB
        ];
    }

    computeDisorders(detail, c) {
        this.disorders = [];
        let avg = 0;
        for (let v of this.verts) {
            let d = map(noise(v[0]*detail, v[1]*detail), 0.2, 0.8, 0, 1, true) ** 2;
            this.disorders.push(d);
            avg += d;
        }
        avg /= this.verts.length;
        // color("#1e3282")
        this.c = lerpColor(c, color(20), (1-avg)*0.5);
    }

    computeAngles(detail, offset) {
        this.angles = [];
        for (let v of this.verts) {
            let a = offset + map(noise(v[0]*detail, v[1]*detail), 0.1, 0.9, 0, 1.5*TAU, true);
            this.angles.push(a);
        }
    }

    offsetPts(strength) {
        for (let i = 0; i < this.verts.length; i++) {
            let d = this.disorders[i];
            let a = this.angles[i];
            this.verts[i][0] += cos(a) * d * strength;
            this.verts[i][1] += sin(a) * d * strength;
        }
    }

    render() {
        stroke(lerpColor(this.c, color(20), 0.175));
        fill(this.c);
        beginShape();
        for (let v of this.verts) {
            vertex(...v);
        }
        endShape(CLOSE);
    }
}


function ptsAB(a, b, step) {
    let pts = [];
    let d = dist(...a, ...b);
    let n = ceil(d/step);
    for (let i = 0; i <= n; i++) {
        let t = i/n;
        let x = lerp(a[0], b[0], t);
        let y = lerp(a[1], b[1], t);
        pts.push([x, y]);
    }
    return pts;
}
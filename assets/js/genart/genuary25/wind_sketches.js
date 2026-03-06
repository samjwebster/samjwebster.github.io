let p, renderGenerator;
let granulated = false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");
    pixelDensity(2);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {
    p = getPalette();
    p.shuffle();

    granulated = false;

    let c = new Composition();
    renderGenerator = c.render();
    loop();
}

function draw() {
    let nxt = renderGenerator.next();
    if(nxt.done) {
        if(!granulated) {
            granulate(2);
            granulated = true;
        }
        noLoop();
        console.log("done!");
    }
}

class Composition {
    constructor() {
        this.bgCol = lerpColor(p.r(), color(255), random(0.70, 0.80));

        this.generate();
    }

    generate() {
        this.pendulums = [];

        this.nRenderSteps = 1000;

        let pCount = 30;

        let pPad = random(0.20, 0.30) * height;
        pPad = 0;
        let yRange = [pPad, height - pPad];
        
        let xPad = random(0.05, 0.125) * width;
        xPad = 0;
        this.xRange = [xPad, width - xPad];
        
        let depthSeed = round(random()*9999999);
        noiseSeed(depthSeed);
        let depthDim = min(width, height);
        let depthNDetail = 20;
        let depthXOff = round(random()*9999999);
        let depthYOff = round(random()*9999999);

        for(let i = 0; i < pCount; i++) {
            let y = random(
                lerp(yRange[0], yRange[1], i/pCount),
                lerp(yRange[0], yRange[1], (i+1)/pCount)
            )
            let r = random(0.1, 0.10) * min(width,height);
            let c = p.r();

            // Precompute depths
            let depths = [];
            for(let j = 0; j < this.nRenderSteps; j++) {
                let t = j/(this.nRenderSteps-1);
                let pos = [
                    lerp(...this.xRange, t),
                    y
                ];
                let n = adjNoise(depthXOff + (pos[0]/depthDim)*depthNDetail, depthYOff + (pos[1]/depthDim)*depthNDetail);
                depths.push(n);
            }

            this.pendulums.push(new Pendulum(this, y, r, c, depths, 0)); 
        }


        return;
    }

    *render() {
        background(this.bgCol);
        yield;

        let windSeed = round(random()*9999999);
        noiseSeed(windSeed);
        this.windDim = min(width, height);
        this.windDetail = 1.5;
        this.windOffs = [
            round(random()*9999999),
            round(random()*9999999)
        ];

        let skipper = 2;
        
        for(let i = 0; i < this.nRenderSteps; i++) {
            let t = i/(this.nRenderSteps-1);

            for(let pendulum of this.pendulums) {
                pendulum.updateAndRender(t, i);
            }

            if(i%skipper == 0) yield;
        }
    }
}

class Pendulum {
    constructor(p, y, r, c, depths, dir) {
        this.p = p;
        this.y = y;
        this.r = r;

        this.dir = dir;

        this.maxSpeed = 2.5;

        let startingAngle = random()*TAU;
        let startingR = random()*r;

        this.offset = [
            cos(startingAngle) * startingR,
            sin(startingAngle) * startingR
        ];

        this.velocity = [
            cos(startingAngle),
            sin(startingAngle)
        ];

        let center;
        if(this.dir == 0) {
            center = [
                p.xRange[0],
                y
            ];
        } else {
            center = [
                p.xRange[1],
                y
            ];
        }

        let angleToCenter = atan2(center[1] - (y + this.offset[1]), center[0] - (p.xRange[0] + this.offset[0]));
        this.acc = [
            cos(angleToCenter),
            sin(angleToCenter)
        ];

        this.pts = [
            [center[0] + this.offset[0], 
            this.y + this.offset[1]]
        ];
        
        this.c = c;
        this.depths = depths;
        this.depthThresh = 0.60;

        this.featherMod = random(1.25, 3);
    }

    updateAndRender(t, i) {
        let d = this.depths[this.dir == 0 ? i : this.depths.length - 1 - i];

        this.update(t);

        if(d < this.depthThresh) {
            this.render();
        }

        return
    }

    update(t) {
        let centerInfluence = 0.1;

        let center = [
            lerp(...this.p.xRange, this.dir == 0 ? t : 1-t),
            this.y
        ]

        // Update offset and push to pts
        let newOffset = [
            this.offset[0] + this.velocity[0],
            this.offset[1] + this.velocity[1]
        ];

        if(dist(center[0], center[1], center[0] + newOffset[0], center[1] + newOffset[1]) > this.r) {
            centerInfluence = 0.50;
        }

        this.offset = newOffset;

        let newPos = [
            center[0] + this.offset[0],
            center[1] + this.offset[1]
        ]

        this.pts.push(newPos);
        
        // Update velocity
        this.velocity = [
            this.velocity[0] + this.acc[0] * 0.1,
            this.velocity[1] + this.acc[1] * 0.1
        ];

        let speed = dist(0, 0, this.velocity[0], this.velocity[1]);
        if(speed > this.maxSpeed) {
            this.velocity = [
                this.velocity[0] / speed * this.maxSpeed,
                this.velocity[1] / speed * this.maxSpeed
            ];
        }

        // Update acceleration
        
        // Center
        let angleToCenter = atan2(center[1] - newPos[1], center[0] - newPos[0]);

        this.acc = [
            lerp(this.acc[0], cos(angleToCenter), centerInfluence),
            lerp(this.acc[1], sin(angleToCenter), centerInfluence)
        ];

        // Wind
        let windInfluence = 0.25;
        let n = adjNoise(this.p.windOffs[0] + (newPos[0]/this.p.windDim)*this.p.windDetail, this.p.windOffs[1] + (newPos[1]/this.p.windDim)*this.p.windDetail, t);
        let nA = n*TAU;
        
        this.acc = [
            this.acc[0] + cos(nA) * windInfluence,
            this.acc[1] + sin(nA) * windInfluence
        ];

        
    }

    render() {
        let a = this.pts[this.pts.length-2];
        let b = this.pts[this.pts.length-1];

        let currSpeed = dist(0, 0, this.velocity[0], this.velocity[1]);

        scribblyLine(a, b, this.c, currSpeed * this.featherMod);

    }
}

function adjNoise(x=0,y=0,z=0) {
    return map(noise(x, y, z), 0.2, 0.8, 0, 1);
}

function scribblyLine(a, b, col, feather) {
    let paperGrainDim = 0.002 * min(width, height);

    let dens = 0.0001 * min(width,height);
    let d = dist(...a, ...b);
    let ct = d/dens;

    let wobbledCols = []
    for(let i = 0; i < 5; i++) wobbledCols.push(wobbleCol(col, 0.05));
    let colOptions = [];
    wobbledCols.forEach(c => {
        // colOptions.push(c);
        colOptions.push(colTrans(c, 16));
        colOptions.push(colTrans(c, 32));
    });

    let dim = min(width, height);

    noStroke();
    for(let i = 0; i < ct; i++) {
        let t = i/(ct-1);
        let pos = lerpPos(a, b, t);

        pos = rPoint(pos, feather);

        if(random() > 0.50) {
            pos[0] = floor(pos[0]/paperGrainDim) * paperGrainDim;
            pos[1] = floor(pos[1]/paperGrainDim) * paperGrainDim;
        }

        fill(random(colOptions));

        circle(...pos, random(0.001, 0.0025) * dim);
    }
}
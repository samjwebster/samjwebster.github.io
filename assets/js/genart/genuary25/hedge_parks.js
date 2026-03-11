let p, renderGenerator;
let granulated = false;

let heightSeed;
let pathNoise;
let faunaNoise1;
let faunaNoise2;
let faunaNoise3;
let faunaNoise4;

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
    // p.makeMonochromatic(overwrite=true, focus=null, amount=0.90);
    // p.saturate(0.9)

    heightSeed = round(random(9999999999999));

    pathNoise = [
        round(random(9999999999999)),
        random(1.75, 2.5),
        random(1.75, 2.5),
        null,
    ];

    faunaNoise1 = [
        round(random(9999999999999)),
        random(1.5, 2.5),
        random(1.5, 2.5),
        random([2, 3])
    ];

    faunaNoise2 = [
        round(random(9999999999999)),
        random(1.5, 2.5),
        random(1.5, 2.5),
        random([2, 3])
    ];

    faunaNoise3 = [
        round(random(9999999999999)),
        random(1.5, 2.5),
        random(1.5, 2.5),
        random([2, 3])
    ];

    faunaNoise4 = [
        round(random(9999999999999)),
        random(1.5, 2.5),
        random(1.5, 2.5),
        random([2, 3])
    ];

    let c = new Composition();
    renderGenerator = c.render();

    loop();
}

function draw() {
    let nxt = renderGenerator.next();
    if(nxt.done) {
        if(!granulated) {
            granulated = true;
            granulate(4);
        }
        noLoop();
    }

}

class Composition {
    constructor() {
        this.generate();

        this.cols = {
            "dirt": color("#36230f"),
            "grass": color("#2f5d23"),
            "bush": color("#163618"),
            "bark": color("#3f2e1c"),
            "path": color("#78674a"),
        }

        this.cols["bark"] = lightenCol(this.cols["bark"], 0.10);

        let tint = p.r();
        let tintAmt = 0.10;
        // For each key in cols, create a new color that is a lerp between the original color and the tint
        for(let key in this.cols) {
            this.cols[key] = lerpColor(this.cols[key], tint, tintAmt);
        }

        let lightA = (
            random()>0.5 ? random(0.03, 0.25) : random(0.75, 0.97)
        ) * -PI;

        this.lightDir = createVector(cos(lightA), sin(lightA)).normalize();

        this.path1 = [random(0.05, 0.30), random(0.005, 0.0075)];
        this.path2 = [random(0.35, 0.60), random(0.005, 0.0075)];
        this.path3 = [random(0.65, 0.95), random(0.005, 0.0075)];
        this.faunaMod = random([2, 3]);
    }
    
    generate() {
        this.grid = [];

        this.lightDir = random([0, 1]);

        this.maxHeight = 0.20 * min(width,height);

        let gridSize = 100;
        let cellW = (width/2.5)/gridSize;
        for(let i = 0; i < gridSize; i++) {
            this.grid.push([]);
            let x = i * cellW;
            for(let j = 0; j < gridSize; j++) {
                let y = j * cellW;
                this.grid[i].push(new Cell(this, x, y, cellW, p.r()));
            }
        }
    }

    *render() {
        // background(lerpColor(p.r(), color(255), random(0.33, 0.66)));
        push();
        let bgc = p.r();
        let bgL = lerpColor(bgc, color(255), 0.50);
        let bgD = lerpColor(bgc, color(0), 0.10);

        let bgGrad = drawingContext.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, bgL);
        bgGrad.addColorStop(0.5, bgc);
        bgGrad.addColorStop(1, bgD);
        drawingContext.fillStyle = bgGrad;
        noStroke();
        rect(0, 0, width, height);
        pop();
        
        
        yield;

        let allCells = [];
        for(let i = 0; i < this.grid.length; i++) {
            for(let j = 0; j < this.grid[i].length; j++) {
                allCells.push(this.grid[i][j]);
            }
        }

        // Sort cells by max isoPoints y value
        allCells.sort((a, b) => {
            let aMax = Math.max(a.isoPoints[0][1], a.isoPoints[1][1], a.isoPoints[2][1], a.isoPoints[3][1]);
            let bMax = Math.max(b.isoPoints[0][1], b.isoPoints[1][1], b.isoPoints[2][1], b.isoPoints[3][1]);
            return aMax - bMax;
        });

        // Render the grid isometrically
        let skipper = 25;
        for(let i = 0; i < allCells.length; i++) {
            allCells[i].render();
            if(i % skipper == 0) yield;
        }
        yield;
    }
    
}

class Cell {
    constructor(parent, x, y, w, c, faunaN) {
        this.p = parent;
        this.x = x;
        this.y = y;
        this.w = w;
        this.c = c;

        this.faunaN = faunaN;

        this.offScreen = 0;

        this.setupIso();
    }

    setupIso() {
        this.isoPoints = [
            carToIso([this.x, this.y]),
            carToIso([this.x + this.w, this.y]),
            carToIso([this.x + this.w, this.y + this.w]),
            carToIso([this.x, this.y + this.w])
        ];
        let nDetail = 12;
        this.heights = [
            map(noise(this.x/width * nDetail, this.y/height * nDetail), 0.2, 0.8, 0, 1, true),
            map(noise((this.x + this.w)/width * nDetail, this.y/height * nDetail), 0.2, 0.8, 0, 1, true),
            map(noise((this.x + this.w)/width * nDetail, (this.y + this.w)/height * nDetail), 0.2, 0.8, 0, 1, true),
            map(noise(this.x/width * nDetail, (this.y + this.w)/height * nDetail), 0.2, 0.8, 0, 1, true)
        ];
        
        for(let i = 0; i < this.heights.length; i++) {
            this.heights[i] = (this.heights[i] ** 2) * this.w * 16;
        }

        // if all points are off the screen, dont render
        this.isoPoints.forEach(p => {
            if(p[0] < 0 || p[0] > width || p[1] < 0 || p[1] > height) {
                this.offScreen += 1;
            }
        });


        this.isoTop = [];
        for(let i = 0; i < this.isoPoints.length; i++) {
            this.isoTop.push([
                this.isoPoints[i][0],
                this.isoPoints[i][1] - this.heights[i]
            ]);
        }
    }

    render() {
        noiseSeed(heightSeed);
        let nDetail = 1.5;
        let posToHeight = (pos) => {
            let n = adjNoise(pos[0]/width * nDetail, pos[1]/height * nDetail);
            n = n**1.5;
            n = (n * 2)-1;
            let h = n * this.p.maxHeight;
            return [pos[0], pos[1] - h];
        }

        noStroke();
        let ptsToDo = [];
        let ptCount = round(this.w*12);
        let normStep = 0.0025 * min(width, height);
        for(let i = 0; i < ptCount; i++) {
            let xt = random();
            let yt = random();
            let pos = lerpPos(
                lerpPos(this.isoPoints[0], this.isoPoints[1], xt),
                lerpPos(this.isoPoints[3], this.isoPoints[2], xt),
                yt
            );
            let posWithHeight = posToHeight(pos);
            let posLeft = posToHeight([pos[0] - normStep, pos[1]]);
            let posRight = posToHeight([pos[0] + normStep, pos[1]]);
            let normX = getNorm(posLeft, posRight);
            let lightAmt = normX.dot(this.p.lightDir);
            lightAmt = map(lightAmt, 0, 1, 0.15, 0.55, true);
            ptsToDo.push([pos, posWithHeight, lightAmt]);
        }

    
        // Sort by y value
        ptsToDo.sort((a, b) => a[0][1] - b[0][1]);
        
        // Get n values
        [pathNoise, faunaNoise1, faunaNoise2, faunaNoise3, faunaNoise4].forEach(nData => {
            noiseSeed(nData[0]);
            let detailX = nData[1];
            let detailY = nData[2];

            for(let i = 0; i < ptsToDo.length; i++) {
                let basePos = ptsToDo[i][0];
                let n = adjNoise((basePos[0]/width) * detailX, (basePos[1]/height) * detailY);
                ptsToDo[i].push(n);
            }
        });

        for(let i = 0; i < ptsToDo.length; i++) {
            // let basePos = ptsToDo[i][0];
            let pos = ptsToDo[i][1];
            let lightAmt = ptsToDo[i][2];

            let pathN = ptsToDo[i][3];
            let faunaN1 = ptsToDo[i][4];
            let faunaN2 = ptsToDo[i][5];
            let faunaN3 = ptsToDo[i][6];
            let faunaN4 = ptsToDo[i][7];

            // Dirt
            stroke(lerpColor(p.get(0), color(0), 0.80));
            line(...pos, pos[0], height);
            
            // Path and Fauna

            let path1 = this.p.path1;
            let path2 = this.p.path2;
            let path3 = this.p.path3;

            let faunaN = null;
            let fauna;
            let faunaMod;
            if(pathN < path1[0] - path1[1]) {faunaN = faunaN1; faunaMod = faunaNoise1[3];}
            else if(pathN >= path1[0]-path1[1] && pathN <= path1[0]+path1[1]) fauna = "path";
            else if(pathN > path1[0]+path1[1] && pathN < path2[0]-path2[1]) {faunaN = faunaN2; faunaMod = faunaNoise2[3];}
            else if(pathN >= path2[0]-path2[1] && pathN <= path2[0]+path2[1]) fauna = "path";
            else if(pathN > path2[0]+path2[1] && pathN < path3[0]-path3[1]) {faunaN = faunaN3; faunaMod = faunaNoise3[3];}
            else if(pathN >= path3[0]-path3[1] && pathN <= path3[0]+path3[1]) fauna = "path";
            else if(pathN > path3[0]+path3[1]) {faunaN = faunaN4; faunaMod = faunaNoise4[3];}

            if(faunaN != null) {
                let faunaVal = round(100 * faunaN);
                if(faunaVal % faunaMod == 0) fauna = "bush";
                else fauna = "grass";
            }

            // else {
            //     let faunaVal = round(100 * faunaN);
            //     if(faunaVal % this.p.faunaMod == 0) fauna = "bush";
            //     else fauna = "grass";
            // }
            noStroke();

            if(fauna == "grass") {
                // continue;
                
                // let bladeCt = random(3, 6);
                let bladeCt = 2;
                let bladeR = 0.0075 * min(width, height);
                let gCol = lightenCol(this.p.cols["grass"], lightAmt);
                for(let j = 0; j < bladeCt; j++) {
                    let bladeEnd = [
                        pos[0] + random(-bladeR/4, bladeR/4),
                        pos[1] + random(-bladeR, -bladeR/4)
                    ];
                    fill(wobbleCol(gCol, 0.1));
                    beginShape();
                    vertex(pos[0] - bladeR/16, pos[1]);
                    vertex(pos[0] + bladeR/16, pos[1]);
                    vertex(...bladeEnd);
                    endShape(CLOSE);
                }
            } else if (fauna == "path") {
                let col = wobbleCol(this.p.cols["path"], 0.025);
                col = lightenCol(col, lightAmt);
                fill(col);
                // fill(this.p.cols["dirt"]);
                circle(...pos, random(1, 2.5));
            } else if (fauna == "bush") {
                for(let j = 0; j < 5; j++) {
                    let maxBushH = 0.015 * min(width, height);
                    let bushH = random() * maxBushH;

                    let bushT = bushH/maxBushH;
                    
                    let col = lerpColor(this.p.cols["bush"], color(this.p.cols["bark"]), 1-bushT);

                    col = lerpColor(col, lightenCol(col, lightAmt), bushT * 0.90);
                    col = colTrans(col, random(0.2, 0.6));

                    fill(colTrans(wobbleCol(col, 0.05), 0.5*255));
                    circle(pos[0], pos[1] - bushH, random(1, 1.5));
                }
            }
        }
        // exit();
    }
}

function carToIso(p) {
    return [
        (p[0] + p[1]) + width/10,
        ((p[1] - p[0]) / 2) + height/2
    ];
}

function isoToCar(p) {
    return [
        (p[0] - p[1]) / 1.5,
        p[0]/3 + p[1]/1.5
    ];
}

function adjNoise(x=0, y=0, z=0) {
    return map(noise(x, y, z), 0.2, 0.8, 0, 1);
}

function getNorm(a, b) {
    return p5.Vector.sub(
        createVector(...a),
        createVector(...b),
    ).rotate(PI/2)
    .normalize();
}

function lightenCol(col, amt) {
    push();
    colorMode(HSB);
    let h = hue(col);
    let s = saturation(col);
    let b = brightness(col)
    if(amt <= 0.5) b = lerp(0, b, (amt*2));
    else b = lerp(b, 0, (amt-0.5)*2);
    let newCol = color(h, s, b);
    pop();
    return newCol;
}
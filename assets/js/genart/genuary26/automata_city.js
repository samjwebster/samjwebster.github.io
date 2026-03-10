let p, renderGenerator;
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
    
    p = getPalette();
    p.shuffle();

    let c = new Composition();
    renderGenerator = c.render();
    loop();
}


function draw() {
    let nxt = renderGenerator.next();
    if(nxt.done) {
        if(!granulated) {
            granulate(7);
        }
        noLoop();
        console.log("done!");
    }
}

// function draw() {
//   // Draw each cell based on its state.
//   for (let i = 0; i < cells.length; i++) {
//     let x = i * w;
//     noStroke();
//     fill(255 - cells[i] * 255);
//     square(x, y, w);
//   }

//   // Move to the next row.
//   y += w;

//   // Prepare an array for the next generation of cells.
//   let nextCells = [];

//   // Iterate over each cell to calculate its next state.
//   let len = cells.length;
//   for (let i = 0; i < len; i++) {
//     // Calculate the states of neighboring cells
//     let left = cells[(i - 1 + len) % len];
//     let right = cells[(i + 1) % len];
//     let state = cells[i];

//     let pos = [i*w, y];
//     let n = noise(pos[0]/width * 10, pos[1]/height * 10);

//     let newState;
//     let automataIndex = floor(n * automata.length);
//     newState = automata[automataIndex].calculateState(left, state, right);


//     // Set the new state based on the current state and neighbors.
//     // let newState = calculateState(left, state, right);
//     nextCells[i] = newState;
//   }

//   // Update the cells array for the next generation.
//   cells = nextCells;

//     // If the cells have reached the bottom of the canvas, stop the animation.'
//     if (y >= height) {
//         noLoop();
//     }
// }

class Composition {
    constructor() {

        let tVal = 0.95 * 256;
        this.topLeft = colTrans(p.get(0), tVal);
        this.topRight = colTrans(p.get(1), tVal);
        this.bottomLeft = colTrans(p.get(2), tVal);
        this.bottomRight = colTrans(p.get(3), tVal);

        this.generate();        
    }

    generate() {
        this.automata = [];
        let nAutomata = 5;
        for(let i = 0; i < nAutomata; i++) {
            this.automata[i] = new ElementaryAutomata(round(random()*255));
        }

        let desiredWidth = 0.0065 * width;
        // let desiredWidth = 0.02 * width;
        let countX = ceil(width / desiredWidth);
        let cellW = width / countX;

        let desiredHeight = desiredWidth;
        let countY = ceil(height / desiredHeight);
        let cellH = height / countY;

        this.grid = [];

        let nDim = min(width, height);
        let nDetail = 8;
        let offX = random()*999999;
        let offY = random()*999999;

        let heightScale = random(0.2, 0.4) * min(width, height);

        for(let i = 0; i < countX; i++) {
            this.grid.push([]);
            let ti = i/countX;
            let x = lerp(0, width, ti);
            for(let j = 0; j < countY; j++) {
                let tj = j/countY;
                let y = lerp(0, height, tj);

                let n = map(noise(offX + ((x/nDim) * nDetail), offY + ((y/nDim) * nDetail)), 0.2, 0.8, 0, 0.9999, true);

                this.grid[i].push(new Cell(x, y, cellW, cellH, n, lerpColor(this.topLeft, this.topRight, ti), lerpColor(this.bottomLeft, this.bottomRight, ti), this.automata[floor(n * nAutomata)].col, heightScale, floor(n * nAutomata)));
            }
        }

        // Set starters
        let nstarters = round(random(0.25*countX, 0.50*countX));
        let startarr = [];
        for(let i = 0; i < countX; i++) startarr.push(i);
        startarr = shuffleArray(startarr);

        for(let i = 0; i < nstarters; i++) {
            this.grid[startarr[i]][0].updateState(1);
        }

        for(let i = 0; i < countY - 1; i++) {
            for(let j = 0; j < countX; j++) {
                let cell = this.grid[j][i];
                let left = this.grid[(j - 1 + countX) % countX][i];
                let right = this.grid[(j + 1) % countX][i];
                let newState = this.automata[floor(cell.n * nAutomata)].calculateState(left.state, cell.state, right.state);
                this.grid[j][i+1].updateState(newState);
            }
        }

        // Compute corner ns
        for(let i = 0; i < nAutomata; i++) {
            noiseSeed(round(random()*999999));
            let detail = random(0.002, 0.008);
            for(let j = 0; j < this.grid.length; j++) {
                for(let k = 0; k < this.grid[j].length; k++) {
                    if(this.grid[j][k].automataIndex == i) {
                        this.grid[j][k].computeCornerNs(detail);
                    }
                }   
            }
        }

    }

    *render() {
        background(128);
        yield;

        // Render row by row
        let skipper = 10;

        for(let i = 0; i < this.grid[0].length; i++) {
            for(let j = 0; j < this.grid.length; j++) {
                if(this.grid[j][i].onScreen()) this.grid[j][i].render();
            }
            if(i%skipper==0) yield;
        }
    }
}


class ElementaryAutomata {
    constructor(ruleValue) {
        this.ruleValue = ruleValue;
        this.ruleSet = this.ruleValue.toString(2).padStart(8, "0");
        this.col = p.r();
    }

    calculateState(a, b, c) {
        let neighborhood = "" + a + b + c;
        let value = 7 - parseInt(neighborhood, 2);
        return parseInt(this.ruleSet[value]);
    }
}

function cartToIso(x, y) {
    let isoX = x - y;
    let isoY = (x + y) / 2;
    return [isoX, isoY];
}

class Cell {
    constructor(x, y, w, h, n, cTop, cBottom, nCol, hs, automataIndex) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.n = n;
        this.cTop = cTop;
        this.cBottom = cBottom;
        this.nCol = nCol;
        this.hs = hs;
        this.automataIndex = automataIndex;

        this.corners = [
            [this.x, this.y],
            [this.x + this.w, this.y],
            [this.x + this.w, this.y + this.h],
            [this.x, this.y + this.h]
        ];

        this.corners_iso = [];
        for(let corner of this.corners) {
            let iso = cartToIso(corner[0], corner[1]);
            iso[0] += width / 2;
            iso[0] = map(iso[0], 0, width, -0.4*width, width*1.4);
            iso[1] = map(iso[1], 0, height, -0.4*height, height*1.4);
            this.corners_iso.push(iso);
        }

        this.state = 0;
    }

    computeCornerNs(nDetail = 0.01) {
        this.corner_ns = [];
        let centerLerpT = 0.4;
        let center = [0, 0];
        for(let corner of this.corners) {
            center[0] += corner[0];
            center[1] += corner[1];
        }
        center[0] /= this.corners.length;
        center[1] /= this.corners.length;

        for(let corner of this.corners) {
            let modPos = lerpPos(corner, center, centerLerpT);
            let n = noise(modPos[0] * nDetail, modPos[1] * nDetail);
            this.corner_ns.push(n);
        }

        this.corners_upper_iso = [];
        for(let i = 0; i < this.corners.length; i++) {
            let n = this.corner_ns[i];
            if(this.state == 0) {
                n = map(n, 0.1, 0.9, 0.25, 0.5, true);
            } else {
                n = map(n, 0.2, 0.8, 0.75, 1.0, true);
            }

            this.corners_upper_iso.push([
                this.corners_iso[i][0],
                this.corners_iso[i][1] - (n * this.hs)
            ]);
        }
    }

    updateState(state) {
        this.state = state;
    }

    onScreen() {
        for(let v of this.corners_iso) {
            if(v[0] >= -0.25*width && v[0] <= 1.25*width && v[1] >= -0.25*height && v[1] <= 1.25*height) {
                return true;
            }
        }

        for(let v of this.corners_upper_iso) {
            if(v[0] >= -0.25*width && v[0] <= 1.25*width && v[1] >= -0.25*height && v[1] <= 1.25*height) {
                return true;
            }
        }

        return false;
    }

    render() {
        let col_main, col_light, col_dark, col_darker, col_darkest;

        col_main = lerpColor(this.nCol, (this.state == 1 ? this.cTop : this.cBottom), 0.6);
        col_light = lerpColor(col_main, color(255), 0.15);
        col_dark = lerpColor(col_main, color(0), 0.15);
        col_darker = lerpColor(col_main, color(0), 0.3);
        col_darkest = lerpColor(col_main, color(0), 0.45);

        // 1. top face
        fill(col_light);
        stroke(col_main);
        beginShape();
        for(let v of this.corners_upper_iso) {
            vertex(v[0], v[1]);
        }
        endShape(CLOSE);
    
        // 2. left face
        gradFill([0, max(this.corners_upper_iso[2][1], this.corners_upper_iso[3][1])],
        [0, min(this.corners_iso[2][1], this.corners_iso[3][1])],
        col_main, col_dark);
        stroke(col_darker);
        beginShape();
        vertex(...this.corners_iso[2]);
        vertex(...this.corners_upper_iso[2]);
        vertex(...this.corners_upper_iso[3]);
        vertex(...this.corners_iso[3]);
        endShape(CLOSE);

        // 3. right face
        gradFill([0, max(this.corners_upper_iso[1][1], this.corners_upper_iso[2][1])],
        [0, min(this.corners_iso[1][1], this.corners_iso[2][1])],
        col_dark, col_darker);
        stroke(col_darkest);
        beginShape();
        vertex(...this.corners_iso[1]);
        vertex(...this.corners_upper_iso[1]);
        vertex(...this.corners_upper_iso[2]);
        vertex(...this.corners_iso[2]);
        endShape(CLOSE);
    }
}
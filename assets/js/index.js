let prevDims;
let canvas, canvas_container;
let p, c, renderGenerator;
let eggshell;

function setup() {
    let dims = getWindowDims();
    prevDims = dims;
    canvas = createCanvas(...dims);
    canvas_container = document.getElementById("canvas_container");
    canvas.parent(canvas_container);
    canvas.id = "backdrop";

    eggshell = color("#f0ead6");

    p = getPalette();
    p.shuffle();

    noStroke();
    rectMode(CENTER);

    c = new Composition();
    c.render();

    // link the #reset-button to restart_composition
    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = restart_composition;

    // link the collapse button to show/hide #content
    let collapse_button = document.getElementById("collapse-button");
    let content = document.getElementById("content");
    collapse_button.onclick = () => {
        if(content.style.display === "none") {
            content.style.display = "block";
            collapse_button.innerText = "Hide Info";
        } else {
            content.style.display = "none";
            collapse_button.innerText = "Show Info";
        }
    };

    noLoop();

}

function restart_composition() {
    if(c) c.dispose();

    clear();
    p = getPalette();
    p.shuffle();
    c = new Composition();
    c.render();
}

let rounds = 0;
let interval = 1000;
let time_since_last = 0;

class Composition {
    constructor() {
        let tVal = 0.95 * 256;
        this.topLeft = colTrans(p.get(0), tVal);
        this.topRight = colTrans(p.get(1), tVal);
        this.bottomLeft = colTrans(p.get(2), tVal);
        this.bottomRight = colTrans(p.get(3), tVal);
        this.num_updates = 0;

        this.data = {};

        this.initialize();        
    }

    initialize() {
        this.automata = [];
        let nAutomata = 5;
        for(let i = 0; i < nAutomata; i++) {
            this.automata[i] = new ElementaryAutomata(round(random()*255));
        }

        let desiredCountX = width/5;
        let requiredWidth = floor(width / desiredCountX);
        this.data.desiredWidth = requiredWidth;
        // this.data.desiredWidth = 0.01 * width;
        this.data.countX = ceil(width / this.data.desiredWidth);
        this.data.cellW = width / this.data.countX;

        this.data.desiredHeight = this.data.desiredWidth;
        this.data.countY = ceil(height / this.data.desiredHeight);
        this.data.cellH = height / this.data.countY;

        this.grid = [];

        this.data.nDim = min(width, height);
        this.data.nDetail = 8;
        this.data.offX = random()*999999;
        this.data.offY = random()*999999;

        this.data.nFunc = (x, y) => map(noise(this.data.offX + ((x/this.data.nDim) * this.data.nDetail), this.data.offY + ((y/this.data.nDim) * this.data.nDetail)), 0.2, 0.8, 0, 0.9999, true);

        for(let i = 0; i < this.data.countX; i++) {
            this.grid.push([]);
            let ti = i/this.data.countX;
            let x = lerp(0, width, ti);
            for(let j = 0; j < this.data.countY; j++) {
                let tj = j/this.data.countY;
                let y = lerp(0, height, tj);

                let n = this.data.nFunc(x, y);

                this.grid[i].push(new Cell(
                    x, y, this.data.cellW, this.data.cellH, 
                    n, 
                    lerpColor(this.topLeft, this.topRight, ti), 
                    lerpColor(this.bottomLeft, this.bottomRight, ti), 
                    this.automata[floor(n * this.automata.length)].col
                ));
            }
        }

        // Set starters
        let nstarters = round(random(0.25*this.data.countX, 0.50*this.data.countX));
        let startarr = [];
        for(let i = 0; i < this.data.countX; i++) startarr.push(i);
        startarr = shuffleArray(startarr);

        for(let i = 0; i < nstarters; i++) {
            this.grid[startarr[i]][0].updateState(1);
        }

        for(let i = 0; i < this.data.countY - 1; i++) {
            for(let j = 0; j < this.data.countX; j++) {
                let cell = this.grid[j][i];
                let left = this.grid[(j - 1 + this.data.countX) % this.data.countX][i];
                let right = this.grid[(j + 1) % this.data.countX][i];

                let newState = this.automata[floor(cell.n * this.automata.length)].calculateState(left.state, cell.state, right.state);
                this.grid[j][i+1].updateState(newState);
            }
        }

        // Setup CSS canvas sliding
        // move the canvas down by the height of one cell
        // then transition it back up to 0 over the interval time
        // Function to trigger the slide animation
        // this.triggerSlide = () => {
        //     let slideAmount = this.data.cellH;
        //     let slideTime = interval;
        //     canvas_container.style.transition = "";
        //     canvas_container.style.transform = `translateY(${slideAmount}px)`;

        //     setTimeout(() => {
        //     canvas_container.style.transition = `transform ${slideTime}ms linear`;
        //     canvas_container.style.transform = `translateY(0px)`;
        //     }, 20);

        //     setTimeout(() => {
        //     canvas_container.style.transition = "";
        //     canvas_container.style.transform = "";
        //     }, slideTime + 30);
        // };

        this.triggerSlide = () => {
            let slideAmount = this.data.cellH;
            let slideTime = interval;

            // reset and apply slide
            canvas_container.style.transition = "";
            canvas_container.style.transform = `translateY(${slideAmount}px)`;

            requestAnimationFrame(() => {
                canvas_container.style.transition = `transform ${slideTime}ms linear`;
                canvas_container.style.transform = `translateY(0px)`;
            });

            // Clean up old listener if it exists
            if (this._onEnd) {
                canvas_container.removeEventListener("transitionend", this._onEnd);
            }

            this._onEnd = () => {
                canvas_container.removeEventListener("transitionend", this._onEnd);
                requestAnimationFrame(() => {
                    this.update();
                    this.render();
                });
            };

            canvas_container.addEventListener("transitionend", this._onEnd);
        };

        // Trigger the slide animation initially
        this.triggerSlide();

        // render everythign
        for(let j = 0; j < this.grid.length; j++) {
            for(let i = 0; i < this.grid[0].length; i++) {
                this.grid[j][i].render();
            }
        }
    }

    update() {
        this.num_updates += 1;
        this.triggerSlide();

        // shift the cells up and add a new row at the bottom
        for(let j = 0; j < this.data.countX; j++) {
            for(let i = 0; i < this.data.countY - 1; i++) {
                let cellAbove = this.grid[j][i+1];
                this.grid[j][i].updateState(cellAbove.state);
                this.grid[j][i].n = cellAbove.n;
                this.grid[j][i].nCol = cellAbove.nCol;
            }
        }

        // use second to last row to update last row
        let i = this.data.countY - 2;
        for(let j = 0; j < this.data.countX; j++) {
            let cell = this.grid[j][i];
            let left = this.grid[(j - 1 + this.data.countX) % this.data.countX][i];
            let right = this.grid[(j + 1) % this.data.countX][i];

            let newState = this.automata[floor(cell.n * this.automata.length)].calculateState(left.state, cell.state, right.state);
            this.grid[j][this.data.countY - 1].updateState(newState);
            this.grid[j][this.data.countY - 1].n = cell.n;
            this.grid[j][this.data.countY - 1].nCol = cell.nCol;

            // get new n values
            let x = this.grid[j][i+1].x;
            let y = this.grid[j][i+1].y + this.data.cellH * (this.num_updates - 1);
            this.grid[j][i+1].n = this.data.nFunc(x, y);
            this.grid[j][i+1].nCol = this.automata[floor(this.grid[j][i+1].n * this.automata.length)].col;
        }
    }
    render() {
        // shift the existing cells up
        copy(
            0, this.data.cellH,
            width, height - this.data.cellH,
            0, 0,
            width, height - this.data.cellH
        );

        // render the new row at the bottom
        for(let j = 0; j < this.grid.length; j++) {
            this.grid[j][this.grid[0].length - 1].render();
        }
    }

    dispose() {
        if (this._onEnd) {
            canvas_container.removeEventListener("transitionend", this._onEnd);
            this._onEnd = null;
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

class Cell {
    constructor(x, y, w, h, n, cTop, cBottom, nCol) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.n = n;
        this.cTop = cTop;
        this.cBottom = cBottom;
        this.nCol = nCol;

        this.dist_to_top = 1 - (this.y / height) ** 0.5;


        this.state = 0;
    }

    updateState(state) {
        this.state = state;
    }

    render() {
        fill(lerpColor(
            this.state == 0 ? this.cTop : this.cBottom,
            this.nCol,
            this.n * 0.25
        ));
        rect(this.x + this.w/2, this.y + this.h/2, this.w * 1.05, this.h * 1.05);
    }
}

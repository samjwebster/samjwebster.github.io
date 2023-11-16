let canvas;
let downscale = 10;
let g;
let origin;
let prevDims;
let eggshell;

let ss;

function setup() {
    let dims = getWindowDims();
    prevDims = dims;
    origin = [0,0]
    canvas = createCanvas(...dims);
    canvas.parent(canvas_container);
    canvas.id = "backdrop";

    eggshell = color("#f0ead6");
    background(eggshell);

    ss = new SandSim(...dims, 20);

    frameRate(60);

    let gridOnCheckbox = document.getElementById("gridOnCheckbox");
    gridOnCheckbox.addEventListener("change", function() {
        ss.toggleGrid();
    });
    let simOffOnCheckbox =document.getElementById("simOffOnCheckbox");
    simOffOnCheckbox.addEventListener("change", function() {
        toggleSim(simOffOnCheckbox.checked);
    });

    // noLoop();
}

let loading_timer = 10;
function draw() {
    if(loading_timer > 0) {
        loading_timer -= 1;
        return;
    }
    background(eggshell)
    ss.update();
}

let sim_status = true;
function toggleSim(status) {
    sim_status = status;
    if(status == true) {
        frameRate(60);
    } else {
        frameRate(0);
    }
}

function getWindowDims() {
    return [window.innerWidth, window.innerHeight];
}

function windowResized() {
    let newDims = getWindowDims();
    diffX = prevDims[0] - newDims[0];
    diffY = prevDims[1] - newDims[1];

    origin[0] -= diffX;
    origin[1] -= diffY;

    resizeCanvas(...newDims);

    prevDims = newDims;

}

function mouseMoved() {
    if(!sim_status) return;
    
    if(abs(mouseX - pmouseX) > 4 || abs(mouseY - pmouseY) > 4) {
        ss.spawnSand(mouseX, mouseY);
    }
    
}

class SandSim {
    constructor(width, height, dim) {
        this.width = width;
        this.height = height;
        this.dim = dim;
        this.gridOn = false;
        this.taken = {};

        this.alive = [];
        this.dead = [];

        this.floor_j = (height/this.dim);
    }

    update() {
        if (this.gridOn == true) this.drawGrid();

        this.dead.forEach(sand => {
            sand.render();
        });
        
        let dead_idx = [];
        for(let i = 0; i < this.alive.length; i++) {
            let sand = this.alive[i];
            sand.update();
            if(sand.isDead()) {
                dead_idx.push(i);
            }
        }

        dead_idx.reverse();
        dead_idx.forEach(i => {
            let sand = this.alive.splice(i, 1)[0];
            this.dead.push(sand);
        });

        
    }

    toggleGrid() {
        console.log('here')
        this.gridOn = !this.gridOn;
    }

    drawGrid() {
        noFill();
        stroke(color("#22092C"));
        
        let x = 0;
        while (x < width) {
            line(x, 0, x, height);
            x += this.dim;
        }

        let y = 0;
        while (y < height) {
            line(0, y, width, y);
            y += this.dim;
        }
    }

    spawnSand(x, y) {
        // convert x, y to i, j
        let i = floor(x/this.dim);
        let j = floor(y/this.dim);
        if(this.isFree(i, j)) {
            let col = color("#AA4A44")
            this.alive.push(new Sand(this, i, j, col, this.dim));
            this.markTaken(i, j);
        }
    }

    markTaken(i, j) {
        if(!this.taken[i]) {
            this.taken[i] = {};
        }
        this.taken[i][j] = true;
    }

    markFree(i, j) {
        if(!this.taken[i]) {
            this.taken[i] = {};
        }
        this.taken[i][j] = false;
    }

    isFree(i, j) {
        if(j >= this.floor_j) return false;

        if(!this.taken[i]) {
            this.taken[i] = {};
        }
        if(!this.taken[i][j]) {
            this.taken[i][j] = false;
        }
        return !this.taken[i][j];
    }
}

class Sand {
    constructor(parent, i, j, col, dim) {
        this.status = true;
        this.i = i;
        this.j = j;
        this.col = col;
        this.dim = dim;

        this.x = this.i*dim;
        this.y = this.j*dim;

        this.parent = parent;

        this.death_buffer = 5;
        this.death_buffer_reset = 5;
    }

    update() {
        this.render();
        let down = [this.i, this.j+1];
        if(this.parent.isFree(...down)) {
            this.moveTo(...down);
        } else {
            this.death_buffer -= 1;
            if (!this.death_buffer) {
                this.die();
            }
        }
    }

    die() {
        this.status = false;
    }
    isDead() {
        return !this.status;
    }

    moveTo(i, j) {
        this.parent.markFree(this.i, this.j);

        this.i = i;
        this.j = j;
        this.x = i*this.dim;
        this.y = j*this.dim;

        this.parent.markTaken(i, j);

        this.death_buffer = this.death_buffer_reset;
    }

    render() {
        fill(this.col);
        stroke(this.col);
        rect(this.x, this.y, this.dim, this.dim);
    }
}
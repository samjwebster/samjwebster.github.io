let canvas;
let downscale = 10;
let g;
let origin;
let prevDims;
let eggshell;

let ss;
let colors;

function setup() {
    let dims = getWindowDims();
    prevDims = dims;
    origin = [0,0]
    canvas = createCanvas(...dims);
    canvas.parent(canvas_container);
    canvas.id = "backdrop";

    eggshell = color("#f0ead6");
    background(eggshell);

    let sand_dim = 15;
    ss = new SandSim(...dims, sand_dim);

    frameRate(60);

    let gridOnCheckbox = document.getElementById("gridOnCheckbox");
    gridOnCheckbox.addEventListener("change", function() {
        ss.toggleGrid();
    });
    let rainCheckbox = document.getElementById("rainOnOff");
    rainCheckbox.addEventListener("change", function() {
        toggleRain();
    });
    let simOffOnCheckbox =document.getElementById("simOffOnCheckbox");
    simOffOnCheckbox.addEventListener("change", function() {
        toggleSim(simOffOnCheckbox.checked);
    });
    let clearSandButton = document.getElementById("clearSand");
    clearSandButton.addEventListener("click", function() {
        ss.clearSand();
    });
    let newColorsButton = document.getElementById("newColors");
    newColorsButton.addEventListener("click", function() {
        ss.newColors();
    })

    basic_colors = [];
    colors = [];
    let cc = 20;
    colorMode(HSB)
    for(let i = 0; i < cc; i++) {
        let t = i/(cc-1);
        h = t*360;
        basic_colors.push(color(h, 60, 67));
    }
    colorMode(RGB)
    colors = basic_colors

    noiseDetail(5, .7);
}

let loading_timer = 10;
let rainInterval = 10;
let rainTime = 0;
let rainOn = true;

function draw() {
    if(loading_timer > 0) {
        loading_timer -= 1;
        return;
    }
    background(eggshell)
    ss.update();

    if(rainOn) {
        rainTime += deltaTime/10;
        if(rainTime >= rainInterval) {
            ss.spawnSand(random()*width, -0.05*height);
            rainTime = 0;
        } 
    } 
}



function toggleRain() {
    rainOn = !rainOn;
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

    ss.resize();

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

        this.sand = [];

        this.noiseSeed = round(random(999999));

        this.floor_j = (height/this.dim);

        this.color_map = {};
    }

    newColors() {
        this.noiseSeed = round(random(999999));
        this.color_map = {};
        this.sand.forEach(s => s.updateColor());
    }

    update() {
        if (this.gridOn == true) this.drawGrid();
        this.sand.forEach(s => s.update());
    }

    toggleGrid() {
        this.gridOn = !this.gridOn;
    }

    drawGrid() {
        noFill();
        strokeWeight(1);
        let gridColOpaque = color("#22092C")
        let gridCol = colorTransparent(gridColOpaque, 0.5);
        stroke(gridCol);
        
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
            let col = this.getColor(i,j);
            this.sand.push(new Sand(this, i, j, col, this.dim));
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

    getColor(i, j) {
        if(!this.color_map[i]) {
            this.color_map[i] = {};
        }

        if(!this.color_map[i][j]) {
            let n = min(0.999, max(0, noise(i*0.01, j*0.01, this.noiseSeed)));
            this.color_map[i][j] = colors[floor(n*colors.length)];
        }

        return this.color_map[i][j]
    }

    resize() {
        this.floor_j = (height/this.dim);
        this.sand.forEach(s => s.revive());
    }

    clearSand() {
        this.sand.forEach(s => this.markFree(s.i, s.j));
        this.sand = [];
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

        this.death_buffer_reset = 10;
        this.death_buffer = this.death_buffer_reset;
        
    }

    update() {
        this.render();
        if(this.status == false) return;
        let down = [this.i, this.j+1];
        if(this.parent.isFree(...down)) {
            this.moveTo(...down);
            this.updateColor();
        } else {
            this.death_buffer -= 1;
            if (!this.death_buffer) {
                this.die();
            }
        }
    }

    updateColor() {
        this.col = this.parent.getColor(this.i, this.j);
    }

    die() {
        this.status = false;
    }
    isDead() {
        return !this.status;
    }
    revive() {
        this.status = true;
        this.death_buffer = this.death_buffer_reset;
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
        noStroke();
        rect(this.x, this.y, this.dim, this.dim);
    }
}

function colorTransparent(col, amount) {
    if(amount < 0) amount = 0;
    if(amount > 1) amount = 1;
    let l = col.levels;
    return color(l[0], l[1], l[2], amount*255);
}
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
            granulate(7);
        }
        noLoop();
        console.log("done!");
    }
}

class Composition {
    constructor() {
        this.time = random([0, 1]);

        this.col = lerpColor(color(0.5*255), p.r(), 0.15);
        if(this.time == 1) this.col = lerpColor(this.col, color(0), 0.20);

        this.shadow = lerpColor(this.col, color(0), 0.75);
        this.underside = lerpColor(this.col, color(0), 0.82);
        this.shadowTrans = colTrans(this.shadow, 0);

        this.windowLight = lerpColor(color("#CE8135"), p.r(), 0.15);

        this.generate();
    }

    generate() {
        let dens = 0.075 * min(width, height);
        let countX = ceil(width/dens);
        let countY = ceil(height/dens);
        // let w = width/countX;
        // let h = height/countY;

        let xRange = [0.1 * width, 0.9 * width];
        let yRange = [0.1 * height, 0.9 * height];
        let w = (xRange[1] - xRange[0])/countX;
        let h = (yRange[1] - yRange[0])/countY;

        let grassY = lerp(yRange[1], height, 0);
        this.grassY = grassY;

        this.maxShadowLength = h;

        this.nThreshold = 0.4;
        this.buildingWidth = h * 1.25;

        this.cells = [];
    
        let dim = min(width, height);

        let xDetail = 4;
        let yDetail = 4;
        let xOff = round(random()*99999999);
        let yOff = round(random()*99999999);

        let cellData = [];
        for(let i = 0; i < countX; i++) {
            let ti = i/countX;
            let x = lerp(...xRange, ti);
            cellData.push([]);
            for(let j = 0; j < countY; j++) {
                let tj = j/countY;
                let y = lerp(...yRange, tj);

                let n = map(
                    noise(xOff + (x/dim)*xDetail, yOff + (y/dim)*yDetail),
                    0.15, 0.85,
                    0, 1,
                    true
                );

                let depth = random();

                cellData[i].push([x, y, w, h, depth, n])
            }
        }

        for(let i = 0; i < countX; i++) {
            for(let j = 0; j < countY; j++) {
                if(cellData[i][j] == null) continue;

                let [x, y, w, h, depth, n] = cellData[i][j];

                let nextDepth = ((j < countY-1) && (cellData[i][j+1] != null)) ? cellData[i][j+1][4] : -1;
                let nextNoise = ((j < countY-1) && (cellData[i][j+1] != null)) ? cellData[i][j+1][5] : -1;

                let cell = new Cell(this, x, y, w, h, depth, n, [nextDepth, nextNoise]);
                this.cells.push(cell);
            }
        }
    }

    *render() {
        let skyLow, skyHigh;
        let tint = p.r();
        if(this.time == 0) {
            skyLow = lerpColor(color("#F8FCFF"), tint, 0.20);
            skyHigh = lerpColor(color("#F3F8FC"), tint, 0.20);
        } else {
            skyHigh = lerpColor(color("#4D7790"), tint, 0.20);
            skyLow = lerpColor(color("#0D3548"), tint, 0.20);
        }

        push();
        gradFill([0, 0], [0, height], skyHigh, skyLow);
        rect(-10, -10, width+20, height+20);
        pop();

        yield;

        let grass = lerpColor(color("#605D2B"), p.r(), 0.15);
        if(this.time == 1) grass = lerpColor(grass, color(0), 0.25);

        push();
        gradFill([0, this.grassY], [0, height], grass, this.shadow);
        noStroke();
        rect(0, this.grassY, width, height - this.grassY);
        pop();

        let skipper = 0;
        let interval = 10;

        // Sort by height
        this.cells.sort((a, b) => a.y - b.y);

        for(let cell of this.cells) {
            cell.renderUnderside();
            skipper += 1;
            if (skipper% interval == 0) yield;
        }
        yield;

        // Sort by depth
        this.cells.sort((a, b) => a.depth - b.depth);

        for(let cell of this.cells) {
            cell.render();
            skipper += 1;
            if (skipper% interval == 0) yield;
        }
        yield;

        for(let cell of this.cells) {
            cell.renderWindowsAndGlow();
            skipper += 1;
            if (skipper% interval == 0) yield;
        }
        yield;

    }
}

class Cell {
    constructor(parent, x, y, w, h, depth, n, nextData) {
        this.parent = parent;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.depth = depth;
        this.n = n;
        this.nextDepth = nextData[0];
        this.nextN = nextData[1];

        this.glowing = [];
    }

    renderUnderside() {
        // Draw underside of the cell
        if(this.n < this.parent.nThreshold) return;
        if(this.nextN > this.parent.nThreshold) return;
        if(this.y + this.h >= this.parent.grassY) return;

        let currH = lerp(this.parent.buildingWidth/8, this.parent.buildingWidth, 1-(this.y/height));

        fill(this.parent.underside);
        stroke(this.parent.underside);
        rect(this.x, this.y + this.h, this.w, currH);

        if(random() > 0.66) return;

        let supportWidth = this.w/4;

        let supportT = random();
        let supportStart = [
            this.x + this.w/2 - supportWidth/2,
            lerp(this.y + this.h, this.y + this.h + currH, supportT),
        ];

        let supportEndY = this.parent.grassY
        let supportHeight = supportEndY - supportStart[1];

        push();
        gradFill(supportStart, [supportStart[0], supportEndY], this.parent.underside, this.parent.shadow);
        noStroke();
        rect(supportStart[0], supportStart[1], supportWidth, supportHeight);
        pop();

    }

    renderShadow() {
        // Underside
        let currH = lerp(this.parent.buildingWidth/16, this.parent.buildingWidth/4, 1-(this.y/height)) * (this.depth - this.nextDepth);

        strokeWeight(0.5);
        fill(this.parent.underside);
        stroke(this.parent.underside);
        rect(this.x, this.y + this.h, this.w, currH);

        // Shadow
        fill(this.parent.shadow);
        noStroke();

        let shadowLength = this.parent.maxShadowLength * (this.depth - this.nextDepth);

        push();
        gradFill([this.x, this.y + this.h + currH], [this.x, this.y + this.h + currH + shadowLength], this.parent.shadow, this.parent.shadowTrans);

        rect(this.x, this.y + this.h + currH, this.w, shadowLength);

        pop();
    }

    renderFace() {
        // Building
        let c = lerpColor(this.parent.col, this.parent.shadow, 1-this.depth);
        fill(c);
        stroke(c);
        rect(this.x, this.y, this.w, this.h);
    }

    renderWindows() {
        // Windows
        if(random() > 0.50) return;

        let pad = this.w/8;
        let padW = this.w - 2*pad;
        let padH = this.h - 2*pad;
        let xRange = [this.x + pad, this.x + this.w - pad];
        let yRange = [this.y + pad, this.y + this.h - pad];

        let windowCountX = random([1, 2]);
        let windowCountY = random([1, 2]);
        let windowWidth = padW/windowCountX * 0.50;
        let windowHeight = padH/windowCountY * 0.50;

        push();
        noStroke();
        rectMode(CENTER);
        for(let i = 0.5; i < windowCountX; i++) {
            let ti = i/windowCountX;
            let x = lerp(...xRange, ti);
            for(let j = 0.5; j < windowCountY; j++) {
                let tj = j/windowCountY;
                let y = lerp(...yRange, tj);

                if(this.parent.time == 0) {
                    if(random() > 0.25) fill(this.parent.shadow);
                    else {
                        this.glowing.push([x, y, windowWidth, windowHeight]);
                        fill(this.parent.windowLight);
                    }
                } else if (this.parent.time == 1) {
                    if(random() > 0.25) {
                        fill(this.parent.windowLight);
                        this.glowing.push([x, y, windowWidth, windowHeight]);
                    } else {
                        fill(this.parent.shadow);
                    }
                }

                rect(x, y, windowWidth, windowHeight);
            }
        }
        pop();
    }

    renderWindowGlow() {
        if(this.glowing.length <= 0) return;
        push();

        drawingContext.filter = `blur(${this.parent.buildingWidth/(this.parent.time == 0 ? 8 : 4)}px)`;
        fill(this.parent.windowLight);
        noStroke();
        rectMode(CENTER);
        for(let [x, y, w, h] of this.glowing) {
            rect(x, y, w*1.1, h*1.1);
        }
        pop();
    }

    render() {
        if(this.n < this.parent.nThreshold) return;

        // Shadow and small underside
        if(this.nextN > this.parent.nThreshold && this.depth > this.nextDepth) this.renderShadow();

        // Building face
        this.renderFace();
    }

    renderWindowsAndGlow() {
        if(this.n < this.parent.nThreshold) return;
        
        // Windows
        this.renderWindows();

        // Window glow
        this.renderWindowGlow();
    }
}

function rPosOutside() {
    let r = random();
    if(r < 0.25) {
        return [random(-width, -width/2), random(height)];
    } else if(r < 0.5) {
        return [random(3*width/2, 2*width), random(height)];
    } else if(r < 0.75) {
        return [random(width), random(-height, -height/2)];
    } else {
        return [random(width), random(3*height/2, 2*height)];
    }
}
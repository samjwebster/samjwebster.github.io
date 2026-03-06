let nScale = 0.01;
let palettes;
let p;
let renderGen, granulated=false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    noiseDetail(5, 0.6);

    regenerate();

}

function regenerate() {
    p = getPalette();
    p.shuffle();

    let m = new Manager();
    renderGen = m.generate();
    granulated = false;

    loop();
}

function draw() {
    let val = renderGen.next();
    if(val.done) {
        if(!granulated) granulate(4);
        noLoop();
    }
}

class Manager {
    constructor() {

    }

    shadowLerp(depth) {
        let modRange = [1.25, 5.00];
        return lerp(...modRange, depth);
    }

    *generate() {
        background(p.r());
        yield;


        let count = floor(random(3, 8));
        let sheets = [];

        for(let i = 0; i < count; i++) {
            this.temp = {
                depth: i/(count-1),
                shadowmod: this.shadowLerp(i/(count-1)),
                col: p.r(),
            }

            this.depth = i/(count-1);
            this.shadowmod = this.shadowLerp(this.depth);
            
            let type;
            let t = random();

            if(i == count-1) {
                type = random(["border", "grid", "normal", "zebra", "ladder"]);
            } else {
                type = random(["normal", "grid", "zebra", "ladder"]);
            }

            // type = "concentric";

            let sheet = this.caller(type);

            sheets.push(sheet);
        }

        for(let i = 0; i < sheets.length; i++) {
            sheets[i].render();
            yield;
        }
    }

    caller(type) {
        let sheet;
        if(type == "border") {
            sheet = this.border();
        } else if(type == "grid") { 
            sheet = this.grid();
        } else if(type == "normal") {
            sheet = this.normal();
        } else if(type == "zebra") {
            sheet = this.zebra();
        } else if(type == "ladder") {
            sheet = this.ladder();
        } else if(type == "concentric") {
            sheet = this.concentric();
        }
        return sheet;
    }

    // 1 is top depth;
    // 0 is bottom;
    // So, for things like radii and count, should be larger.
    // Greater depth value should translate to higher visibility;

    border() {
        let dist = min(width, height)*random(0.02, 0.06);
        let sheet = new Border(this.temp.col, this.temp.shadowmod, dist);
        return sheet;
    }

    grid() {
        let shapeType = random(["circle"]);
        let gridCount = round(random(1, 5));

        let gridStep = min(width, height)/gridCount;
        let data = {};
        if(shapeType == "circle") {
            data.r = random(gridStep*0.5, gridStep*1.0);
        } else if (shapeType == "rect") {
            data.width = random(gridStep*0.25, gridStep*0.75);
            data.height = random(gridStep*0.25, gridStep*0.75);
        }
        let sheet = new GridSheet(this.temp.col, this.temp.shadowmod, shapeType, gridCount, data);
        return sheet;
    }

    normal() {
        //let shadowmod = this.shadowLerp(this.depth);
        let maskCount = round(random(6));
        let masks = [];
        for(let mi = 0; mi < maskCount; mi++) {
            let pos = [round(random(width/4, 3*width/4)), round(random(height/4, 3*height/4))];
            let type = random(["circle"]); // only circle for now
            let data = {};
            if(type == "circle") {
                data.r = min(width, height) * random(lerp(0.2, 0.4, this.temp.depth), lerp(0.8, 1, this.temp.depth)) + (this.depth/100);
            } else if (type == "rect") {
                data.width = random(width*0.1, width*0.75);
                data.height = random(height*0.1, height*0.75);
            }
            let m = new Mask(pos, type, data);
            masks.push(m);
        }
        let sheet = new Sheet(this.temp.col, masks, this.temp.shadowmod);
        return sheet;
    }

    zebra() {
        let count = round(random(1, 6));
        let variance = random([0, random()]);
        let sheet = new Zebra(this.temp.col, this.temp.shadowmod, count, variance)
        return sheet;
    }

    ladder() {
        let count = round(random(1, 5));
        let variance = random([0, random()]);
        let sheet = new Ladder(this.temp.col, this.temp.shadowmod, count, variance)
        return sheet;
    }
    
    concentric() {
        let r = random(width/8, width/2);
        let count = round(random(1, 5));
        let stroke = (r/count) * random(0.5, 0.9);
        let eye = [(width/8) + (random()*width/4), (height/8) + (random()*height/4)];
        let sheet = new Concentric(this.temp.col, this.temp.shadowmod, r, eye, count, stroke);
        return sheet;
    }
}

class Mask {
    constructor(pos, type, data) {
        this.pos = pos;
        this.type = type;
        this.data = data;
    }

    apply(graphic) {
        //graphic.fill(255);
        //graphic.noStroke();
        graphic.erase();
        if(this.type == "circle") {
            graphic.circle(...this.pos, this.data.r)
        } else if (this.type == "rect") {
            graphic.rect(...this.pos, this.data.w, this.data.h);
        } else if (this.type == "polygon") {
            graphic.beginShape();
            this.data.pts.forEach(p => {
                graphic.vertex(...p);
            });
            graphic.endShape(CLOSE);
        } else if (this.type == "circle_outline") {
            graphic.push();
            graphic.noFill();
            graphic.stroke(255);
            graphic.strokeWeight(this.data.stroke);
            graphic.circle(...this.data.eye, this.data.r);
            graphic.pop();

        }
        return graphic;
    }

    applyShadow(graphic, offX, offY) {
        let offPos = [this.pos[0] + offX, this.pos[1] + offY];
        graphic.erase();
        if(this.type == "circle") {
            graphic.circle(...offPos, this.data.r)
        } else if (this.type == "rect") {
            graphic.rect(...offPos, this.data.w, this.data.h);
        } else if (this.type == "polygon") {
            graphic.beginShape();
            this.data.pts.forEach(p => {
                let offP = [p[0] + offX, p[1] + offY];
                graphic.vertex(...offP);
            });
            graphic.endShape(CLOSE);
        }
        return graphic;
    }
}

class Sheet {
    constructor(col = color(20), masks = [], shadowmod = 1.01) {
        this.col = col;
        this.shadowcol = lerpColor(col, color(0, 0.1*255), 0.6);
        this.masks = masks;
        this.shadowmod = shadowmod;
    }

    render() {
        let body = createGraphics(width, height);
        body.background(this.col);
        // body.fill(255);
        // body.noStroke();
        // body.rect(0, 0, w, w);

        let mask = createGraphics(width, height);
        mask.background(255);
        
        this.masks.forEach(m => {
            mask = m.apply(mask);
        });

        let offX = (width/100)*this.shadowmod;
        let offY = (height/100)*this.shadowmod;

        blendMode(MULTIPLY);
        let shadowmask = createGraphics(width, height);
        shadowmask.background(255);
        this.masks.forEach(m => {
            shadowmask = m.applyShadow(shadowmask, offX, offY);
        });

        blendMode(BLEND);
        let bodyimg = createImage(body.width, body.height);
        bodyimg.copy(body, 0, 0, body.width, body.height, 0, 0, body.width, body.height);
        bodyimg.mask(mask);

        // let shadow = createGraphics(w*this.shadowmod, w*this.shadowmod);
        // //shadow.background(this.shadowcol);
        // shadow.fill(this.shadowcol);
        // shadow.noStroke;
        // shadow.rect(-q, -q, w+h, w+h);

        // let shadowimg = createImage(shadow.width, shadow.height);
        // shadowimg.copy(shadow, 0, 0, shadow.width, shadow.height, 0, 0, shadow.width, shadow.height);
        // shadowimg.mask(mask);
        // shadowimg.filter(BLUR, 2);

        // image(shadowimg, 0, 0, shadowimg.width, shadowimg.height);

        let shadow = createGraphics(width, height);
        //shadow.background(this.shadowcol);
        shadow.fill(this.shadowcol);
        shadow.noStroke;
        shadow.rect(-width/4, -height/4, width+(width/2), height+(height/2));

        let shadowimg = createImage(shadow.width, shadow.height);
        shadowimg.copy(shadow, 0, 0, shadow.width, shadow.height, 0, 0, shadow.width, shadow.height);
        shadowimg.mask(shadowmask);
        shadowimg.filter(BLUR, round((max(width, height)/1000)*2));

        image(shadowimg, 0, 0, shadowimg.width, shadowimg.height);
        
        image(bodyimg, 0, 0, width, height);
    }
}

class GridSheet {
    constructor(col, shadowmod, type = 'circle', count = '5', data = {}) {
        this.col = col;
        this.shadowmod = shadowmod;
        this.type = type;
        this.count = count;
        this.data = data;

        this.generate();
    }

    generate() {
        let masks = [];
        for(let i = 0; i < this.count; i++) {
            for(let j = 0; j < this.count; j++) {
                let tx = (i+1)*(1/(this.count+1));
                let ty = (j+1)*(1/(this.count+1));

                let pos = [width*tx, height*ty];
                let m;
                if(this.type == 'circle') {
                    m = new Mask(pos, 'circle', {r: this.data.r});
                } else if (this.type == "rect") {
                    m = new Mask(pos, 'rect', this.data);
                }
                masks.push(m);
            }
        }
        this.masks = masks;


        this.sheet = new Sheet(this.col, this.masks, this.shadowmod)
    }

    render() {
        this.sheet.render();
    }
}

class Border {
    constructor(col, shadowmod, dist) {
        this.col = col;
        this.shadowmod = shadowmod;
        this.dist = dist;

        this.generate();
    }

    generate() {
        let masks = [];

        masks.push(new Mask([this.dist, this.dist], 'rect', {w: width-(2*this.dist), h: height-(2*this.dist)}));

        this.masks = masks;
        
        this.sheet = new Sheet(this.col, this.masks, 1.40);

    }

    render() {
        this.sheet.render();
    }
}

class Zebra {
    constructor(col, shadowmod, count, variance = 0.5, offset = 0) {
        this.col = col;
        this.shadowmod = shadowmod;
        this.count = count;
        this.variance = variance;
        // this.offset = offset;

        this.generate();
    }

    generate() {
        let masks = [];

        // let center = (width/2);
        // let minstretch = min(dist(center, 0, 0, 0), dist(center, 0, width, 0));
        let stripeStep = (width/this.count);
        let stripeSize = random(0.5, 0.8)*stripeStep;

        for(let i = 0; i < this.count; i++) {
            let x = i*stripeStep + stripeStep/2;
            
            let ys = [0, height];

            let xLeft = x-(stripeSize/2);
            let xRight = x+(stripeSize/2);

            let topLeft = [xLeft, ys[0]];
            let topRight = [xRight, ys[0]];
            let botLeft = [xLeft, ys[1]];
            let botRight = [xRight, ys[1]];

            topLeft[0] += this.variance * (random([-1, 1]) * noise(topLeft[0] * nScale, topLeft[1] * nScale) * stripeSize/4);
            topRight[0] += this.variance * (random([-1, 1]) * noise(topRight[0] * nScale, topRight[1] * nScale) * stripeSize/4);
            botLeft[0] += this.variance * (random([-1, 1]) * noise(botLeft[0] * nScale, botLeft[1] * nScale) * stripeSize/4);
            botRight[0] += this.variance * (random([-1, 1]) * noise(botRight[0] * nScale, botRight[1] * nScale) * stripeSize/4);

            let m = new Mask([0, 0], "polygon", {pts: [topLeft, topRight, botRight, botLeft]});
            masks.push(m);
        }

        this.sheet = new Sheet(this.col, masks, this.shadowmod);
    }

    render() {
        this.sheet.render();
    }
    
}

class Ladder {
    constructor(col, shadowmod, count, variance = 0.5, offset = 0) {
        this.col = col;
        this.shadowmod = shadowmod;
        this.count = count;
        this.variance = variance;
        // this.offset = offset;

        this.generate();
    }

    generate() {
        let masks = [];

        // let center = (width/2);
        // let minstretch = min(dist(center, 0, 0, 0), dist(center, 0, width, 0));
        let stripeStep = (height/this.count);
        let stripeSize = random(0.5, 0.8)*stripeStep;

        for(let i = 0; i < this.count; i++) {
            // get the pts for the polygon mask
            let y = i*stripeStep + stripeStep/2;
            
            let xs = [0, width];

            let yTop = y-(stripeSize/2);
            let yBot = y+(stripeSize/2);

            let topLeft = [xs[0], yTop];
            let topRight = [xs[1], yTop];
            let botLeft = [xs[0], yBot];
            let botRight = [xs[1], yBot];

            topLeft[1] += this.variance * (random([-1, 1]) * noise(topLeft[0] * nScale, topLeft[1] * nScale) * stripeSize/4);
            topRight[1] += this.variance * (random([-1, 1]) * noise(topRight[0] * nScale, topRight[1] * nScale) * stripeSize/4);
            botLeft[1] += this.variance * (random([-1, 1]) * noise(botLeft[0] * nScale, botLeft[1] * nScale) * stripeSize/4);
            botRight[1] += this.variance * (random([-1, 1]) * noise(botRight[0] * nScale, botRight[1] * nScale) * stripeSize/4);


            // create the polygon mask
            let m = new Mask([0, 0], "polygon", {pts: [topLeft, topRight, botRight, botLeft]});
            masks.push(m);

        }

        this.sheet = new Sheet(this.col, masks, this.shadowmod);
    }

    render() {
        this.sheet.render();
    }
    
}

class Concentric {
    constructor(col, shadowmod, r, eye, count, stroke) {
        this.col = col;
        this.shadowmod = shadowmod;
        this.r = r;
        this.eye = eye;
        this.count = count;
        this.stroke = stroke;
        

        this.generate();
    }

    generate() {
        let masks = [];

        let rStep = this.r/this.count;
        // let band = rStep * random(0.5, 0.9);

        for(let i = 0; i < this.count; i++) {
            let r = i*rStep;
            let m = new Mask([0,0], "circle_outline", {stroke: this.stroke, r: r, eye: this.eye});
            masks.push(m);
        }

        this.masks = masks;
        
        this.sheet = new Sheet(this.col, this.masks, this.shadowmod);

    }

    render() {
        this.sheet.render();
    }
}

function granulate(amount, blur=0) {
    loadPixels();
    const d = pixelDensity();
    const pixelsCount = 4 * (width * d) * (height * d);
    for (let i = 0; i < pixelsCount; i += 4) {
        const grainAmount = random(-amount, amount);
        pixels[i] = pixels[i] + grainAmount;     // R
        pixels[i+1] = pixels[i+1] + grainAmount; // G
        pixels[i+2] = pixels[i+2] + grainAmount; // B
        pixels[i+3] = pixels[i+3] + grainAmount; // A
    }
    updatePixels();
    if(blur) filter(BLUR, blur);
}
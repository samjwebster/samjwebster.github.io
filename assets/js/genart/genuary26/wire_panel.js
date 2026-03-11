let c, renderGen, p;
let granulated = false;
let max_frames = 1;

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
    max_frames = 1000;

    p = getPalette();
    p.shuffle();

    c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if(val.done) {
        if(!granulated) {
            granulate(3);
            granulated = true;
        }
        noLoop();
    }
}

class Composition {
    constructor() {
        this.padding = random(0.02, 0.075) * min(width, height);
        this.cells = [];

        let ct = round(random(12, 25));
        let w = width - 2 * this.padding;
        let cell_w = w / ct;
        let h = height - 2 * this.padding;
        let cell_h = h / ct;

        let nd = 0.002;

        for(let i = 0; i < ct; i++) {
            let ti = i/ct;
            let x = this.padding + ti * w;
            for(let j = 0; j < ct; j++) {
                let tj = j/ct;
                let y = this.padding + tj * h;
                let n = noise(x * nd, y * nd);
                n = map(n, 0.1, 0.9, 0, 1, true);
                let id = this.cells.length;

                this.cells.push(new Cell(x, y, cell_w, cell_h, n, id));
            }
        }

        noiseSeed(round(random()*99999));

        for(let cell of this.cells) {
            let n2 = noise(cell.x * nd * 2, cell.y * nd * 2);
            n2 = map(n2, 0.1, 0.9, 0, 1, true);
            cell.n2 = n2;
        }

        noiseSeed(round(random()*99999));

        let weighted_cell_ids = [];

        for(let cell of this.cells) {
            if(cell.rope_ct <= 0) continue;
            let weight = floor(map(cell.n, 0, 1, 1, 100));
            for(let i = 0; i < weight; i++) {
                weighted_cell_ids.push(cell.id);
            }
        }

        for(let cell of this.cells) {
            let rope_ct = cell.rope_ct;
            let chosen_ids = [];

            let attempts = 20;
            while(chosen_ids.length < rope_ct && attempts > 0 && weighted_cell_ids.length > 0) {
                let ri = floor(random(0, weighted_cell_ids.length));
                let cid = weighted_cell_ids[ri];
                let cell_to = this.cells[cid];
                let d_to = dist(
                    cell.x + cell.w/2, cell.y + cell.h/2,
                    cell_to.x + cell_to.w/2, cell_to.y + cell_to.h/2
                );

                if(!chosen_ids.includes(cid) && cid != cell.id && d_to < min(width, height) / 3 && cell_to.rope_ct > 0) {
                    chosen_ids.push(cid);
                }
                attempts--;
            }
            
            for(let cid of chosen_ids) {
                cell.ropeTo(this.cells[cid]);
            }

            // Filter out cells that have no rope capacity left
            weighted_cell_ids = weighted_cell_ids.filter(id => {
                return this.cells[id].rope_ct > 0;
            });
        }

        // Prepare ropes for animation
        for(let cell of this.cells) {
            cell.updateRopes();
        }
    }

    // *render() {
    //     background(220);
    //     for(let cell of this.cells) {
    //         cell.renderCell();
    //     }
    //     yield;
    //     for(let cell of this.cells) {
    //         cell.renderRopes();
    //     }
    //     yield;
    // }

    *render() {
        background(lerpColor(color(200), p.r(), random(0, 0.20)));

        let ctr = 0;
        let skipper = 20;

        // drawingContext.filter = 'blur(2px)';
        // for(let cell of this.cells) {
        //     cell.renderCellShadow();
        //     if (ctr++ % skipper == 0) yield;
        // }

        drawingContext.shadowOffsetY = 0.0025 * min(width, height);
        drawingContext.shadowBlur = 0.0025 * min(width, height);
        drawingContext.shadowColor = color(20, 20, 20, 50);

        drawingContext.filter = 'none';
        for(let cell of this.cells) {
            cell.renderCell();
            if (ctr++ % skipper == 0) yield;
        }

        // drawingContext.filter = 'blur(2px)';
        // for(let cell of this.cells) {
        //     cell.renderRopesShadows();
        //     if (ctr++ % skipper == 0) yield;
        // }
        
        drawingContext.filter = 'none';
        for(let cell of this.cells) {
            cell.renderRopes();
            if (ctr++ % skipper == 0) yield;
        }
    }

    // update() {
    //     for(let cell of this.cells) {
    //         cell.updateRopes();
    //     }
    // }
}

class Cell {
    constructor(x, y, w, h, n, id) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.n = n;
        this.id = id;

        this.type = random(['circle', 'square', 'triangle']);

        this.ropes = [];
        this.rope_ct = floor(random(0, 4));
    }

    ropeTo(other) {
        this.rope_ct -= 1;
        other.rope_ct -= 1;

        let pos_a = [this.x + this.w/2, this.y + this.h/2];
        let pos_b = [other.x + other.w/2, other.y + other.h/2];

        let weight1 = lerpPos(pos_a, pos_b, random(0.1, 0.4));
        let weight2 = lerpPos(pos_a, pos_b, random(0.6, 0.9));

        let d = dist(...pos_a, ...pos_b);

        weight1[1] += random(0.1, 0.4) * d;
        weight2[1] += random(0.1, 0.4) * d;

        let max_offset = d * 0.005;
        let detail = 0.015;
        let offset_angle = random()*TAU;

        this.ropes.push({to: other.id, a: pos_a, b: pos_b, w1: weight1, w2: weight2, cw1: weight1, cw2: weight2, offset: max_offset, detail: detail, angle: offset_angle} );
    }

    updateRopes() {
        for(let rope of this.ropes) {
            let x_bounds = [min(rope.a[0], rope.b[0]), max(rope.a[0], rope.b[0])];
            let n_w1 = noise(rope.w1[0] * rope.detail, rope.w1[1] * rope.detail, frameCount * 0.05);
            let a_w1 = rope.angle + n_w1 * TAU;
            rope.cw1[0] = rope.w1[0] + cos(a_w1) * rope.offset;
            rope.cw1[0] = constrain(rope.cw1[0], ...x_bounds);
            // rope.cw1[1] = rope.w1[1] + sin(a_w1) * rope.offset;
            let n_w2 = noise(rope.w2[0] * rope.detail, rope.w2[1] * rope.detail, frameCount * 0.05);
            let a_w2 = rope.angle + n_w2 * TAU;
            rope.cw2[0] = rope.w2[0] + cos(a_w2) * rope.offset;
            rope.cw2[0] = constrain(rope.cw2[0], ...x_bounds);
            // rope.cw2[1] = rope.w2[1] + sin(a_w2) * rope.offset;
        }
    }

    renderCell() {
        fill(p.getFloat(this.n));
        noStroke();

        let ctr = [this.x + this.w/2, this.y + this.h/2];
        let sz = min(this.w, this.h) * (0.25 + this.n/1.5);

        if(this.type == 'square') {
            rectMode(CENTER);
            rect(...ctr, sz, sz);
        } else if(this.type == 'triangle') {
            let distToCenter = sz / sqrt(3);
            let angles = [-PI/2, PI/6, 5*PI/6];
            beginShape();
            for(let angle of angles) {
                let x = ctr[0] + cos(angle) * distToCenter;
                let y = ctr[1] + sin(angle) * distToCenter;
                vertex(x, y);
            }
            endShape(CLOSE);
        } else if(this.type == 'circle') {
            circle(...ctr, sz);
        }
    }

    renderRopes() {
        noFill();
        stroke(p.getFloat(this.n2));
        strokeWeight(2);

        for(let rope of this.ropes) { 
            beginShape();
            vertex(...rope.a);
            bezierVertex(...rope.cw1, ...rope.cw2, ...rope.b);
            endShape();
        }
    }
}


function generateLinePts(a, b, density, nDetail, nOffset) {
    let pts = [];
    let line_length = dist(...a, ...b);
    let ct_pts = floor(line_length / density);
    for(let i = 0; i < ct_pts; i++) {
        let t = i / (ct_pts - 1);
        let p = lerpPos(a, b, t);

        let n = noise(p[0] * nDetail, p[1] * nDetail);
        n = map(n, 0.2, 0.8, 0, 1);
        let angle = n * TAU;
        p[0] += cos(angle) * nOffset;
        p[1] += sin(angle) * nOffset;

        pts.push(p);
    }
    return pts;
}

function generateBezPts(a, b, c, d, density, nDetail, nOffset) {
    let pts = [];
    let line_length = dist(...a, ...b) + dist(...b, ...c) + dist(...c, ...d);

    let ct_pts = floor(line_length / density);
    for(let i = 0; i < ct_pts; i++) {
        let t = i / (ct_pts - 1);
        let p = lerpBez(a, b, c, d, t);

        let n = noise(p[0] * nDetail, p[1] * nDetail);
        n = map(n, 0.2, 0.8, 0, 1);
        let angle = n * TAU;
        p[0] += cos(angle) * nOffset;
        p[1] += sin(angle) * nOffset;

        pts.push(p);
    }
    return pts;
}

function sketchyLine(a, b, col, t) {
    let dim = min(width, height);
    let density = 0.0004 * dim;
    let nDetail = 0.015 + lerp(0, 0.005, t);
    let nOffset = (0.003 - lerp(0, 0.001, t)) * dim;

    let pts = generateLinePts(a, b, density, nDetail, nOffset);
    let colOptions = [];
    for(let i = 0; i < 5; i++) {
        colOptions.push(colTrans(col, 255*lerp(0.4, 0.9, i/5)));
    }   

    let rRange = [0.002*dim, 0.004*dim];

    noStroke();

    for(let i = 0; i < pts.length - 1; i++) {
        let r = random()*random(...rRange);
        fill(random(colOptions));
        circle(...pts[i], r);

        if(random() > 0.97) {
            // paint splatter
            pts[i][0] += random([-1, 1]) * random(0.005, 0.015) * dim;
            pts[i][1] += random([-1, 1]) * random(0.005, 0.015) * dim;
            let r = random(...rRange) * 0.5;
            circle(...pts[i], r);
        }
    }
}
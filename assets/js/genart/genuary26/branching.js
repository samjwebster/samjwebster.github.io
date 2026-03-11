let c;
let p;
let ctr = 0;
let renderGen, granulated = false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {
    ctr = 0;
    granulated = false;

    p = getPalette();
    p.shuffle();

    clear();
    c = new Composition();
    // while(!c.isDone()) {
    //     c.update(100);
    // }
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
        this.padding = random(0.0125, 0.065) * min(width, height);

        this.lines = [];
        this.waitingLines = [];
        let boundary = new Rectangle(0, 0, width, height);
        let capacity = 4;
        this.qt = new QuadTree(boundary, capacity);

        for(let i = 0; i < 3; i++) {
            let x = random(this.padding, width - this.padding);
            let y = random(this.padding, height - this.padding);
            let aOff = random()*TAU;
            let ns = floor(random()*9999999);
            let nd = 0.002;
            let step = 0.005 * min(width, height);
            this.lines.push(new Line(this, x, y, aOff, ns, nd, step));
            this.lines.push(new Line(this, x, y, aOff + PI, ns, nd, step));
        }

        this.maxDepth = 0;

        // let l = new Line(this, 
        //     width/2, height/2, 0, // x, y, a 
        //     floor(random()*9999999), 0.005, 0.0025 * min(width, height) // ns, nd, step
        // );
        // this.lines.push(l);
    }

    update(steps) {
        for(let s = 0; s < steps; s++) {
            for(let l of this.lines) {
                if(l.alive) {
                    l.update();
                }
            }
            this.lines = this.lines.filter(l => l.alive);

            for(let i = this.waitingLines.length - 1; i >= 0; i--) {
                let wl = this.waitingLines[i];
                wl.timeout -= 1;
                if(wl.timeout <= 0) {
                    this.lines.push(wl.line);
                    this.waitingLines.splice(i, 1);
                }
            }

            if(this.lines.length == 0) break; 
        }
    }

    oob(x, y) {
        return (x < this.padding || x > width - this.padding ||
                y < this.padding || y > height - this.padding);
    }

    isDone() {
        return this.lines.length == 0;
    }

    addLineOnTimeout(line, timeout) {
        this.waitingLines.push({line: line, timeout: timeout});
        if(line.depth > this.maxDepth) {
            this.maxDepth = line.depth;
        }
    }

    renderProgress() {
        noFill();
        stroke(0);

        let renderQt = (qt) => {
            for(let p of qt.points) {
                let seg = p.userData;
                if(dist(...seg[0], ...seg[1]) > 0.01 * min(width, height)) continue;
                line(seg[0][0], seg[0][1], seg[1][0], seg[1][1]);
            }
            if(qt.divided) {
                renderQt(qt.northeast);
                renderQt(qt.northwest);
                renderQt(qt.southeast);
                renderQt(qt.southwest);
            }
        }
        renderQt(this.qt);
    }

    *render() {

        // Add the updating and progress rendering here for visual interest
        push();
        while(!this.isDone()) {
            this.update(5);
            this.renderProgress();
            yield;
        }
        pop();

        renderBackground();
        yield;

        noiseSeed(floor(random()*9999999));

        let qts = [this.qt];
        let skipper = 50;
        let skipCtr = 0;
        while(qts.length > 0) {
            let qt = qts.pop();
            for(let pt of qt.points) {
                let data = pt.userData;
                if(dist(...data[0], ...data[1]) > 0.01 * min(width, height)) continue;
                let depthT = data[3]/this.maxDepth;
                let col = p.getFloat(depthT);
                sketchyLine(data[0], data[1], col, depthT);
                skipCtr += 1;
                if(skipCtr % skipper == 0) {
                    yield;
                }
            }
            if(qt.divided) {
                qts.push(qt.northeast);
                qts.push(qt.northwest);
                qts.push(qt.southeast);
                qts.push(qt.southwest);
            }
        }
    }





}

class Line {
    constructor(c, x, y, aOff, ns, nd, step) {
        this.c = c;
        this.id = ctr++;
        this.x = x; // true position
        this.y = y;
        this.rx = x; // render position
        this.ry = y;
        this.aOff = aOff;
        this.ns = ns;
        this.nd = nd;
        this.step = step;

        this.parentId = null;
        this.justBorn = 5;
        this.depth = 0;

        this.alive = true;
    }

    update() {
        noiseSeed(this.ns);
        let n = noise(this.x * this.nd, this.y * this.nd, this.id/100);
        let na = map(n, 0.1, 0.9, 0, TAU) + this.aOff;
        let dx = cos(na) * this.step;
        let dy = sin(na) * this.step;

        let start = [this.rx, this.ry];

        this.x += dx;
        this.y += dy;

        let mp = [this.rx + dx/2, this.ry + dy/2];
        let np = [this.rx + dx, this.ry + dy];

        // Do we go over the edge? Loop around if so

        if(c.oob(...np)) {
            if(np[0] < c.padding) {
                mp[0] = width - c.padding;
                np[0] = width - c.padding;
            } else if(np[0] > width - c.padding) {
                mp[0] = c.padding;
                np[0] = c.padding;
            }
            if(np[1] < c.padding) {
                mp[1] = height - c.padding;
                np[1] = height - c.padding;
            } else if(np[1] > height - c.padding) {
                mp[1] = c.padding;
                np[1] = c.padding;
            }
        }

        this.rx = np[0];
        this.ry = np[1];

        // Do we collide with an existing segment?
        let range = new Rectangle(mp[0], mp[1], this.step, this.step);
        let points = c.qt.query(range);
        for(let p of points) {
            let seg = p.userData;
            if(seg[2] == this.id) continue;
            if(seg[2] == this.parentId && this.justBorn > 0) {
                continue;
            };

            // let mid = [(seg[0][0] + seg[1][0])/2, (seg[0][1] + seg[1][1])/2];
            // this.alive = false;
            // this.rx = mid[0];
            // this.ry = mid[1];
            // break;

            let intsct = intersect(...start, ...np, ...seg[0], ...seg[1]);
            if(intsct) {
                this.alive = false;
                this.rx = intsct[0];
                this.ry = intsct[1];
            }
        }
        this.justBorn -= 1;
        

        this.c.qt.insert(new Point(...mp, [start, [this.rx, this.ry], this.id, this.depth]));

        if(!this.alive) return;
        if(this.depth > 4) return;
        if(random() < 0.80) return;

        // Add a new line 
        let aOff = this.aOff + random([-1, 1]) * random(PI/16, PI/8);
        let newLine = new Line(this.c, this.x, this.y, aOff, this.ns, this.nd, this.step);
        newLine.rx = this.rx;;
        newLine.ry = this.ry;
        newLine.parentId = this.id;
        newLine.depth = this.depth + 1;
        this.c.addLineOnTimeout(newLine, 10);
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

function renderBackground() {
    clear();
    push();
    noStroke();
    p.shuffle();

    let colA = p.get(0);
    let colB = p.get(1);
    // gradFill([0, 0], [width, height], colA, colB);

    let gradEdges = shuffleArray([0, 1, 2, 3]);

    let gradPoints = [];
    for(let i = 0; i < 4; i++) {
        let currEdge = gradEdges[i];
        if(currEdge == 0) {
            gradPoints.push([width*random(), 0]);
        } else if (currEdge == 1) {
            gradPoints.push([width*random(), height]);
        } else if (currEdge == 2) {
            gradPoints.push([0, height*random()]);
        } else if (currEdge == 3) {
            gradPoints.push([width, height*random()]);
        }
    }

    gradFill(
        gradPoints[0],
        gradPoints[1], 
        colA, 
        colB
    );
    rect(0,0,width,height);
    granulate(3);

    blendMode(random([BLEND, MULTIPLY, HARD_LIGHT, BURN]));

    p.shuffle();

    colA = p.get(0);
    colA = color(colA.levels[0], colA.levels[1], colA.levels[2], 0.5*255);
    colB = p.get(1);
    colB = color(colB.levels[0], colB.levels[1], colB.levels[2], 0.5*255);
    gradFill(
        gradPoints[2], 
        gradPoints[3], 
        colA, 
        colB
    );
    rect(0,0,width,height);

    granulate(4);
    pop();
}
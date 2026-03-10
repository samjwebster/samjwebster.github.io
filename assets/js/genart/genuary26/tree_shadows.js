let c, renderGenerator;
let bgCol, eraseCol;

let curr_colorMode = "RGB";
function cmode(m) {
    if (m != curr_colorMode) {
        colorMode(m);
        curr_colorMode = m;
    }
}

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {
    bgCol = color("#E3DED9");
    eraseCol = bgCol;
    background(bgCol);

    c = new Composition();
    renderGenerator = c.render();
    loop();
}

function draw() {
    let nxt = renderGenerator.next();
    if (nxt.done) {
        // filter(BLUR, "1px");
        granulate(10);
        noLoop();
    }
}

class Composition {
    constructor() {
        this.tree = new Tree(createVector(width*random(-0.25, -0.1), height*random(-0.45, -0.3), 0));

        this.tree2 = new Tree(createVector(width*random(0.1, 0.25), height*random(-0.45, -0.3), 0));
    }

    *render() {
        // let renderGen = this.tree.renderTopDown(width / 2, height / 2);
        let renderGen = this.tree.renderSide(width / 2, height);
        let nxt = renderGen.next();
        while (!nxt.done) {
            yield nxt.value;
            nxt = renderGen.next();
        }

        renderGen = this.tree2.renderSide(width / 2, height);
        nxt = renderGen.next();
        while (!nxt.done) {
            yield nxt.value;
            nxt = renderGen.next();
        }
    }
}

class Tree {
    constructor(start_pos) {
        this.branches = [];
        this.generateDetails = {
            "maxDepth": 8,
            "offBranchChances": [0.9, 0.5, 0.2, 0.05], // chance to create offshoot at each depth
            "offBranchAttempts": 5,
        }

        this.start_pos = start_pos;

        this.offsetNoise = {...pnoise}
        this.offsetNoise.seed(random() * 10000);
        this.leafNoise = {...pnoise}
        this.leafNoise.seed(random() * 10000);
        this.branchNoise = {...pnoise}
        this.branchNoise.seed(random() * 10000);

        this.generate();
    }

    generate() {
        // start with a trunk
        let l = 0.35 * height;
        let w = 0.08 * width;
        // let a = createVector(0, -3*l, 0);
        // let b = createVector(0, l, 0);

        let a = this.start_pos;
        let b = p5.Vector.add(a, createVector(0, l, 0));

        let trunk = new Branch(this, a, b, w, 3*l);
        trunk.extend_likelihood = 1.0; // trunk always extends
        this.branches.push(trunk);

        let currentBranches = [trunk];
        let minSize = 0.002 * min(width, height);
        while (currentBranches.length > 0) {
            let newBranches = [];   
            for (let br of currentBranches) {
                if (random() > br.extend_likelihood) continue;
                let newBr = br.extend();
                if (newBr) {
                    this.branches.push(newBr);
                    newBranches.push(newBr);
                }

                for (let i = 0; i < this.generateDetails.offBranchAttempts; i++) {
                    let depth_t = br.depth/this.generateDetails.maxDepth;
                    let chance = this.generateDetails.offBranchChances[floor(depth_t * this.generateDetails.offBranchChances.length)];
                    if (random() < chance) {
                        let offBr = br.offshoot();
                        if (offBr) {
                            this.branches.push(offBr);
                            newBranches.push(offBr);
                        }
                    }
                }
            }
            // filter out branches of insignificant length or width
            newBranches = newBranches.filter(br => br.l > minSize && br.w > minSize);

            currentBranches = newBranches;
        }
    }

    apply3DNoise(pt, scaleMod = 1) {
        let nDetail = 0.008;
        let nScale = scaleMod * 0.08 * min(width, height);
        let n = noise(pt.x * nDetail, pt.y * nDetail, pt.z * nDetail);
        let angle = n * TAU;
        let offset = p5.Vector.fromAngle(angle).mult(nScale * n);
        pt.add(offset);
    }

    *renderTopDown(x, y) {
        noStroke();
        let colDark = color(40, 35, 20);
        let colLight = color(255);
        let stepSize = 0.001 * min(width, height);
        for (let br of this.branches) {

            let num_steps = floor(br.topdown_dist / stepSize);
            let next_w = br.next ? br.next.w : 0;
            let col_start = lerpColor(colDark, colLight, br.a.y / height);
            let col_end = lerpColor(colDark, colLight, br.b.y / height);
            
            for(let i = 0; i < num_steps; i++) {
                let t = i / (num_steps - 1);
                let pt = p5.Vector.lerp(br.a, br.b, t);
                this.apply3DNoise(pt);
                point(x + pt.x, y + pt.z);
                let w = lerp(br.w, next_w, t);
                fill(lerpColor(col_start, col_end, t));
                circle(x + pt.x, y + pt.z, w);
            }
        }

        yield;
    }

    *renderSide(x, y) {
        // Sort branches by 'depth' into the screen (y value)
        this.branches.sort((a, b) => a.a.z - b.a.z);
        let minDepth = this.branches[0].a.z;
        let maxDepth = this.branches[this.branches.length - 1].a.z;
        let getDepthT = (z) => map(z, minDepth, maxDepth, 0, 1, true);

        // x, y is where the trunk begins
        noStroke();
        let woodDark = color("#261a14");
        woodDark = lerpColor(woodDark, color(0), 0.5);
        let woodLight = color("#945b3e");

        let leavesDark = color("#2f4723");
        leavesDark = lerpColor(leavesDark, color(0), 0.5);
        let leavesLight = color("#97b545");

        // let accentCol = color('orange');
        let accentCol = color('#f24522');


        let shadowCol = color("#3B4251");
        woodDark = shadowCol;
        woodLight = shadowCol;
        leavesDark = shadowCol;
        leavesLight = shadowCol;
        accentCol = shadowCol;




        cmode(HSB);

        let stepSize = 0.0015 * min(width, height);

        let skipper = 20;
        let count = 0;

        let b_nd = 0.001;

        for (let br of this.branches) {
            let num_steps = floor(br.l / stepSize)
            let next_w = br.next ? br.next.w : 0;
            let col_start = lerpColor(woodDark, woodLight, getDepthT(br.a.z));
            let col_end = lerpColor(woodDark, woodLight, getDepthT(br.b.z));
            let scale_mod_start = (br.depth / this.generateDetails.maxDepth);
            let scale_mod_end = (br.depth + 1) / this.generateDetails.maxDepth;
            let steps_drawn = 0;
            let ang_between = p5.Vector.angleBetween(p5.Vector.sub(br.b, br.a).normalize(), createVector(0, -1, 0));
            for(let i = 0; i < num_steps; i++) {
                let t = i / (num_steps - 1);
                
                let pt = p5.Vector.lerp(br.a, br.b, t);
                let scaleMod = 0.4 + 0.6 * lerp(scale_mod_start, scale_mod_end, t); // min 0.3, max 1.0
                this.apply3DNoise(pt, scaleMod);
                let w = lerp(br.w, next_w, t);

                let pang = this.branchNoise.perlin2(pt.x * b_nd, pt.y * b_nd);
                pang = map(pang, 0, 1, -PI/5, PI/5);
                pang = ang_between + TAU * pang;

                let offX = cos(ang_between) * 0.5 * w;
                let offY = sin(ang_between) * 0.5 * w;

                let pa = [x + pt.x - offX, y - pt.y - offY];
                let pb = [x + pt.x + offX, y - pt.y + offY];

                fill(lerpColor(col_start, col_end, t));
                steps_drawn += texturedLine(pa, pb, lerpColor(col_start, col_end, t), random(1.1, 1.3));
            }

            // draw leaves as uniformly sampled points within the leaves polygon
            if (br.offshoots.length == 0) {
                let leavesDepth = getDepthT(max(br.a.z, br.b.z));
                let leafCol = lerpColor(leavesDark, leavesLight, leavesDepth);

                let leaf_data = br.generateLeavesPolygon();
                let size_t = leaf_data.total_area / (width * height);
                let numSamples = size_t * 125000;
                let samples = br.uniformSampleLeaves(leaf_data, numSamples);

                // draw the outer triangle edge in accent color
                // for (let tri of leaf_data.tris) {
                //     texturedLine(
                //         [x + tri[1][0], y - tri[1][1]],
                //         [x + tri[2][0], y - tri[2][1]],
                //         accentCol, 3);
                // }

                fill(leafCol);
                noStroke();
                let pdetail = 0.001;
                for (let s of samples) {
                    let p = [x + s.x, y - s.y];
                    let pn = this.leafNoise.perlin2(p[0] * pdetail, p[1] * pdetail);
                    
                    let pang = TAU * pn;

                    let r = random(0.5, 1.0) * s.r;

                    let offX = cos(pang) * r;
                    let offY = sin(pang) * r;

                    let pa = [
                        x + s.x - offX,
                        y - s.y - offY
                    ];
                    let pb = [
                        x + s.x + offX,
                        y - s.y + offY
                    ];

                    texturedLine(pa, pb, leafCol, random(0.5, 1.5));
                }
            }



            count++;
            if (count % skipper == 0) yield;
        }
    }
}

class Branch {
    constructor(t, a, b, w, l, previous=null, depth=0) {
        this.t = t; // tree
        this.a = a; // 3d vector 
        this.b = b; // 3d vector
        this.w = w; // width
        this.l = l; // length
        this.normal = p5.Vector.sub(b, a).normalize();
        this.previous = previous;
        this.next = null;
        this.offshoots = [];
        this.depth = depth;
        this.extend_likelihood = 0.9;
        this.topdown_dist = dist(this.a.x, this.a.z, this.b.x, this.b.z);
        this.depthT = this.depth / this.t.generateDetails.maxDepth;
    }

    extend() {
        if(this.depth >= this.t.generateDetails.maxDepth) {
            console.log("max depth reached");
            return null;
        }
        let newL = this.l * random(0.6, 0.8) * (1.0 - this.depthT * 0.35);
        let dirLike = p5.Vector.add(this.normal, p5.Vector.random3D().mult(0.3)).normalize();
        let newB = p5.Vector.add(this.b, dirLike.mult(newL));
        let newW = this.w * 0.7;
        let b = new Branch(this.t, this.b, newB, newW, newL, this, this.depth + 1);
        this.next = b;
        return b;
    }

    offshoot() {
        if(this.depth >= this.t.generateDetails.maxDepth) {
            return null;
        }

        let newL = this.l * random(0.3, 0.9);
        let dirLike = p5.Vector.add(this.normal, p5.Vector.random3D().mult(0.9)).normalize();
        //
        let dirToOrigin = p5.Vector.sub(createVector(0,0,0), this.a).normalize();
        dirToOrigin.y = 0;
        dirToOrigin.mult(-1); // we want the direction away from the origin
        dirLike = p5.Vector.lerp(dirLike, dirToOrigin, random(0.1, 0.5)).normalize(); 

        let startingPosT;
        if (this.depth > 1) startingPosT = random(0.3, 0.7);
        else startingPosT = random(0.6, 0.9);
        let newA = p5.Vector.lerp(this.a, this.b, startingPosT);
        let newB = p5.Vector.add(newA, dirLike.mult(newL));
        let newW = this.w * random(0.3, 0.5);
        let b = new Branch(this.t, newA, newB, newW, newL, this, this.depth + 1);
        b.extend_likelihood = this.extend_likelihood * 0.80; // offshoots less likely to extend as they go deeper
        this.offshoots.push(b);
        return b;
    }

    generateLeavesPolygon() {
        // Generate two convex polygons over the branch that will represent a mass of leaves when rendering in the 2D side view.

        // Get the projected points of the branch endpoints
        let bushelStart = p5.Vector.lerp(this.a, this.b, 0.2);
        let bushelEnd = p5.Vector.lerp(this.a, this.b, 0.8);

        // Apply 3d noise to get rendering position]
        let approxScaleMod = 0.5 + 0.5 * (this.depth / this.t.generateDetails.maxDepth); // min 0.5, max 1.0
        this.t.apply3DNoise(bushelStart, approxScaleMod);
        this.t.apply3DNoise(bushelEnd, approxScaleMod);

        // Get side view positions
        let p1 = createVector(bushelStart.x, bushelStart.y);
        let p2 = createVector(bushelEnd.x, bushelEnd.y);
        let midpoint = p5.Vector.lerp(p1, p2, 0.5);

        let d = p5.Vector.dist(p1, p2);
        let polygonPts = [];
        let numPts = 3 + d / (0.01 * min(width, height));
        for(let i = 0; i < numPts; i++) {
            let t = i/numPts;
            let a = TAU * t;
            let r = 0.5 * d * random(0.7, 1.3);
            let pt = [midpoint.x + r * cos(a), midpoint.y + r * sin(a)];
            polygonPts.push(pt);
        }

        let tris = [];
        let total_area = 0;
        for (let i = 0; i < polygonPts.length; i++) {
            let pA = polygonPts[i];
            let pB = polygonPts[(i + 1) % polygonPts.length];

            let da = dist(midpoint.x, midpoint.y, ...pA);
            let db = dist(midpoint.x, midpoint.y, ...pB);
            let dc = dist(...pA, ...pB);
            let area = triArea(da, db, dc);
            total_area += area;

            tris.push([[midpoint.x, midpoint.y], pA, pB, area]);
        }

        return {
            p1: p1,
            p2: p2,
            midpoint: midpoint,
            dist: p5.Vector.dist(p1, p2),
            tris: tris,
            total_area: total_area
        }

    }

    uniformSampleLeaves(leaves, numSamples) {
        // let leaves = this.generateLeavesPolygon();
        // weighted random sampling of triangles by area
        let totalArea = leaves.tris.reduce((sum, tri) => sum + tri[3], 0);
        let samples = [];   
        for (let i = 0; i < numSamples; i++) {
            let r = random() * totalArea;
            let acc = 0;
            for (let tri of leaves.tris) {
                acc += tri[3];
                if (r <= acc) {
                    let t1 = random();
                    let t2 = random();
                    if (t1 + t2 > 1) {
                        t1 = 1 - t1;
                        t2 = 1 - t2;
                    }
                    // Convert array points to p5.Vector if necessary
                    let v0 = Array.isArray(tri[0]) ? createVector(tri[0][0], tri[0][1]) : tri[0];
                    let v1 = Array.isArray(tri[1]) ? createVector(tri[1][0], tri[1][1]) : tri[1];
                    let v2 = Array.isArray(tri[2]) ? createVector(tri[2][0], tri[2][1]) : tri[2];
                    let p = p5.Vector.add(
                        p5.Vector.add(
                            p5.Vector.mult(v0, 1 - t1 - t2),
                            p5.Vector.mult(v1, t1)
                        ),
                        p5.Vector.mult(v2, t2)
                    );
                    p.r = random(2, 5);
                    samples.push(p);
                    break;
                }
            }
        }
        return samples;
    }    
}

function colTrans(col, t) {
    cmode(RGB);
    let c = color(red(col), green(col), blue(col), t * 255);
    return c;
}

function texturedLine(start, end, col, thickness = 1) {
    let d = dist(...start, ...end);
    let step_size = 0.001 * min(width, height);
    // let circle_size = 0.001 * min(width, height);
    let circle_size = 0.0025 * min(width, height);
    let num_steps = floor(d / step_size);

    let substeps = 4 * (thickness/2);
    let cmode_before = curr_colorMode;
    let colOptions = [colTrans(col, 0.2), colTrans(col, 0.3), colTrans(col, 0.4)];
    cmode(cmode_before);

    for (let i = 0; i < num_steps; i++) {
        let t = i / (num_steps - 1);
        let p = lerpPos(start, end, t);

        // one pass of 'erasing' and one pass of drawing
        // fill(eraseCol);
        // for (let j = 0; j < substeps; j++) {
        //     if (random() < 0.3) continue;
        //     let pj = [p[0] + random(-step_size, step_size), p[1] + random(-step_size, step_size)];
        //     circle(...pj, circle_size * random(0.5, 1));

        // }
        
        for (let j = 0; j < substeps; j++) {
            let rand_ang = random(TAU);
            let rand_r = random(0, step_size * thickness);
            let pj = [p[0] + cos(rand_ang) * rand_r, p[1] + sin(rand_ang) * rand_r];
            fill(random(colOptions));
            circle(...pj, circle_size * random(0.5, 1.5));
        }
    }

    console.log(num_steps)
    return num_steps;

}

function triArea(a, b, c) {
    // given side lengths
    let s = (a + b + c) / 2;
    return sqrt(s * (s - a) * (s - b) * (s - c));
}
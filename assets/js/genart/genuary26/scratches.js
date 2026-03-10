let dim, c, renderGen, p, granulated=false;


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
    c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if (val.done) {
        noLoop();
        if(!granulated) {
            granulate(2);
            granulated = true;
        }
    }
}


class Composition {
    constructor() {
        this.paths = [];
        this.qt = new QuadTree(new Rectangle(width/2, height/2, width/2, height/2), 4);

        let numPaths = round(random(15, 30));
        for(let i = 0; i < numPaths; i++) {

            let numSegments = round(random(3, 7));
            let lines = [];

            // Horizontal or vertical
            let segData = [];
            let nd = random(0.002, 0.004);
            let h = random() < 0.5;
            let baseT = random();
            let baseOffTRange = random(0.05, 0.15);
            let pad = random() * 0.2 * dim;
            if(h) {                
                for(let j = 0; j <= numSegments; j++) {
                    let t = baseT + random(-baseOffTRange, baseOffTRange);
                    t = constrain(t, 0, 1);
                    let x = pad + t * (width - 2*pad);
                    let y = random() * height;

                    segData.push({t: t, p: [x, y], h: true});
                }
            } else {
                for(let j = 0; j < numSegments; j++) {
                    let t = baseT + random(-baseOffTRange, baseOffTRange);
                    t = constrain(t, 0, 1);
                    let x = random() * width;
                    let y = pad + t * (height - 2*pad);
                    let n = noise(x * nd, y * nd);

                    segData.push({t: t, start: [x, y], h: false, n: n});
                }
            }

            segData.sort((a, b) => a.t - b.t);

            let angle = random() * TAU;
            if(h) {
                angle = PI/2 + random(-PI/4, PI/4);
            } else {
                angle = 0 + random(-PI/4, PI/4);
            }

            let branchRange = [0.15 * dim, 0.8*dim];

            let step = random(0.01, 0.065);
            let currSeg = 0;
            for(let t = 0; t <= 1; t += step) {
                if(currSeg < segData.length - 1 && t > segData[currSeg + 1].t) {
                    currSeg++;
                }

                let p;
                if(segData[currSeg].h) {
                    let x = t * width;
                    let y = segData[currSeg].p[1];
                    p = [x, y];
                } else {
                    let x = segData[currSeg].start[0];
                    let y = t * height;
                    p = [x, y];
                }

                let branchAmt = lerp(...branchRange, segData[currSeg].n || 0);

                let a = [p[0] + cos(angle) * branchAmt/2, p[1] + sin(angle) * branchAmt/2];
                let b = [p[0] - cos(angle) * branchAmt/2, p[1] - sin(angle) * branchAmt/2];

                lines.push([a, b]);
            }

            console.log(lines);

            this.paths.push(lines);
        }
    }

    *render() {
        // p.shuffle();
        // let bgCol = lerpColor(p.get(0), color(220), 0.85);
        // background(bgCol);

        renderBackground();

        let qtRange = 0.01*dim;
        let qtThreshold = 4;


        for(let path of this.paths) {
            let c = p.r();
            path = shuffleArray(path);


            while(path.length > 0) {
                blendMode(random([BLEND, MULTIPLY, HARD_LIGHT, BURN]));
                let numSegs = min(floor(random(2, 10)), path.length);

                // pop numSegs random segs
                let verts = [];
                for(let i = 0; i < numSegs; i++) {
                    let seg = path.pop(); // it's already shuffled
                    if(random() < 0.5) {
                        verts.push(seg[0]);
                        verts.push(seg[1]);
                    } else {
                        verts.push(seg[1]);
                        verts.push(seg[0]);
                    }                
                }

                // Sort verts
                if(random() < 0.25) {
                    // left to right
                    verts.sort((a, b) => a[0] - b[0]);
                } else if (random() < 0.33) {
                    // top to bottom
                    verts.sort((a, b) => a[1] - b[1]);
                } else if (random() < 0.5) {
                    // random
                    verts = shuffleArray(verts);
                } // else original



                let centroid = [0,0];
                for(let v of verts) {
                    centroid[0] += v[0];
                    centroid[1] += v[1];
                }
                centroid[0] /= verts.length;
                centroid[1] /= verts.length;

                // recentre verts around centroid
                for(let v of verts) {
                    v = lerpPos(v, centroid, random(0.1, 0.25));
                }

                verts = populateLine(verts, 0.025 * dim);
                verts = chaikin(verts, 3);

                for(let i = 0; i < verts.length-1; i++) {
                    let a = verts[i];
                    let b = verts[i + 1];

                    // Query quadtree;
                    let qtPt = {x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2};
                    let circleQuery = new Circle(qtPt.x, qtPt.y, qtRange);
                    let hits = this.qt.query(circleQuery);
                    if(hits.length >= qtThreshold) {
                        // Too many hits in this area, skip
                        continue;
                    } else {
                        this.qt.insert(qtPt);
                    }
                    
                    if(random() < 0.95) {
                        sketchyLine(a, b, c, 0.5);
                    } else {
                        glitchyLine(a, b, c, random());
                    }
                }
                yield;
            }



            // for(let i = 0; i < path.length; i++) {
            //     let l = path[i];
            //     if(random() < 0.05) continue;
            //     // line(...l[0], ...l[1]);

            //     if(random() < 0.90) {
            //         sketchyLine(l[0], l[1], c, 0.5);
            //     } else {
            //         glitchyLine(l[0], l[1], p.r(), random());
            //     }
            // }
            // yield;
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


function sketchyLine(a, b, col, t, randomize=false) {
    let dim = min(width, height);
    let density = 0.0004 * dim;
    let nDetail = 0.015 + lerp(0, 0.005, t) + (randomize ? random(0.0025) : 0);
    let nOffset = (0.0025 - lerp(0, 0.001, t)) * dim + (randomize ? random(0.0015 * dim * random()) : 0);

    let pts = generateLinePts(a, b, density, nDetail, nOffset);
    let colOptions = [];
    for(let i = 0; i < 5; i++) {
        colOptions.push(colTrans(col, 255*lerp(0.3, 0.8, i/5) - (randomize ? random(50) : 0)));
    }   

    // let rRange = [0.002*dim, 0.004*dim];
    let rRange = [0.001*dim, 0.005*dim];

    // Filter to onscreen points only
    let pad = random([0, 0.025]) * dim;
    pts = pts.filter(pt => pt[0] >= pad && pt[0] <= width-pad && pt[1] >= pad && pt[1] <= height-pad);

    noStroke();

    for(let i = 0; i < pts.length - 1; i++) {

        if(randomize || random() < 0.05) {
            let a = random() * TAU;
            let offR = 0.0015 * dim * random();
            pts[i][0] += cos(a) * offR;
            pts[i][1] += sin(a) * offR;
        }
        let r = random()*random(...rRange);
        fill(random(colOptions));
        rect(...pts[i], random(0.8, 1.2)*r + (randomize ? random(0.005 * dim * random()) : 0), random(0.8, 1.2)*r + (randomize ? random(0.005 * dim * random()) : 0));

        if(random() > 0.94) {
            // paint splatter
            pts[i][0] += random([-1, 1]) * random(0.005, 0.015) * dim;
            pts[i][1] += random([-1, 1]) * random(0.005, 0.015) * dim;
            let r = random(...rRange) * 0.5;
            // circle(...pts[i], r);
            rect(...pts[i], random(0.8, 1.2)*r + (randomize ? random(0.005 * dim * random()) : 0), random(0.8, 1.2)*r + (randomize ? random(0.005 * dim * random()) : 0));
        }
    }
}

function glitchyLine(a, b, col, t) {

    for(let i = 0; i < 2; i++) {
        // blendMode(random([BLEND, MULTIPLY, HARD_LIGHT, BURN]));
        let offA = random()*TAU;
        let offAmt = 0.005 * dim * random(0.5, 1.25);
        let a2 = [a[0] + cos(offA) * offAmt, a[1] + sin(offA) * offAmt];

        let offB = random()*TAU;
        let offAmtB = 0.005 * dim * random(0.5, 1.25);
        let b2 = [b[0] + cos(offB) * offAmtB, b[1] + sin(offB) * offAmtB];

        sketchyLine(a2, b2, p.r(), t, true);
    }


    // blendMode(BLEND);
    sketchyLine(a, b, col, t, true);
}

function renderBackground() {
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

function populateLine(pts, d) {
    let newPts = [];
    for(let i = 0; i < pts.length - 1; i++) {
        let p0 = pts[i];
        let p1 = pts[i + 1];
        newPts.push(p0);
        let segLen = dist(p0[0], p0[1], p1[0], p1[1]);
        if(segLen <= d) continue;

        let numSubPts = floor(segLen / d);
        for(let j = 1; j < numSubPts; j++) {
            let t = j / numSubPts;
            let x = lerp(p0[0], p1[0], t);
            let y = lerp(p0[1], p1[1], t);
            newPts.push([x, y]);
        }
    }
    newPts.push(pts[pts.length - 1]);
    return newPts;
}
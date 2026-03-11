// let c;
let p, renderer;
let lightDir;
let borderSize;
let dim;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;
    
    regenerate();
}

function regenerate() {
    clear();

    p = getPalette();
    p.desaturate(0.2);

    borderSize = random([0, random(0.01, 0.05)*dim]);

    let c = new Composition;
    renderer = c.render();

    loop();
}

function draw() {
    if(!renderer.next().done) {
        return;
    }
    noLoop();
}

class Composition {
    constructor() {
        // this.layers = [];
        // this.ct = round(random(5, 15));
        // ct = 5;
        // let ct = 1;

        
    }

    *render() {
        renderBackground();
        yield;

        this.layers = [];
        let layer_ct = floor(random(5, 10));

        for(let i = 0; i < layer_ct; i++) {
            let layer = new NoiseLayer();
            this.layers.push(layer);
        }
        
        let pts = [];
        for(let layer of this.layers) {
            let layer_pts = layer.getPts(20); // dim/35
            pts = pts.concat(layer_pts);
        }
        pts.sort((a, b) => a.lightIntensity - b.lightIntensity || a.depth - b.depth);

        // console.log("noise extremes:", minSeen, maxSeen);

        // let trim = random(0.5, 0.9);
        // pts = pts.slice(0, floor(trim * pts.length));

        // For incremental rendering
        let skipper = 300; // 150
        let ct = 0;

        pts.forEach(pt => {
            if(random() > 0.96) {
                pt.blendMode = BLEND;
            } else {
                pt.blendMode = HARD_LIGHT;
            }
        });

        // let s = round((pts.length/skipper)/30) + 3;
        // saveGif("output", s);

        push();
        noStroke();

        let lightDir = p5.Vector.fromAngle(random() * PI);

        blendMode(HARD_LIGHT);
        let currentBlendMode = HARD_LIGHT;

        // console.log(pts.length)
        // let stopAt = random(0.80, 1) * pts.length
        // let ptCount = 0;
        for(let pt of pts) {
            // ptCount += 1;
            // if(ptCount > stopAt) break;

            if(pt.blendMode != currentBlendMode) {
                blendMode(pt.blendMode);
                currentBlendMode = pt.blendMode;
            }

            let x = pt.x;
            let y = pt.y;
            
            let angle = pt.dir * TAU;

            let r = lerp(dim*0.01, dim*0.06, 1 - pt.depth);
            
            let posA = [
                x, y
            ];

            let posB = [
                x + cos(angle) * r, 
                y + sin(angle) * r
            ];

            let halfDist = [
                cos(angle) * r * 0.5,
                sin(angle) * r * 0.5
            ];

            posA[0] -= halfDist[0];
            posA[1] -= halfDist[1];
            posB[0] -= halfDist[0];
            posB[1] -= halfDist[1];

            let anchorA = [
                lerp(posA[0], posB[0], 0.333),
                lerp(posA[1], posB[1], 0.333),
            ];
            let anchorB = [
                lerp(posA[0], posB[0], 0.666),
                lerp(posA[1], posB[1], 0.666),
            ]

            let anchorR = r * 0.20;
            let anchorAOff = [
                cos(pt.anchor_a) * anchorR,
                sin(pt.anchor_a) * anchorR
            ];

            let anchorBOff = [
                cos(pt.anchor_b) * anchorR,
                sin(pt.anchor_b) * anchorR
            ];

            anchorA[0] += anchorAOff[0];
            anchorA[1] += anchorAOff[1];
            anchorB[0] += anchorBOff[0];
            anchorB[1] += anchorBOff[1];

            // Use use angle between posA and posB get color based on light
            let surfaceNormal = p5.Vector.sub(createVector(...posB), createVector(...posA)).rotate(PI/2).normalize();

            let lightIntensity = p5.Vector.dot(lightDir, surfaceNormal);
            if(lightIntensity > 0) {
                // Being lit
                pt.col = lerpColor(pt.col, pt.lightCol, 0.4*(lightIntensity**2));
            } else {
                // Facing away from light
                pt.col = lerpColor(pt.col, pt.darkCol, 0.30);
            }

            // let lightBand = 0.10;
            // let lightLerp = 0.75;

            // if(lightIntensity > 1-lightBand) {
            //     let amt = map(lightIntensity, 1-lightBand, 1, 0, lightLerp);
            //     amt *= amt;
            //     pt.col = lerpColor(pt.col, pt.lightCol, amt);
            // } else if (lightIntensity < lightBand) {
            //     let amt =  map(1 - lightIntensity, 1-lightBand, 1, 0, lightLerp);
            //     amt *= amt;
            //     pt.col = lerpColor(pt.col, pt.darkCol, amt);
            // }

            fill(pt.col);
            scribblySegment(random(['line', 'bez']), {
                a: posA, b: posB, a1: anchorA, a2: anchorB
            }, pt.col, pt.nPtMod);
            
            ct++;
            if(ct % skipper == 0) yield 1;
        }
        pop();

        granulate(4);
    }
}

class NoiseLayer {
    constructor() {

        let detailMod = random(1.0, 2.0);

        this.n_dir = new Noise(
            detailMod * random(0.6, 1.2), 1,
            detailMod * random(0.6, 1.2)
        );

        this.n_depth = new Noise(
            2 * detailMod, 1,
            2 * detailMod
        );

        this.n_col = new Noise(
            random(1, 2) * detailMod, 1,
            random(1, 2) * detailMod
        );

        this.n_anchor_a = new Noise(
            random(2, 3) * detailMod, 1,
            random(2, 3) * detailMod
        );

        this.n_anchor_b = new Noise(
            random(2, 3) * detailMod, 1,
            random(2, 3) * detailMod
        );

        this.n_nPtMod = new Noise(
            2*detailMod, 1,
            2*detailMod
        );

        this.startCol = p.r();
        this.endCol = p.r();
        while(this.startCol == this.endCol) {
            this.endCol = p.r();
        }
    }

    getPts(resolution) {
        let pts = [];
        let ptsPerCell = 400;

        let iCt = resolution;
        let iSize = width/resolution;
        let jCt = ceil(height/iSize);

        this.n_dir.setSeed();
        for(let i = 0; i < iCt; i++) {
            for(let j = 0; j < jCt; j++) {
                let xRange = [
                    i*iSize,
                    (i+1)*iSize,
                ];
                let yRange = [
                    j*iSize,
                    (j+1)*iSize,
                ];

                for(let n = 0; n < ptsPerCell; n++) {
                    let x = lerp(...xRange, random());
                    let y = lerp(...yRange, random());
                    let dir = PI * this.n_dir.n(x, y);
                    pts.push({
                        x: x,
                        y: y,
                        dir: dir,
                    });
                }
            }
        }

        this.n_depth.setSeed();
        // let avgDepth = 0;
        for(let pt of pts) {
            let depth = this.n_depth.n(pt.x, pt.y);
            pt.depth = depth;
            // avgDepth += depth;
        }
        // avgDepth /= pts.length;

        // // testing: check distribution of depth values
        // for(let i = 0; i < 10; i++) {
        //     let minRange = i/10;
        //     let maxRange = (i+1)/10;
        //     let ct = pts.filter(pt => pt.depth >= minRange && pt.depth < maxRange).length;
        //     let pct = ct/pts.length;
        //     console.log("depth range", minRange.toFixed(1), "-", maxRange.toFixed(1), ":", pct.toFixed(3) + "(" + ct + " pts)");

        // }

        // Random Thresholding
        while(true) {
            let inside = random([true, true, false]);
            let thresholdSize;
            if(inside) {
                thresholdSize = random(0.05, 0.175);
            } else {
                thresholdSize = random(0.75, 0.90);
            }

            let thresholdCtr = random(0.20, 0.80);
            let lowerThreshold = thresholdCtr - thresholdSize/2;
            let upperThreshold = thresholdCtr + thresholdSize/2;

            let smooth = 0.10;

            let filtered;
            if(inside) {
                filtered = pts.filter(pt => 
                    (pt.depth > lowerThreshold && pt.depth < upperThreshold) ||  // within thresholds
                    (pt.depth > lowerThreshold - smooth && pt.depth < lowerThreshold && random() < (lowerThreshold - pt.depth)/smooth) || // just below lower threshold
                    (pt.depth < upperThreshold + smooth && pt.depth > upperThreshold && random() < (pt.depth - upperThreshold)/smooth) // just above upper threshold
                );
            } else {
                filtered = pts.filter(pt =>
                    (pt.depth < lowerThreshold || pt.depth > upperThreshold) ||  // outside thresholds
                    (pt.depth < lowerThreshold + smooth && pt.depth > lowerThreshold && random() < (lowerThreshold + smooth - pt.depth)/smooth) || // just above lower threshold
                    (pt.depth > upperThreshold - smooth && pt.depth < upperThreshold && random() < (pt.depth - (upperThreshold - smooth))/smooth) // just below upper threshold
                );
            }

            if(filtered.length > 0.03*pts.length) { // in case thresholding is too extreme, try again
                pts = filtered;
                break;
            }
        }

        this.n_col.setSeed();
        for(let pt of pts) {
            let c = this.n_col.n(pt.x, pt.y);
            pt.col = lerpColor(this.startCol, this.endCol, c);
        }

        colorMode(HSB);
        for(let pt of pts) {
            let h = hue(pt.col);
            let s = saturation(pt.col);
            pt.lightCol = color(h, s, 255);
            pt.darkCol = color(h, s, 0);
        }
        colorMode(RGB);

        this.n_anchor_a.setSeed();
        for(let pt of pts) {
            let anchor = TAU*this.n_anchor_a.n(pt.x, pt.y);
            pt.anchor_a = anchor;
        }

        this.n_anchor_b.setSeed();
        for(let pt of pts) {
            let anchor = TAU*this.n_anchor_b.n(pt.x, pt.y);
            pt.anchor_b = anchor;
        }

        this.n_nPtMod.setSeed();
        let easeIn = (t) => t**5;
        for(let pt of pts) {
            let nPtMod = this.n_nPtMod.n(pt.x, pt.y);
            pt.nPtMod = easeIn(nPtMod);
        }

        return pts;
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


function adjNoise(x=0,y=0,z=0) {
    let n = noise(x, y, z);
    n = map(n, 0.18, 0.82, 0, 1);
    if(n < 0) n = 0;
    if(n > 1) n = 1;
    return n;
}

function scribblySegment(mode='line', lineData, col, nPtMod = 0) {
    let density = 0.001 * dim;
    let count;

    if(mode == 'line') {
        count = floor(dist(...lineData.a, ...lineData.b)/density);
    } else {
        let d = 0;
        d += dist(...lineData.a, ...lineData.a1) * 0.75;
        d += dist(...lineData.a1, ...lineData.a2) * 0.75;
        d += dist(...lineData.a2, ...lineData.b) * 0.75;
        count = floor(d/density);
    }

    let nPtBase = 0.002;
    let nPtIncrease = lerp(0.001, 0.01, nPtMod);

    for(let i = 0; i < count; i++) {
        let t = i/count;
        let x, y;

        if(mode == 'line') {
            x = lerp(lineData.a[0], lineData.b[0], t);
            y = lerp(lineData.a[1], lineData.b[1], t);
        } else {
            x = bezierPoint(lineData.a[0], lineData.a1[0], lineData.a2[0], lineData.b[0], t);
            y = bezierPoint(lineData.a[1], lineData.a1[1], lineData.a2[1], lineData.b[1], t);
        }
    
        let nPtR = lerp(nPtBase*dim, nPtBase + nPtIncrease*dim, 1 - randomGaussian());
        let p = nPoint([x, y], nPtR, 0.01); 

        let diff = getBorderDiff(p[0], p[1]);
        let chance = 0;
        if(diff[0] || diff[1]) {
            if(diff[0] && diff[1]) {
                let chanceA = diff[0] / borderSize;
                let chanceB = diff[1] / borderSize;
                chance = max(chanceA, chanceB);
            } else if(diff[0] == -1 && diff[1] > 0) {
                chance = diff[1]/borderSize;
            } else if (diff[1] == -1 && diff[0] > 0) {
                chance = diff[0]/borderSize;
            }
        }
        if (random() < chance) break;

        let opacityMod = (1 - nPtMod)*0.25


        fill(colTrans(wobbleCol(col, 0.05), opacityMod + random(0.3, 0.6)));
        let r = lerp(0.001*dim, 0.0025*dim, random());
        circle(...p, r);    
    }
}

function getBorderDiff(x, y) {
    let diffX = -1, diffY = -1;
    if(x < borderSize) {
        diffX = borderSize - x;
    } else if (x > width - borderSize) {
        diffX = x - (width - borderSize);
    }

    if(y < borderSize) {
        diffY = borderSize - y;
    } else if (y > height - borderSize) {
        diffY = y - (height - borderSize);
    }

    return [diffX, diffY];
}
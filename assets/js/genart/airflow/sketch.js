// let c;
let p, renderer;
let lightDir,lightCol, darkCol;
let borderSize;

function setup() {
    // createCanvas(500, 750)
    // createCanvas(500, 500);
    // createCanvas(1500, 500);
    let cnv = createCanvas(1000, 1000);
    cnv.parent('canvas-container');
    // createCanvas(windowWidth, windowHeight);

    document.getElementById("redraw-button").onclick = function() {
        regenerate();
    }

    regenerate();

    // frameRate(30);
    // pixelDensity(2);

    // // 30, 31
    // // randomSeed(32);
    
    // p = getPalette();
    // p.desaturate(0.2);
    // // p.makeGrayscale();

    // lightDir = p5.Vector.fromAngle(random() * PI);

    // // lightCol = lerpColor(p.r(), color(245), 0.9);
    // // darkCol = lerpColor(p.r(), color(0), 0.90);

    // lightCol = color(255);
    // darkCol = color(0);


    // borderSize = random(0, width*0.10)

    // let c = new Composition;
    // renderer = c.render();
}

function regenerate() {
    clear();
    loop();

    p = getPalette();
    p.desaturate(0.2);
    // p.makeGrayscale();

    lightDir = p5.Vector.fromAngle(random() * PI);

    // lightCol = lerpColor(p.r(), color(245), 0.9);
    // darkCol = lerpColor(p.r(), color(0), 0.90);

    lightCol = color(255);
    darkCol = color(0);


    borderSize = random(0, width*0.10)

    let c = new Composition;
    renderer = c.render();

}

function draw() {
    if(!renderer.next().done) {
        return;
    }
    noLoop();
}

class Composition {
    constructor() {
        this.layers = [];
        let ct = random([3,4,5,6,7]);
        ct = 5;
        // let ct = 1;

        for(let i = 0; i < ct; i++) {
            let layer = new NoiseLayer();
            this.layers.push(layer);
        }
    }

    *render() {
        
        let pts = [];
        for(let layer of this.layers) {
            console.log(width/75);
            let layer_pts = layer.getPts(width/75);
            pts = pts.concat(layer_pts);
        }
        pts.sort((a, b) => a.lightIntensity - b.lightIntensity || a.depth - b.depth);

        let trim = random(0.5, 0.9);
        pts = pts.slice(0, floor(trim * pts.length));

        // For incremental rendering
        let skipper = 100;
        let ct = 0;

        pts.forEach(pt => {
            if(random() > 0.98) {
                pt.blendMode = BLEND;
            } else {
                pt.blendMode = HARD_LIGHT;
            }
        });

        // let s = round((pts.length/skipper)/30) + 3;
        // saveGif("output", s);

        renderBackground();

        push();
        noStroke();

        blendMode(HARD_LIGHT);
        let currentBlendMode = HARD_LIGHT;

        console.log(pts.length)
        let stopAt = random(0.80, 1) * pts.length
        let ptCount = 0;
        for(let pt of pts) {
            ptCount += 1;
            if(ptCount > stopAt) break;

            if(pt.blendMode != currentBlendMode) {
                blendMode(pt.blendMode);
                currentBlendMode = pt.blendMode;
            }

            let x = pt.x;
            let y = pt.y;
            
            let angle = pt.dir * TAU;

            let r = lerp(min(width,height)*0.01, min(width,height)*0.06, 1 - pt.depth);
            
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

            let lightIntensity = constrain(
                p5.Vector.dot(lightDir, surfaceNormal) ** 2, 0, 1
            );

            if(lightIntensity > 0.80) {
                let amt = map(lightIntensity, 0.80, 1, 0, 0.20);
                pt.col = lerpColor(pt.col, lightCol, amt);
            } else if (lightIntensity < 0.20) {
                let amt =  map(1 - lightIntensity, 0.80, 1, 0, 0.20);
                pt.col = lerpColor(pt.col, darkCol, amt);
            }

            fill(pt.col);
            // circle(...posA, 5);
            if (random() > 0.5) {
                scribblyBez(posA, anchorA, anchorB, posB, pt.col);
            } else {
                scribblyLine(posA, posB, pt.col);
            }
            
            

            ct++;
            if(ct % skipper == 0) yield 1;
        }
        pop();

        granulate(12);
    }
}

class NoiseLayer {
    constructor() {

        let detailMod = random(0.40, 1.5);
        // detailMod= 0.75;

        this.n_dir = new Noise(
            random(0.25, 0.50) * detailMod, 1,
        );

        this.n_depth = new Noise(
            5 * detailMod, 2
        );

        this.n_col = new Noise(
            random(1, 2) * detailMod, 2
        );

        this.n_norm = new Noise(
            5 * detailMod, 1
        );

        this.n_anchor_a = new Noise(
            random(2, 3) * detailMod, 1
        );

        this.n_anchor_b = new Noise(
            random(2, 3) * detailMod, 1
        );

        this.startCol = p.r();
        this.endCol = p.r();
        while(this.startCol == this.endCol) {
            this.endCol = p.r();
        }
    }

    getPts(resolution) {
        let pts = [];
        let ptsPerCell = 300;

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

        this.n_col.setSeed();
        for(let pt of pts) {
            let c = this.n_col.n(pt.x, pt.y);
            pt.col = lerpColor(this.startCol, this.endCol, c);
        }

        this.n_depth.setSeed();
        for(let pt of pts) {
            let depth = this.n_depth.n(pt.x, pt.y);
            pt.depth = depth;
        }

        // this.n_norm.setSeed();
        // for(let pt of pts) {
        //     let norm = PI * this.n_norm.n(pt.x, pt.y);
        //     pt.norm = norm;

        //     let surfaceNormal = p5.Vector.fromAngle(norm);

        //     let lightIntensity = constrain(
        //         p5.Vector.dot(lightDir, surfaceNormal) ** 2, 0, 1
        //     );

        //     pt.lightIntensity = lightIntensity;

        //     let towards, amt = -1;

        //     if(lightIntensity > 0.80) {
        //         towards = lightCol;
        //         amt = map(lightIntensity, 0.80, 1, 0, 0.20);
        //     } else if (lightIntensity < 0.20) {
        //         towards = darkCol;
        //         amt =  map(1 - lightIntensity, 0.80, 1, 0, 0.20);
        //     }

        //     if(amt != -1) {
        //         pt.col = lerpColor(pt.col, towards, amt);
        //     }
        // }

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

        // Fixed Thresholding
        // pts = pts.filter(pt => pt.depth > 0.2 && pt.depth < 0.9);

        // Random Thresholding
        let lowerThreshold = random(0.1, 0.9);
        let upperThreshold = random(0.1, 0.9);
        let smooth = 0.025;

        if(random() > 0.5) {
            if(random() > 0.5) {
                pts = pts.filter(pt => 
                    pt.depth > lowerThreshold || 
                    (pt.depth > (lowerThreshold - smooth) && random() > (lowerThreshold-pt.depth)/smooth)
                );
            } else {
                pts = pts.filter(pt => pt.depth < lowerThreshold || (pt.depth < (lowerThreshold + smooth) && random() > (lowerThreshold-pt.depth)/smooth));
            }
        }

        if(random() > 0.5) {
            if(random() > 0.5) {
                pts = pts.filter(pt => pt.depth < upperThreshold || (pt.depth < (upperThreshold + smooth) && random() > (pt.depth-upperThreshold)/smooth));
            } else {
                pts = pts.filter(pt => pt.depth > upperThreshold || (pt.depth > (upperThreshold - smooth) && random() > (pt.depth-upperThreshold)/smooth));
            }
        }

        return pts;
    }
}

function renderBackground() {
    push();
    noStroke();
    let colA = p.r();
    let colB = p.r();
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
    granulate(10);

    blendMode(random([BLEND, MULTIPLY, HARD_LIGHT]));

    colA = p.r();
    colA = color(colA.levels[0], colA.levels[1], colA.levels[2], 0.5*255);
    colB = p.r();
    colB = color(colB.levels[0], colB.levels[1], colB.levels[2], 0.5*255);
    gradFill(
        gradPoints[2], 
        gradPoints[3], 
        colA, 
        colB
    );
    rect(0,0,width,height);


    granulate(10);
    pop();
}

function adjNoise(x=0,y=0,z=0) {
    let n = noise(x, y, z);
    n = map(n, 0.18, 0.82, 0, 1);
    if(n < 0) n = 0;
    if(n > 1) n = 1;
    return n;
}

function scribblyBez(a, a1, a2, b, col) {
    // let density = random(0.00025, 0.0075) * width;
    let density = 0.00075 * width;
    let d = 0;
    d += dist(...a, ...a1);
    d += dist(...a1, ...a2);
    d += dist(...a2, ...b);
    let count = floor(d/density);

    for(let i = 0; i < count; i++) {
        let t = i/count;
        let x = bezierPoint(a[0], a1[0], a2[0], b[0], t);
        let y = bezierPoint(a[1], a1[1], a2[1], b[1], t);

        let r = lerp(0.00075*width, 0.0025*width, random());
        let p = nPoint([x, y], r * 3, 0.01); 

        let diff = getBorderDiff(p[0], p[1]);
        // if(p[0] < borderSize|| p[0] > width - borderSize || p[1] < borderSize || p[1] > height - borderSize) {
        //     console.log("OUTSIDE:", diff)
        //     break;
        // } else {
        //     console.log("INSIDE:", diff)
        // }
        if(diff[0] > 0 || diff[1] > 0) {
            if(diff[0] > 0 && diff[1] > 0) {
                let chanceA = diff[0] / borderSize;
                let chanceB = diff[1] / borderSize;

                if(random() < chanceA) {
                    break;
                }
                if(random() < chanceB) {
                    break;
                }
                
            } else {
                let nearest;
                if(diff[0] == -1) {
                    nearest = diff[1];
                } else if (diff[1] == -1) {
                    nearest = diff[0];
                }

                let chance = nearest / borderSize;
                if(random() < chance) break;
            }
        }


        fill(colTrans(wobbleCol(col, 0.05), random(0.5, 1)));
        circle(...p, r);    
    }
}

function scribblyLine(a, b, col) {
    // let density = random(0.00025, 0.0075) * width;
    let density = 0.001 * width;
    let count = floor(dist(...a, ...b)/density);

    for(let i = 0; i < count; i++) {
        let t = i/count;
        let x = lerp(a[0], b[0], t);
        let y = lerp(a[1], b[1], t);

        // let r = lerp(0.0005*width, 0.0015*width, random());
        let r = lerp(0.00075*width, 0.0025*width, random());
        let p = nPoint([x, y], r * 3, 0.01); 

        let diff = getBorderDiff(p[0], p[1]);
        // if(p[0] < borderSize|| p[0] > width - borderSize || p[1] < borderSize || p[1] > height - borderSize) {
        //     console.log("OUTSIDE:", diff)
        //     break;
        // } else {
        //     console.log("INSIDE:", diff)
        // }
        if(diff[0] > 0 || diff[1] > 0) {
            if(diff[0] > 0 && diff[1] > 0) {
                let chanceA = diff[0] / borderSize;
                let chanceB = diff[1] / borderSize;

                if(random() > chanceA) {
                    if(random() > chanceB) {
                        break;
                    }
                }
            } else {
                let nearest;
                if(diff[0] == -1) {
                    nearest = diff[1];
                } else if (diff[1] == -1) {
                    nearest = diff[0];
                }

                let chance = nearest / borderSize;
                if(random() < chance) break;
            }
        }

        // if(random() > 0.99) blendMode(random([BLEND, HARD_LIGHT]));
        fill(colTrans(wobbleCol(col, 0.05), random(0.5, 1)));
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
let c, renderGen;
let granulated = false;

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
    c = new Composition();
    renderGen = c.render();
    clear();
    loop();
}


function draw() {
    let val = renderGen.next();
    if(val.done) {
        noLoop();
        if(!granulated) {
            granulate(3);
            granulated = true;
        }
    }
}

class Composition {
    constructor() {
        this.qt = new QuadTree(new Rectangle(width/2, height/2, width/2, height/2), 4);
        this.groupCtr = 0;

        let dim = min(width, height);
        this.padding = random(0.01, 0.025)*dim;


        let edgeStep = 0.01*dim;
        let edges = [
            ptsAB([this.padding/2, this.padding/2], [width - this.padding/2, this.padding/2], edgeStep),
            ptsAB([width - this.padding/2, this.padding/2], [width - this.padding/2, height - this.padding/2], edgeStep),
            ptsAB([width - this.padding/2, height - this.padding/2], [this.padding/2, height - this.padding/2], edgeStep),
            ptsAB([this.padding/2, height - this.padding/2], [this.padding/2, this.padding/2], edgeStep)
        ];

        for(let e of edges) {
            for(let i = 0; i < e.length - 1; i++) {
                let a = e[i];
                let b = e[i+1];
                let s = new Segment(a, b, this.groupCtr++, i);
                this.qt.insert(s);
            }
        }


        let sunPos = [random(width*0.3, width*0.7), random(height*0.3, height*0.7)];
        let ctRays = floor(random(15, 30));
        let offAngle = random()*TAU;
        let sunR = random(0.1, 0.3) * dim;
        let sunData = generateStarArc(...sunPos, sunR, offAngle, offAngle + TAU, ctRays * 2, random(0.25, 0.5));
        let sunPts = sunData[0];

        if(sunData[1][0] == sunData[1][sunData[1].length - 1]) {
            // glitch sometimes doubles first/last pt
            sunData[1].pop();
        }


        // Concentric circles going out from the sun

        let currR = sunR * random(0.60, 0.75);

        while(currR < max(width, height)) {

            let pts = circPts(...sunPos, currR, edgeStep);
            pts = pts.filter(p => this.inPadding(...p));

            if(pts.length < 3) {
                break;
            }

            for(let i = 0; i < pts.length; i++) {
                let a = pts[i];
                let b = pts[(i+1) % pts.length];
                if(dist(...a, ...b) > edgeStep * 2) {
                    continue;
                }
                let s = new Segment(a, b, this.groupCtr++, i);
                this.qt.insert(s);
            }


            currR += random(0.05, 0.1) * currR;
        }





        let noff = 0.15 * dim;
        for(let i = 0; i < sunData[1].length; i++) {
            let start = sunData[1][i];
            let dirToCenter = PI + atan2(sunPos[1] - start[1], sunPos[0] - start[0]);

            let end = [
                start[0] + cos(dirToCenter) * max(width, height) * 2,
                start[1] + sin(dirToCenter) * max(width, height) * 2
            ];
            let pts = ptsAB(start, end, edgeStep);
            pts = pts.filter(p => this.inPadding(...p));

            // Apply sinusoidal warping perpendicular to the ray direction
            for(let j = 0; j < pts.length; j++) {
                let tj = j / (pts.length - 1);
                let p = pts[j];
                let tdist = dist(...p, ...start) / (max(width, height) * 2);
                let waveAmount = sin(tj * TAU * 8) * noff;
                let perpAngle = dirToCenter + HALF_PI;
                p[0] += cos(perpAngle) * tdist * waveAmount;
                p[1] += sin(perpAngle) * tdist * waveAmount;
            }
            pts = pts.filter(p => this.inPadding(...p));

            // create segments
            for(let j = 0; j < pts.length - 1; j++) {
                let a = pts[j];
                let b = pts[j+1];
                let s = new Segment(a, b, this.groupCtr++, j);

                let circleQuery = new Circle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dist(...a, ...b) / 2);
                for(let qtpt of this.qt.query(circleQuery)) {
                    if(this.inPadding(...qtpt.a) == false || this.inPadding(...qtpt.b) == false) continue;
                    this.qt.remove(qtpt);
                }


                this.qt.insert(s);
            }
        }

        sunPts = populateLine(sunPts, 0.02*dim);
        sunPts = chaikin(sunPts, 2);
        for(let i = 0; i < sunPts.length; i++) {
            let a = sunPts[i];
            let b = sunPts[(i+1) % sunPts.length];
            let s = new Segment(a, b, this.groupCtr++, i);
            this.qt.insert(s);
        }

        let cloudCircleCt = round(random(75, 125));

        let attempts = 5;
        let cloudCircleRadius = 0.33 * dim;



        while(cloudCircleCt > 0) {
            let x = random(this.padding, width - this.padding);
            let y = random(this.padding, height - this.padding);

            // Avoid placing clouds over the sun
            let dToSun = dist(x, y, ...sunPos);
            if(dToSun < sunR*0.75 + cloudCircleRadius) {
                attempts -= 1;
                if(attempts <= 0) {
                    cloudCircleRadius *= 0.8;
                    attempts = 5;
                }
                continue;
            }
            if(cloudCircleRadius < 0.01 * dim) {
                break;
            }

            let circleQuery = new Circle(x, y, cloudCircleRadius/2);
            for(let qtpt of this.qt.query(circleQuery)) {
                if(this.inPadding(...qtpt.a) == false || this.inPadding(...qtpt.b) == false) continue;
                this.qt.remove(qtpt);
            }

            let cloudPts = circPts(x, y, cloudCircleRadius/2, edgeStep);
            let segments = [];
            for(let j = 0; j < cloudPts.length; j++) {
                let a = cloudPts[j];
                let b = cloudPts[(j+1) % cloudPts.length];
                let s = new Segment(a, b, this.groupCtr++, j);
                segments.push(s);
            }

            segments = segments.filter(s => this.inPadding(...s.a) && this.inPadding(...s.b));

            for(let s of segments) {
                this.qt.insert(s);
            }


            cloudCircleRadius *= 0.95;
            cloudCircleCt -= 1;
        }

    }

    inPadding(x, y) {
        return (x > this.padding && x < width - this.padding && y > this.padding && y < height - this.padding);
    }

    *render() {
        background(lerpColor(color(240), color('orange'), 0.025));
        granulate(2);
        yield;

        stroke(0);

        let qts = [this.qt];
        let skipper = 50;
        let skipCtr = 0;
        while(qts.length > 0) {
            let qt = qts.pop();
            for(let pt of qt.points) {

                sketchyLine(pt.a, pt.b, color(20), 0);
                // line(...pt.a, ...pt.b);

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

class Segment {
    constructor(a, b, groupId, subId) {
        this.a = a;
        this.b = b;
        this.groupId = groupId;
        this.subId = subId;

        // For quadtree:
        this.mp = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        this.x = this.mp[0];
        this.y = this.mp[1];
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
    let nOffset = (0.0025 - lerp(0, 0.001, t)) * dim;

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


function generateStarArc(starX, starY, starR, startA, endA, numPts, inT) {
    let outerPts = [];
    for(let i = 0; i < numPts; i++) {
        let t = i/(numPts - 1);
        let a = lerp(startA, endA, t);
        let r = starR * 0.5;
        let x = starX + cos(a) * r;
        let y = starY + sin(a) * r;
        outerPts.push([x, y]);
    }

    let aStep = (endA - startA) / (numPts - 1);

    let inPts = [];
    for(let i = 0; i < outerPts.length - 1; i++) {
        let a = startA + aStep * i + aStep * 0.5;
        let r = (starR * 0.5) * inT;
        let x = starX + cos(a) * r;
        let y = starY + sin(a) * r;
        inPts.push([x, y]);
    }
        
    let allPts = [];
    for(let i = 0; i < outerPts.length; i++) {
        allPts.push(outerPts[i]);
        if(i < inPts.length) {
            allPts.push(inPts[i]);
        }
    }

    return [allPts, outerPts, inPts];
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

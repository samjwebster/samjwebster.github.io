let dim;
let c, renderGen;
let hasGranulated = false;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;

    regenerate();
}

function regenerate() {
    hasGranulated = false;
    c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if(val.done) {
        noLoop();
        if(!hasGranulated) {
            granulate(3);
            hasGranulated = true;
        }
    }
}


class Composition {
    constructor() {
        
        this.padding = random(0.025, 0.065) * dim;


        let target_sz_x = random(0.05, 0.15) * dim;
        let target_sz_y = random(0.05, 0.15) * dim;

        this.ct_x = ceil((width - 2*this.padding) / target_sz_x);
        this.ct_y = ceil((height - 2*this.padding) / target_sz_y);

        let size_x = (width - 2*this.padding) / this.ct_x;
        let size_y = (height - 2*this.padding) / this.ct_y;

        // this.ct_x = floor(random(8, 24));
        // this.ct_y = floor(random(8, 24));

        // let size_x = (width - this.padding * 2) / this.ct_x;
        // let size_y = (height - this.padding * 2) / this.ct_y;


        let screen = [];
        for(let i = 0; i < width; i++) {
            screen.push(new Array(height).fill(0));
        }
        
        let nDetail = random(0.01, 0.025);

        for(let i = 0; i < this.ct_x; i++) {
            let x = this.padding + (i * size_x) + (size_x / 2);
            for(let j = 0; j < this.ct_y; j++) {
                let y = this.padding + (j * size_y) + (size_y / 2);
                let n = noise(x * nDetail, y * nDetail);
                let size_mult = map(n, 0.2, 0.8, 0.5, 2.0, true);

                let w = size_x * size_mult;
                let h = size_y * size_mult;

                // "draw" cell onto screen by adding 1 to all pixels it covers
                for(let sx = floor(x - w / 2); sx < ceil(x + w / 2); sx++) {
                    for(let sy = floor(y - h / 2); sy < ceil(y + h / 2); sy++) {
                        if(sx >= 0 && sx < width && sy >= 0 && sy < height) {
                            screen[sx][sy] += 1;
                        }
                    }
                }
            }
        }

        this.screen = screen;

        let and_dir = random()*TAU;
        let or_dir = random()*TAU;
        while(abs(and_dir - or_dir) < PI/6) or_dir = random()*TAU;

        let and_lines = [];
        let or_lines = [];
        let spacing = random(0.004, 0.008) * dim;

        let and_norm_line = [
            [width/2 + (width * cos(and_dir - PI/2)), height/2 + (width * sin(and_dir - PI/2))],
            [width/2 - (width * cos(and_dir - PI/2)), height/2 - (width * sin(and_dir - PI/2))],
        ];
        let and_norm_length = dist(and_norm_line[0][0], and_norm_line[0][1], and_norm_line[1][0], and_norm_line[1][1]);
        let and_norm_count = floor(and_norm_length / spacing);

        let or_norm_line = [
            [width/2 + (width * cos(or_dir - PI/2)), height/2 + (width * sin(or_dir - PI/2))],
            [width/2 - (width * cos(or_dir - PI/2)), height/2 - (width * sin(or_dir - PI/2))],
        ];
        let or_norm_length = dist(or_norm_line[0][0], or_norm_line[0][1], or_norm_line[1][0], or_norm_line[1][1]);
        let or_norm_count = floor(or_norm_length / spacing);

        let hyp = dist(0, 0, width, height);

        for(let i = 0; i < and_norm_count; i++) {
            let t = i / (and_norm_count - 1);
            let p = lerpPos(...and_norm_line, t);
            let line = [
                [p[0] + hyp * cos(and_dir), p[1] + hyp * sin(and_dir)],
                [p[0] - hyp * cos(and_dir), p[1] - hyp * sin(and_dir)],
            ];
            and_lines.push(line);
        }

        for(let i = 0; i < or_norm_count; i++) {
            let t = i / (or_norm_count - 1);
            let p = lerpPos(...or_norm_line, t);
            let line = [
                [p[0] + hyp * cos(or_dir), p[1] + hyp * sin(or_dir)],
                [p[0] - hyp * cos(or_dir), p[1] - hyp * sin(or_dir)],
            ];
            or_lines.push(line);
        }

        nDetail = 0.0025;
        let nOffset = random(0.001, 0.002) * dim;

        // Convert lines to series of points
        let density = 0.005 * dim;
        this.and_lines = [];
        for(let line of and_lines) {
            let pts = [];
            let line_length = dist(line[0][0], line[0][1], line[1][0], line[1][1]);
            let ct_pts = floor(line_length / density);
            for(let i = 0; i < ct_pts; i++) {
                let t = i / (ct_pts - 1);
                let p = lerpPos(...line, t);

                // Must be within padding
                if(p[0] < this.padding || p[0] > width - this.padding || p[1] < this.padding || p[1] > height - this.padding) continue;

                // And lines: only keep points that are in areas where screen >= 2
                if(this.screen[floor(p[0])][floor(p[1])] < 2) {
                    // End the current segment
                    if(pts.length > 1) this.and_lines.push([pts[0], pts[pts.length - 1]]);
                    pts = [];
                    continue;
                }
                
                pts.push(p);
            }
            if (pts.length > 1) this.and_lines.push([pts[0], pts[pts.length - 1]]);
        }

        this.or_lines = [];
        for(let line of or_lines) {
            let pts = [];
            let line_length = dist(line[0][0], line[0][1], line[1][0], line[1][1]);
            let ct_pts = floor(line_length / density);
            for(let i = 0; i < ct_pts; i++) {
                let t = i / (ct_pts - 1);
                let p = lerpPos(...line, t);

                // Must be within padding
                if(p[0] < this.padding || p[0] > width - this.padding || p[1] < this.padding || p[1] > height - this.padding) continue;

                // Or lines: only keep points that are in areas where screen >= 1
                if(this.screen[floor(p[0])][floor(p[1])] < 1) {
                    // End the current segment
                    if (pts.length > 1) this.or_lines.push([pts[0], pts[pts.length - 1]]);
                    pts = [];
                    continue;
                }
                
                pts.push(p);
            }

            if (pts.length > 1) this.or_lines.push([pts[0], pts[pts.length - 1]]);
        }

        this.p = getPalette();
        this.p.shuffle();

        this.col_and = [];
        this.col_or = [];

        let amt = 5;
        for(let i = 0; i < amt; i++) {
            let t = i / (amt - 1);
            t = map(t, 0, 1, 0.2, 0.8)*255;
            this.col_and.push(colTrans(this.p.get(0), t));
            this.col_or.push(colTrans(this.p.get(1), t));
        }

        density = 0.00075 * dim;
        nDetail = 0.01;
        nOffset = random(0.001, 0.002) * dim;

        this.all_lines = [];
        for(let segment of this.and_lines) {
            console.log(segment);
            this.all_lines.push({
                pts: generateLinePts(segment[0], segment[1], density, nDetail, nOffset),
                col: 0,
            });
        }
        for(let segment of this.or_lines) {
            this.all_lines.push({
                pts: generateLinePts(segment[0], segment[1], density, nDetail, nOffset),
                col: 1,
            });
        }

        this.all_lines = shuffleArray(this.all_lines);
    }

    *render() {
        background(lerpColor(
            this.p.get(2),
            lerpColor(color('orange'), color(random([240, 15])), 0.94),
            random(0.5, 0.8)
        ));
        granulate(1);
        yield;

        noStroke();
        let rRange = [0.0015*dim, 0.003*dim];
        for(let i = 0; i < this.all_lines.length; i++) {
            let line = this.all_lines[i];
            for(let j = 0; j < line.pts.length; j++) {
                let pt = line.pts[j];
                let line_t = j / (line.pts.length - 1);
                fill(random(line.col == 0 ? this.col_and : this.col_or));
                let r = random(...rRange);
                r *= line.col == 0 ? 1.125 : 0.75;

                // line pressure
                let pressure = -16 * ((line_t - 0.5) ** 4) + 1
                r *= lerp(0.2, 1.0, pressure);

                circle(...pt, r);

                if(random() > 0.95) {
                    // paint splatter
                    pt[0] += random([-1, 1]) * random(0.005, 0.015) * dim;
                    pt[1] += random([-1, 1]) * random(0.005, 0.015) * dim;
                    let r = random(...rRange) * 0.5;
                    circle(...pt, r);
                }
            }    

            if (i % 20 == 0) yield;
        }

        yield;

        
        // strokeWeight(1);
        // stroke(p.r());
        // for(let pts of this.and_lines) {
        //     beginShape();
        //     for(let p of pts) {
        //         vertex(p[0], p[1]);
        //     }
        //     endShape();
        // }

        // stroke(p.r());
        // for(let pts of this.or_lines) {
        //     beginShape();
        //     for(let p of pts) {
        //         vertex(p[0], p[1]);
        //     }
        //     endShape();
        // }

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
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
    
    c = new Composition(
        375, 
        width*0.175, 
        [width/2, height/2]
    );
    renderGen = c.renderPts();
    loop();
}

function draw() {
    let val = renderGen.next();
    if(val.done) {
        noLoop();
        if(!granulated) {
            granulated = true;  
            granulate(5);
        }
    }
}


class Composition {
    constructor(count, size, center) {
        this.count = count;
        this.size = size;
        this.center = center;

        this.pts = [];
        this.generatePts();
    }

    generatePts() {
        let phi = (1 + Math.sqrt(5)) / 2;
        let radius = Math.sqrt(width/2 * width/2 + height/2 * height/2);
        for (let i = 0; i < this.count; i++) {
            let f = i / this.count;
            let angle = i * phi;
            let dist = f * radius;

            let x = this.center[0] + Math.cos(angle * TWO_PI) * dist;
            let y = this.center[1] + Math.sin(angle * TWO_PI) * dist;
            
            this.pts.push({
                pos: [x, y],
                f: f
            });
        }

        // remove the first few points that are too close to center
        this.pts = this.pts.slice(6);
    }

    *renderPts() {
        let p = getPalette();
        p.shuffle();

        let bgCol = lerpColor(p.r(), color(0), random(0.8, 0.9));
        background(bgCol);

        let allCircPts = [];
        let mostLayerCt = 0;

        let nDetail = 1;

        for(let i = this.pts.length-1; i >= 0; i--) {
            let pt = this.pts[i];
            let r = lerp(0.05, 1, pt.f) * this.size;

            // if entire circle is off-canvas, skip it
            if(pt.pos[0] + r < 0 || pt.pos[0] - r > width || pt.pos[1] + r < 0 || pt.pos[1] - r > height) {
                continue;
            }

            // let n = noise(pt.pos[0] * nDetail, pt.pos[1] * nDetail);
            // n = map(n, 0.2, 0.8, 0, 1, true);

            // let col = p.getFloat(n);
            let col = p.r();

            let circPts = this.getCircPts(pt.pos, r, col, bgCol);

            // filter points that are too far outside the canvas
            let xRange = [-0.1 * width, 1.1 * width];
            let yRange = [-0.1 * height, 1.1 * height];
            circPts = circPts.map(layer => {
                return layer.filter(pt => {
                    return pt.x > xRange[0] && pt.x < xRange[1] && pt.y > yRange[0] && pt.y < yRange[1];
                });
            });


            allCircPts.push(circPts);
            if(circPts.length > mostLayerCt) {
                mostLayerCt = circPts.length;
            }
        }

        // group by layer

        let ptSkipper = 50000;
        let ptCtr = 0;

        for(let layer = 0; layer < mostLayerCt; layer++) {
            for(let i = 0; i < allCircPts.length; i++) {
                let circPts = allCircPts[i];
                if(layer < circPts.length) {
                    let pts = circPts[layer];
                    for(let j = 0; j < pts.length; j++) {
                        let pt = pts[j];
                        fill(pt.col);
                        circle(pt.x, pt.y, pt.r*2);
                        
                        ptCtr++;
                        if(ptCtr % ptSkipper == 0) {
                            yield;
                        }
                    }
                }
            }
        }
        yield;





    }   

    getCircPts(pos, maxr, col, bgCol) {
        
        let layers = 8 + ceil(maxr/30);

        let dotRange = [0.004 * min(width, height), 0.010 * min(width, height)];

        noStroke();

        let layerPts = [];
        let baseColOptions = [];
        push();
        colorMode(HSB);
        let baseVals = [hue(col), saturation(col), brightness(col)];
        for(let i = 0; i < 5; i++) {
            baseColOptions.push(color(
                (baseVals[0] + random(-3, 3))%360,
                constrain(baseVals[1] + random(-3, 3),0,100),
                constrain(baseVals[2] + random(-3, 3),0,100)
            ));
        }
        pop();

        for(let i = 0; i < layers; i++) {
            let currLayerPts = [];

            let t = (i+1)/(layers);
            let currR = maxr * (1-t);
            let dotCt = 2*floor((PI * currR * currR)/100);
            
            for(let j = 0; j < dotCt; j++) {
                let angle = random(TWO_PI);
                let dist = random(currR/2);
                let x = pos[0] + Math.cos(angle) * dist;
                let y = pos[1] + Math.sin(angle) * dist;
                let dotR = random(dotRange[0], dotRange[1]) * lerp(0.5, 1, 1 - t);
                let currCol = lerpColor(bgCol, random(baseColOptions), t);
                currCol = colTrans(currCol, 255*random(0.3, 0.5));

                currLayerPts.push({
                    x: x,
                    y: y,
                    r: dotR,
                    col: currCol
                });
            }

            layerPts.push(currLayerPts);
        }

        return layerPts;
    }
        
}
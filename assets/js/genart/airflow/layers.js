// layers.js
// Samuel Webster
// Course Project for Computer Graphics, Fall 2023

// Sheet class
class Sheet {
    constructor(col = color(20), masks = [], shadowmod = 1.01, shadowdir = [1, 1], style = null, styleData = {}) {
        this.col = col;
        this.shadowcol = lerpColor(col, color(0, 0.1*255), 0.6);
        // this.shadowcol = lerpColor(col, color(255, 236, 201, 0.15*255), 0.6);
        this.masks = masks;
        this.shadowmod = shadowmod;
        this.shadowdir = shadowdir;

        // round((max(width, height)/1000)*2)
        this.shadowBlurAmt = 5;

        this.style = style;
        this.styleData = styleData;
    }

    render() {
        let body = this.createBody();

        let mask = createGraphics(width, height);
        mask.background(255);
        this.masks.forEach(m => {
            mask = m.apply(mask);
        });

        let offX = (width/100)*(this.shadowdir[0] * this.shadowmod);
        let offY = (height/100)*(this.shadowdir[1] * this.shadowmod);

        let shadowmask = createGraphics(width, height);
        shadowmask.background(255);
        this.masks.forEach(m => {
            shadowmask = m.applyShadow(shadowmask, offX, offY);
        });


        let bodyimg = createImage(body.width, body.height);
        bodyimg.copy(body, 0, 0, body.width, body.height, 0, 0, body.width, body.height);
        bodyimg.mask(mask);



        if(true) { // if shadow is going to be visible
            let shadow = createGraphics(width, height);
            //shadow.background(this.shadowcol);
            shadow.fill(this.shadowcol);
            shadow.noStroke;
            shadow.rect(-width/4, -height/4, width+(width/2), height+(height/2));

            let shadowimg = createImage(shadow.width, shadow.height);
            shadowimg.copy(shadow, 0, 0, shadow.width, shadow.height, 0, 0, shadow.width, shadow.height);
            shadowimg.mask(shadowmask);
            
            drawingContext.filter = 'blur(20px)';
            blendMode(DARKEST);
            image(shadowimg, 0, 0, shadowimg.width, shadowimg.height);
            drawingContext.filter = 'blur(0px)';
            blendMode(BLEND)

            shadow.remove();
        }
        
        image(bodyimg, 0, 0, width, height);

        body.remove();
        mask.remove();
        shadowmask.remove();
    }

    createBody() {
        let body = createGraphics(width, height);
        body.background(this.col);

        if(this.style == "speckled") {
            let col = this.styleData["col"];
            let speckleTransparent = color(col.levels[0], col.levels[1], col.levels[2], 0);
            
            body.push();
            
            body.noStroke();
            for(let i = 1; i < 2000; i++) {
                let currCol = lerpColor(col, speckleTransparent, random(0.2, 0.5));
                body.fill(currCol);

                let x = random(body.width);
                let y = random(body.height);
                let r = random(body.width*0.004, body.width*0.007);

                let pCount = 10;
                let aOff = random()*TAU;
                let noiseScale = 0.05;
                // let noiseStrength = r;
                body.beginShape();
                for(let j = 0; j < pCount; j++) {
                    let t = j/pCount;
                    let a = (TAU*t) + aOff;
                    let pos = [x + cos(a) * r, y + sin(a) * r];
                    let n = 1*r * lerp(-1, 1, noise(pos[0]*noiseScale, pos[1]*noiseScale));
                    let nPos = [x + cos(a) * n, y + sin(a) * n];
                    body.vertex(...nPos);
                }
                body.endShape();

                // body.circle(x, y, r);
            }
            body.pop();
        } else if (this.style == "scratched") {
            let col = this.styleData["col"];
            let colTransparent = color(col.levels[0], col.levels[1], col.levels[2], 0);
            body.push();
            body.noFill();
            
            let lineDensity = 1;

            let spotCount = round(random(25, 50));
            for(let i = 0; i < spotCount; i++) {
                let centerX = random(body.width);
                let centerY = random(body.height);
                let scratchWidth = random(body.width*0.1, body.width*0.3);
                let scratchHeight = random(body.width*0.1, body.width*0.3);

                let scratchCount = round(random(5, 15));
                for(let j = 0; j < scratchCount; j++) {
                    let startPos = [
                        random(centerX - (scratchWidth/2), centerX + (scratchWidth/2)),
                        random(centerY - (scratchHeight/2), centerY + (scratchHeight/2))
                    ];
                    let endPos = [
                        random(centerX - (scratchWidth/2), centerX + (scratchWidth/2)),
                        random(centerY - (scratchHeight/2), centerY + (scratchHeight/2))
                    ];

                    body.noStroke();
                    body.fill(lerpColor(col, colTransparent, random(0.60, 0.85)));
                    body.strokeWeight(body.width*0.0015);

                    let pCount = (dist(...startPos,...endPos)/lineDensity)

                    for(let k = 0; k < pCount; k++) {
                        let t = k/(pCount-1);
                        let p = lerpPt(startPos, endPos, t);
                        let n = noise(p[0]*0.02, p[1]*0.02);
                        let r = body.width*0.003;
                        let a = n*TAU;
                        let nPt = [p[0] + cos(a)*r, p[1] + sin(a)*r];
                        body.circle(...nPt, lerp(0, 2, n));
                    }


                }
            }   
            body.pop();
        } else if (this.style == "marbled") {
            // flow field esque
            let col = this.styleData["col"];
            let colTransparent = color(col.levels[0], col.levels[1], col.levels[2], 0);
            body.push();
            body.noFill();
            
            let lineDensity = 1;

            let spotCount = round(random(25, 50));
            for(let i = 0; i < spotCount; i++) {
                let centerX = random(body.width);
                let centerY = random(body.height);
                let scratchWidth = random(body.width*0.1, body.width*0.3);
                let scratchHeight = random(body.width*0.1, body.width*0.3);

                let scratchCount = round(random(5, 15));
                for(let j = 0; j < scratchCount; j++) {
                    let startPos = [
                        random(centerX - (scratchWidth/2), centerX + (scratchWidth/2)),
                        random(centerY - (scratchHeight/2), centerY + (scratchHeight/2))
                    ];

                    let endPos = [
                        random(centerX - (scratchWidth/2), centerX + (scratchWidth/2)),
                        random(centerY - (scratchHeight/2), centerY + (scratchHeight/2))
                    ];

                    body.noStroke();
                    body.fill(lerpColor(col, colTransparent, random(0.60, 0.85)));
                    body.strokeWeight(body.width*0.0015);

                    let pCount = (dist(...startPos,...endPos)/lineDensity)

                    for(let k = 0; k < pCount; k++) {
                        let t = k/(pCount-1);
                        let p = lerpPt(startPos, endPos, t);
                        let n = noise(p[0]*0.02, p[1]*0.02);
                        let r = body.width*0.02;
                        let a = n*TAU;
                        let nPt = [p[0] + cos(a)*r, p[1] + sin(a)*r];
                        body.circle(...nPt, lerp(0, 2, n));
                    }


                }
            }   
            body.pop();
        } else if (this.style == "gridded") {
            // flow field esque
            let col = this.styleData["col"];
            let colTransparent = color(col.levels[0], col.levels[1], col.levels[2], 0);
            
            body.push();
            body.noFill();
            let lineDensity = 1;

            let grid_width = random()*(body.width/10) + (body.width/50);
            let grid_height = random()*(body.height/10) + (body.height/50);

            let x = random()*grid_width;
            let y = random()*grid_height;

            while(x < body.width) {
                let startPos = [x, 0];
                let endPos = [x, body.height];
                body.noStroke();
                body.fill(lerpColor(col, colTransparent, random(0.60, 0.85)));
                body.strokeWeight(body.width*0.0015);

                let pCount = (dist(...startPos,...endPos)/lineDensity)

                for(let k = 0; k < pCount; k++) {
                    let t = k/(pCount-1);
                    let p = lerpPt(startPos, endPos, t);
                    let n = noise(p[0]*0.02, p[1]*0.02);
                    let r = body.width*0.003;
                    let a = n*TAU;
                    let nPt = [p[0] + cos(a)*r, p[1] + sin(a)*r];
                    body.circle(...nPt, lerp(0, 2, n));
                }

                x += grid_width;
            }

            while(y < body.height) {
                let startPos = [0, y];
                let endPos = [body.width, y];
                body.noStroke();
                body.fill(lerpColor(col, colTransparent, random(0.60, 0.85)));
                body.strokeWeight(body.width*0.0015);

                let pCount = (dist(...startPos,...endPos)/lineDensity)

                for(let k = 0; k < pCount; k++) {
                    let t = k/(pCount-1);
                    let p = lerpPt(startPos, endPos, t);
                    let n = noise(p[0]*0.02, p[1]*0.02);
                    let r = body.width*0.003;
                    let a = n*TAU;
                    let nPt = [p[0] + cos(a)*r, p[1] + sin(a)*r];
                    body.circle(...nPt, lerp(0, 2, n));
                }

                y += grid_height;
            }
            body.pop();
        } else if (this.style != null) {
            console.log("Unknown style:", this.style);
        }
    
        return body;
    }
}

// Mask class
class Mask {
    constructor(pos, type, data) {
        this.pos = pos;
        this.type = type;
        this.data = data;
    }

    apply(graphic) {
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

        } else if (this.type == "polygon_add") {
            graphic.push();
            graphic.fill(255);
            graphic.stroke(255);
            graphic.strokeWeight(1);
            graphic.beginShape();
            this.data.pts.forEach(p => {
                graphic.vertex(...p);
            });
            graphic.endShape(CLOSE);
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
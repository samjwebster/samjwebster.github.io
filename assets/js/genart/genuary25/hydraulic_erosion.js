let p, t, renderGenerator;
let granulated = false;
let ctr = 0;
let desiredErode = 800000;
let erodeStep = null;

function setup() {
    let cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("canvas_container");

    dim = min(width, height);

    let reset_button = document.getElementById("reset-button");
    reset_button.onclick = regenerate;
    
    regenerate();
}


function regenerate() {
    
    p = getPalette();

    t = new Terrain();
    renderGenerator = t.newRender();

    granulated = false;
    ctr = 0;
    desiredErode = 800000;
    erodeStep = null;

    loop();

}

function draw() {

    if(erodeStep == null) {
        erodeStep = 20000;
    }

    if(ctr < desiredErode) {
        t.erode(erodeStep);
        ctr += erodeStep;
        t.renderQuick();

        push();

        stroke(0);
        noFill();
        rect(0.1*width, 0.1*height, 0.8*width, 0.05*height);

        fill(0);
        rect(0.1*width, 0.1*height, map(ctr, 0, desiredErode, 0, 0.8*width), 0.05*height);

        pop();

    } else {
        let nxt = renderGenerator.next();
        if(nxt.done) {
            console.log("Done!");
            if(!granulated) {
                granulated = true;
                granulate(6);
            }
            noLoop();
        }
    }
}

// function mouseClicked() {
//     t.erode(1);
//     renderGenerator = t.render();
// }


class Terrain {
    constructor() {

        this.resolution = 300;

        this.tint = p.r();

        this.bgCol = lerpColor(color("blue"), color(255), 0.85);
        this.bgCol = lerpColor(this.bgCol, this.tint, 0.10);

        this.colGrass = color("#706625");
        this.colGrass = lerpColor(this.colGrass, this.tint, 0.10);

        this.colStone = color('#5C2F2C');
        this.colStone = lerpColor(this.colStone, this.tint, 0.10);

        this.colStoneB = lerpColor(lerpColor(color('#7a5220'), color('red'), 0.25), color(0), 0.05);
        this.colStoneB = lerpColor(this.colStoneB, this.tint, 0.10);

        this.colFrame = color("#ede7d8");
        this.colFrame = lerpColor(this.colFrame, this.tint, 0.10);

        this.light = p5.Vector.random2D().normalize();

        this.xDetail = 4;
        this.yDetail = 4;
        let offX = random(999999999);
        let offY = random(999999999);

        this.minGradSeen = float("inf");
        this.maxGradSeen = float("-inf");

        noiseDetail(7, 0.5);

        this.heightmap = [];
        for(let i = 0; i < this.resolution; i++) {
            this.heightmap.push([]);
            let x = offX + (lerp(0, 1, (i/this.resolution)))*this.xDetail;
            for(let j = 0; j < this.resolution; j++) {
                let y = offY + (lerp(0, 1, (j/this.resolution)))*this.yDetail;
                let n = adjNoise(x, y)**2;
                this.heightmap[i].push(n);
            }
        }

        this.renderConfig = {
            "horizon": 0.5*height,
            "yOverflow": 0.30*height,
            "maxHeight": 0.30*height, 
        }

        this.initializeBrushIndices();

        this.erode(50);
    }

    *renderGen() {
        background(lerpColor(color("blue"), color(255), 0.85));
        yield;

        let horizon = this.renderConfig.horizon;
        let w = width/this.resolution;

        let toRender = [];

        for(let i = 0; i < this.resolution; i++) {
            for(let j = 0; j < this.resolution; j++) {
                let basePos = [
                    lerp(0, width, i/this.resolution),
                    lerp(horizon, height + this.renderConfig.yOverflow, j/this.resolution)
                ];
                let h = this.heightmap[i][j] * this.renderConfig.maxHeight;
                let pos = [basePos[0], basePos[1] - h];
                toRender.push({"basePos": basePos, "pos": pos, "w": w, "h": h});
            }
        }

        // Sort by basePos y (depth into terrain)
        toRender.sort((a, b) => {
            return a.basePos[1] - b.basePos[1];
        });

        // let skipper = 5000;
        noStroke();
        for(let i = 0; i < toRender.length; i++) {
            let r = toRender[i];
            fill(lerpColor(color(0), color(255), (r.h/this.renderConfig.maxHeight)));
            rect(r.pos[0], r.pos[1], r.w, height - r.pos[1]);
            // if(i % skipper == 0) yield;
        }
        yield;
    }

    render() {
        background(this.bgCol);

        let horizon = this.renderConfig.horizon;
        let w = width/this.resolution;

        let toRender = [];

        for(let i = 0; i < this.resolution; i++) {
            for(let j = 0; j < this.resolution; j++) {
                let basePos = [
                    lerp(0, width, i/this.resolution),
                    lerp(horizon, height + this.renderConfig.yOverflow, j/this.resolution)
                ];
                let h = this.heightmap[i][j] * this.renderConfig.maxHeight;
                let pos = [basePos[0], basePos[1] - h];

                let gradientX, gradientY;
                try{
                    let hAndG = this.calculateHeightAndGradient(i, j);
                    gradientX = hAndG.gradientX;
                    gradientY = hAndG.gradientY;
                } catch(e) {
                    gradientX = 0;
                    gradientY = 0;
                }

                if(gradientX == NaN) continue;
                if(!gradientY == NaN) continue

                if(gradientX < this.minGradSeen) this.minGradSeen = gradientX;
                if(gradientX > this.maxGradSeen) this.maxGradSeen = gradientX;
                if(gradientY < this.minGradSeen) this.minGradSeen = gradientY;
                if(gradientY > this.maxGradSeen) this.maxGradSeen = gradientY;

                toRender.push({"basePos": basePos, "depth": j/this.resolution, "pos": pos, "w": w, "h": h, "gradientX": gradientX, "gradientY": gradientY});
            }
        }

        // Sort by depth
        toRender.sort((a, b) => {
            return a.depth - b.depth;
        });

        let maxGrad = 0;
        toRender.forEach(r => {
            maxGrad = max(r.gradientX, maxGrad);
            maxGrad = max(r.gradientY, maxGrad);
        });

        noStroke();
        for(let i = 0; i < toRender.length; i++) {
            let r = toRender[i];

            let gradAvg = ((abs(r.gradientX)/maxGrad) + (abs(r.gradientY)/maxGrad)) / 2;

            let c;
            let thresh = 0.035;
            let give = 0.02;
            if(gradAvg < thresh - give) c = this.colGrass;
            else if(gradAvg <= thresh + give) c = lerpColor(this.colGrass, this.colStone, map(gradAvg, thresh-give, thresh+give, 0, 1));
            else c = this.colStone;

            let gradVec = createVector(r.gradientX, r.gradientY); 
            let lightStrength = gradVec.dot(this.light);
            // console.log(lightStrength)

            if(lightStrength < 0) c = lerpColor(c, color(0), 0.5);

            // if(lightStrength < 0.5) c = lerpColor(c, color(0), lerp(0, 0.5, lightStrength));


            fill(c);
            rect(r.pos[0], r.pos[1], r.w, height - r.pos[1]);
        }
    }

    renderQuick() {
        background(this.bgCol);

        let horizon = this.renderConfig.horizon;
        let w = width/this.resolution;

        let toRender = [];

        for(let i = 0; i < this.resolution; i++) {
            for(let j = 0; j < this.resolution; j++) {
                let basePos = [
                    lerp(0, width, i/this.resolution),
                    lerp(horizon, height + this.renderConfig.yOverflow, j/this.resolution)
                ];
                let h = this.heightmap[i][j] * this.renderConfig.maxHeight;
                let pos = [basePos[0], basePos[1] - h];



                toRender.push({"basePos": basePos, "depth": j/this.resolution, "pos": pos, "w": w, "h": h});
            }
        }

        // Sort by depth
        toRender.sort((a, b) => {
            return a.depth - b.depth;
        });

        noStroke();
        for(let i = 0; i < toRender.length; i++) {
            let r = toRender[i];

            let ht = r.h/this.renderConfig.maxHeight;
            
            let c = lerpColor(color('red'), color('blue'), r.depth);

            push();
            colorMode(HSB);
            let b = lerp(0, 100, lerp(0.1, 1, ht));
            c = color(hue(c), saturation(c), b);
            pop();

            
            // let c = lerpColor(color(0), color(255), ht**2);

            fill(c);
            rect(r.pos[0], r.pos[1], r.w, height - r.pos[1]);
        }
    }

    *newRender() {
        background(this.bgCol);
        let horizon = this.renderConfig.horizon;
        let sampleRange = [1, this.resolution-2];

        // Terrain
        let densX = 0.003 * min(width, height);
        let densY = densX / 2;
        let renderResolutionX = ceil(width/densX);
        let renderResolutionY = ceil(height/densY);
        let subCount = 10;

        let w = width/renderResolutionX;
        
        strokeWeight(width/renderResolutionX);

        let toRender = [];
        for(let i = 0; i < renderResolutionX; i++) {
            let ti = (i/(renderResolutionX-1));
            let iIndexT = lerp(...sampleRange, ti);
            let iIndex = floor(iIndexT);
            let iIndexNext = iIndex + 1;
            let iIndexOff = iIndexT - iIndex;
            for(let j = 0; j < renderResolutionY; j++) {
                let tj = (j/(renderResolutionY-1));
                let jIndexT = lerp(...sampleRange, tj);
                let jIndex = floor(jIndexT);
                let jIndexNext = jIndex + 1;
                let jIndexOff = jIndexT - jIndex;

                let basePos = [
                    lerp(0, width, ti),
                    lerp(horizon, height + this.renderConfig.yOverflow, tj)
                ];

                let cellNW = this.heightmap[iIndex][jIndex];
                let cellNE = this.heightmap[iIndexNext][jIndex];
                let cellSW = this.heightmap[iIndex][jIndexNext];
                let cellSE = this.heightmap[iIndexNext][jIndexNext];

                let hN = lerp(cellNW, cellNE, iIndexOff);
                let hS = lerp(cellSW, cellSE, iIndexOff);
                let h = lerp(hN, hS, jIndexOff);
                h = h * this.renderConfig.maxHeight;

                let pos = [basePos[0], basePos[1] - h];

                let hAndGNW = this.unsafeCalculateHeightAndGradient(iIndex, jIndex);
                let hAndGNE = this.unsafeCalculateHeightAndGradient(iIndexNext, jIndex);
                let hAndGSW = this.unsafeCalculateHeightAndGradient(iIndex, jIndexNext);
                let hAndGSE = this.unsafeCalculateHeightAndGradient(iIndexNext, jIndexNext);

                let gxN = lerp(hAndGNW.gradientX, hAndGNE.gradientX, iIndexOff);
                let gxS = lerp(hAndGSW.gradientX, hAndGSE.gradientX, iIndexOff);
                let gx = lerp(gxN, gxS, jIndexOff);

                let gyN = lerp(hAndGNW.gradientY, hAndGNE.gradientY, iIndexOff);
                let gyS = lerp(hAndGSW.gradientY, hAndGSE.gradientY, iIndexOff);
                let gy = lerp(gyN, gyS, jIndexOff);

                toRender.push({"basePos": basePos, "depth": tj, "pos": pos, "w": w, "h": h, "gradientX": gx, "gradientY": gy});

                stroke(wobbleCol(lerpColor(this.colStone, this.bgCol, lerp(0, 0.15, 1-tj)), 0.025));
                line(...pos, pos[0], height);
            }
        }

        yield;

        // Sort by depth
        let maxGradSeen = 0;
        toRender.sort((a, b) => {
            maxGradSeen = max(maxGradSeen, abs(a.gradientX), abs(b.gradientX), abs(a.gradientY), abs(b.gradientY));
            return a.depth - b.depth;
        });

        let skipper = round(0.02 * toRender.length);

        let dirtNoiseSeed = round(random(999999999));
        noiseSeed(dirtNoiseSeed);
        let dirtNoiseDetail = 50;

        // Grass threshold
        let thresh = 0.040;
        let give = 0.015;

        noStroke();
        for(let i = 0; i < toRender.length; i++) {
            let r = toRender[i];

            let gradAvg = ((abs(r.gradientX)/maxGradSeen) + (abs(r.gradientY)/maxGradSeen)) / 2;
            let c;
            
            if(gradAvg < thresh - give) c = this.colGrass;
            else {
                let dn = adjNoise(
                    (r.basePos[0]/width) * dirtNoiseDetail, 
                    ((r.basePos[1]-this.renderConfig.horizon)/(height-this.renderConfig.horizon)) * dirtNoiseDetail
                )**2;

                let stoneC = lerpColor(this.colStone, this.colStoneB, dn/4);

                if(gradAvg <= thresh + give) c = lerpColor(this.colGrass, stoneC, map(gradAvg, thresh-give, thresh+give, 0, 1))
                else c = stoneC;
            }

            let gradVec = createVector(r.gradientX, r.gradientY); 
            let lightStrength = gradVec.dot(this.light);

            if(lightStrength < 0) c = lerpColor(c, color(0), 0.5);
            else c = lerpColor(c, color(255), constrain(lightStrength*2, 0, 1));

            c = lerpColor(c, this.bgCol, lerp(0, 0.175, map(1-r.depth, 0.60, 1, 0, 1, true)));
            if(random()> 0.99) console.log(1-r.depth);

            for(let j = 0; j < subCount; j++) {
                let cx = r.pos[0] + r.w/2;
                let cy = r.pos[1];
                let newPos = [
                    cx + random(-1, 1) * r.w,
                    cy + random(-1.5, 0) * r.w
                ];
                fill(wobbleCol(c, 0.025));
                circle(...newPos, random(0.5, 1.0) * r.w);
            }

            if(i % skipper == 0) yield;
        }

        yield;

        // Frame
        // noStroke();
        // fill(this.colFrame);
        // rect(0, 0, width, height*0.05);
        // rect(0, height*0.95, width, height*0.05);
        // rect(0, 0, width*0.05, height);
        // rect(width*0.95, 0, width*0.05, height);
        // yield;
    }

    erode(iterations=1) {
        let inertia = 0.05;
        let sedimentCapacityFactor = 4;
        let minSedimentCapacity = 0.01;
        let erodeSpeed = 0.3;
        let depositSpeed = 0.3;
        let evaporateSpeed = 0.01;
        let gravity = 4;
        let maxDropletLifetime = 30;

        let initialWaterVolume = 1;
        let initialSpeed = 1;

        for(let i = 0; i < iterations; i++) {
            let posX = floor(random() * this.resolution);
            let posY = floor(random() * this.resolution);

            let dirX = 0;
            let dirY = 0;

            let speed = initialSpeed;
            let water = initialWaterVolume;
            let sediment = 0;

            for(let lifetime = 0; lifetime < maxDropletLifetime; lifetime++) {
                let nodeX = floor(posX);
                let nodeY = floor(posY);

                let offsetX = posX - nodeX;
                let offsetY = posY - nodeY;

                let heightAndGradient;
                try {
                    heightAndGradient = this.calculateHeightAndGradient(posX, posY);
                } catch(e) {
                    break;
                }

                dirX = dirX * inertia - heightAndGradient.gradientX * (1-inertia);
                dirY = dirY * inertia - heightAndGradient.gradientY * (1-inertia);

                let len = sqrt(dirX * dirX + dirY * dirY);
                if(len != 0) {
                    dirX /= len;
                    dirY /= len;
                }

                posX += dirX;
                posY += dirY;

                if((dirX == 0 && dirY == 0) || (posX < 0 || posX >= this.resolution || posY < 0 || posY >= this.resolution)) {
                    break;
                }

                let newHeight
                try {
                    newHeight = this.calculateHeightAndGradient(posX, posY).height;
                } catch(e) {
                    break;
                }
                let deltaHeight = newHeight - heightAndGradient.height;

                let sedimentCapacity = max(-deltaHeight * speed * water * sedimentCapacityFactor, minSedimentCapacity);

                if(sediment > sedimentCapacity || deltaHeight > 0) {
                    let amountToDeposit = (deltaHeight > 0) ? min(deltaHeight, sediment) : (sediment - sedimentCapacity)*depositSpeed;
                    sediment -= amountToDeposit;

                    this.heightmap[nodeX][nodeY] += amountToDeposit * (1-offsetX) * (1-offsetY);
                    this.heightmap[nodeX + 1][nodeY] += amountToDeposit * offsetX * (1-offsetY);
                    this.heightmap[nodeX][nodeY + 1] += amountToDeposit * (1-offsetX) * offsetY;
                    this.heightmap[nodeX + 1][nodeY + 1] += amountToDeposit * offsetX * offsetY;
                } else {
                    let amountToErode = min((sedimentCapacity - sediment) * erodeSpeed, -deltaHeight);

                    for(let brushPointIndex = 0; brushPointIndex < this.erosionBrushIndices[nodeX][nodeY].length; brushPointIndex++) {
                        let nodeIndices = this.erosionBrushIndices[nodeX][nodeY][brushPointIndex];
                        let weightedErodeAmount = amountToErode * this.erosionBrushWeights[nodeX][nodeY][brushPointIndex];
                        let deltaSediment = (this.heightmap[nodeIndices[0]][nodeIndices[1]] < weightedErodeAmount) ? this.heightmap[nodeIndices[0]][nodeIndices[1]] : weightedErodeAmount;
                        sediment += deltaSediment;
                    }
                }

                speed = sqrt(speed * speed + deltaHeight * gravity);
                water *= (1 - evaporateSpeed);
            }
        }
    }

    calculateHeightAndGradient(posX, posY) {
        let coordX = floor(posX);
        let coordY = floor(posY);
        let x = posX - coordX;
        let y = posY - coordY;
        
        let heightNW = this.heightmap[coordX][coordY];
        let heightNE = this.heightmap[coordX + 1][coordY];
        let heightSW = this.heightmap[coordX][coordY + 1];
        let heightSE = this.heightmap[coordX + 1][coordY + 1];

        let gradientX = (heightNE - heightNW) * (1-y) + (heightSE - heightSW) * y;
        let gradientY = (heightSW - heightNW) * (1-x) + (heightSE - heightNE) * x;

        let height = heightNW * (1-x) * (1-y) + heightNE * x * (1 - y) + heightSW * (1 - x) * y + heightSE * x * y;
        
        return {"height": height, "gradientX": gradientX, "gradientY": gradientY};
    }

    unsafeCalculateHeightAndGradient(posX, posY) {
        let coordX = floor(posX);
        let coordY = floor(posY);
        let x = posX - coordX;
        let y = posY - coordY;

        let gradientX = 0;
        let gradientY = 0;
        let height = 0;

        try {
            let heightNW = this.heightmap[coordX][coordY];
            let heightNE = this.heightmap[coordX + 1][coordY];
            let heightSW = this.heightmap[coordX][coordY + 1];
            let heightSE = this.heightmap[coordX + 1][coordY + 1];

            gradientX = (heightNE - heightNW) * (1-y) + (heightSE - heightSW) * y;
            gradientY = (heightSW - heightNW) * (1-x) + (heightSE - heightNE) * x;
            height = heightNW * (1-x) * (1-y) + heightNE * x * (1 - y) + heightSW * (1 - x) * y + heightSE * x * y;
        } catch(e) {
            
        };
        
        return {"height": height, "gradientX": gradientX, "gradientY": gradientY};
    }

    initializeBrushIndices() {
        this.erosionBrushIndices = [];
        this.erosionBrushWeights = [];

        for(let i = 0; i < this.resolution; i++) {
            this.erosionBrushIndices.push([]);
            this.erosionBrushWeights.push([]);
            for(let j = 0; j < this.resolution; j++) {
                this.erosionBrushIndices[i].push([]);
                this.erosionBrushWeights[i].push([]);
            }
        }

        let radius = 3;
        let xOffsets = [];
        let yOffsets = [];
        let weights = [];
        for(let i = 0; i < radius * radius * 4; i++) {
            xOffsets.push(0);
            yOffsets.push(0);
            weights.push(0);
        }

        let weightSum = 0;
        let addIndex = 0;

        for(let i = 0; i < this.erosionBrushIndices.length; i++) {
            for(let j = 0; j < this.erosionBrushIndices[i].length; j++) {
                if(j <= radius || j >= this.resolution - radius || i <= radius + 1 || i >= this.resolution - radius) {
                    weightSum = 0;
                    addIndex = 0;

                    for(let y = -radius; y <= radius; y++) {
                        for(let x = -radius; x <= radius; x++) {
                            let sqrDst = x * x + y * y;
                            if(sqrDst < radius * radius) {
                                let coordX = floor(i + x);
                                let coordY = floor(j + y);

                                if(coordX >= 0 && coordX < this.resolution && coordY >= 0 && coordY < this.resolution) {
                                    let weight = 1 - sqrt(sqrDst)/radius;
                                    weightSum += weight;
                                    weights[addIndex] = weight;
                                    xOffsets[addIndex] = x;
                                    yOffsets[addIndex] = y;
                                    addIndex++;
                                }
                            }
                        }
                    }
                }

                let numEntries = addIndex;
                this.erosionBrushIndices[i][j] = [];
                this.erosionBrushWeights[i][j] = [];

                for(let k = 0; k < numEntries; k++) {
                    this.erosionBrushIndices[i][j].push([i + xOffsets[k], j + yOffsets[k]]);
                    this.erosionBrushWeights[i][j].push(weights[k] / weightSum);
                }
            }
        }
    }    
}

function adjNoise(x=0,y=0,z=0) {
    return map(noise(x,y,z), 0.15, 0.85, 0, 1, true);
}
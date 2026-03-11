let p, t, renderGenerator;

let granulated = false;
let ctr = 0;
let desiredErode = 0;
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

    granulated = false;
    ctr = 0;
    desiredErode = 0;
    erodeStep = null;

    t = new Terrain();
    renderGenerator = t.newRender();
    t.erode(50000);
    loop();
}

function draw() {

    if(erodeStep == null) {
        erodeStep = 50000;
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
            // fill(0);
            // noStroke();
            // rect(0, 0, width, 37.5);
            // rect(0, height - 37.5, width, 37.5);


            // console.log("Done!");
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

        this.resolution = 250;

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
        this.yDetail = 2;
        let offX = random(999999999);
        let offY = random(999999999);

        this.minGradSeen = float("inf");
        this.maxGradSeen = float("-inf");

        noiseDetail(7, 0.5);

        this.heightmap = [];
        let nMin = float("inf");
        let nMax = float("-inf");
        for(let i = 0; i < this.resolution; i++) {
            this.heightmap.push([]);
            let x = offX + (lerp(0, 1, (i/this.resolution)))*this.xDetail;
            for(let j = 0; j < this.resolution; j++) {
                let y = offY + (lerp(0, 1, (j/this.resolution)))*this.yDetail;
                let n = adjNoise(x, y)**2;
                nMin = min(n, nMin);
                nMax = max(n, nMax);
                this.heightmap[i].push(n);
            }
        }

        // Normalize
        // this.heightmap = this.heightmap.map(row => row.map(n => map(n, nMin, nMax, 0, 1, true)));

        this.renderConfig = {
            "horizon": 0.5*height,
            "yOverflow": 0.25*height,
            "maxHeight": 0.25*height, 
        }

        this.initializeBrushIndices();
    }

    updateGradMap() {
        this.gradmap = [];

        for(let i = 0; i < this.resolution; i++) {
            this.gradmap.push([]);
            for(let j = 0; j < this.resolution; j++) {
                let hAndG = this.unsafeCalculateHeightAndGradient(i, j);
                this.gradmap[i].push(hAndG);
            }
        }
    }

    sampleMaps(i, j) {
        // Bilinear sample from heightmap and gradmap
        let sampleRange = [1, this.resolution-2];

        let iIndexT = map(i, 0, 1, ...sampleRange, true);
        let iIndex = floor(iIndexT);
        let iIndexNext = iIndex + 1;
        let iIndexOff = iIndexT - iIndex;
        
        let jIndexT = map(j, 0, 1, ...sampleRange, true);
        let jIndex = floor(jIndexT);
        let jIndexNext = jIndex + 1;
        let jIndexOff = jIndexT - jIndex;

        let cellNW = this.heightmap[iIndex][jIndex];
        let cellNE = this.heightmap[iIndexNext][jIndex];
        let cellSW = this.heightmap[iIndex][jIndexNext];
        let cellSE = this.heightmap[iIndexNext][jIndexNext];

        let hN = lerp(cellNW, cellNE, iIndexOff);
        let hS = lerp(cellSW, cellSE, iIndexOff);
        let h = lerp(hN, hS, jIndexOff);

        cellNW = this.gradmap[iIndex][jIndex];
        cellNE = this.gradmap[iIndexNext][jIndex];
        cellSW = this.gradmap[iIndex][jIndexNext];
        cellSE = this.gradmap[iIndexNext][jIndexNext];

        let gxN = lerp(cellNW.gradientX, cellNE.gradientX, iIndexOff);
        let gxS = lerp(cellSW.gradientX, cellSE.gradientX, iIndexOff);
        let gx = lerp(gxN, gxS, jIndexOff);

        let gyN = lerp(cellNW.gradientY, cellNE.gradientY, iIndexOff);
        let gyS = lerp(cellSW.gradientY, cellSE.gradientY, iIndexOff);
        let gy = lerp(gyN, gyS, jIndexOff);

        return {"height": h, "gradientX": gx, "gradientY": gy};
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
        this.updateGradMap()

        push();
        gradFill([0,0],[-this.light.x*width,height], this.bgCol, color(255));
        noStroke();
        rect(-10, -10, width+20, height+20);
        pop();
        yield;

        let horizon = this.renderConfig.horizon;

        // Terrain
        let densX = 0.005 * min(width, height);
        let densY = densX / 3;
        let renderResolutionX = ceil(width/densX);
        let renderResolutionY = ceil(height/densY);
        let subCount = 10;

        let w = width/renderResolutionX * 2;
        
        strokeWeight(width/renderResolutionX);

        let toRender = [];

        for(let i = 0; i < renderResolutionX; i++) {
            let ti = (i/(renderResolutionX-1));

            let tiNext = constrain(((i+1)/(renderResolutionX-1)), 0, 1);

            for(let j = 0; j < renderResolutionY; j++) {
                let tj = (j/(renderResolutionY-1));

                let depthMod = tj / 1.5;
                let remapMin = depthMod/2;
                let remapMax = 1 - depthMod/2;

                let tiRemapped = map(ti, 0, 1, remapMin, remapMax, true);
                let tiNextRemapped = map(tiNext, 0, 1, remapMin, remapMax, true);

                let hAndG = this.sampleMaps(tiRemapped, tj);

                let basePos = [
                    lerp(0, width, ti),
                    lerp(horizon, height + this.renderConfig.yOverflow, tj)
                ];

                let h = hAndG.height * this.renderConfig.maxHeight;
                h *= lerp(0.33, 1, map(tj, 0, 0.33, 0, 1, true));
                let pos = [basePos[0], basePos[1] - h];

                let nextPos = [
                    lerp(0, width, tiNext),
                    lerp(horizon, height + this.renderConfig.yOverflow, tj)
                ];

                let nextHeight = this.sampleMaps(tiNextRemapped, tj).height * this.renderConfig.maxHeight;
                nextHeight *= lerp(0.33, 1, map(tj, 0, 0.33, 0, 1, true));
                nextPos[1] -= nextHeight;
                let dirBetween = atan2(nextPos[1] - pos[1], nextPos[0] - pos[0]);

                toRender.push({"basePos": basePos, "depth": tj, "pos": pos, "w": w, "h": h, "gradientX": hAndG.gradientX, "gradientY": hAndG.gradientY, "surfaceDir": dirBetween});

                stroke(wobbleCol(lerpColor(this.colGrass, this.bgCol, lerp(0, 0.15, 1-tj)), 0.025));
                line(...pos, pos[0], height);
            }
        }

        // Sort by depth
        let maxGradSeen = 0;
        toRender.sort((a, b) => {
            maxGradSeen = max(maxGradSeen, abs(a.gradientX), abs(b.gradientX), abs(a.gradientY), abs(b.gradientY));
            return a.depth - b.depth;
        });

        // print(toRender[0]);

        let skipper = 60;

        let shadowCol = lerpColor(this.bgCol, color(0), 0.75);
        let multedGrass = color(
            red(this.colGrass)*red(shadowCol)/255,
            green(this.colGrass)*green(shadowCol)/255,
            blue(this.colGrass)*blue(shadowCol)/255
        );

        noStroke();
        for(let i = 0; i < toRender.length; i++) {
            let r = toRender[i];

            let gradVec = createVector(r.gradientX, r.gradientY); 
            let lightStrength = gradVec.dot(this.light);

            let c = this.colGrass;

            // Smooth lighting
            let lightT = map(lightStrength, -0.01, 0.015, -1, 1, true);
            if(lightStrength < 0) c = lerpColor(c, multedGrass, (-1*lightT)/2);
            else c = lerpColor(c, color(255), lerp(0, 0.05, lightT));

            // // Original Lighting
            // if(lightStrength < 0) c = lerpColor(c, color(0), 0.50);
            // else c = lerpColor(c, color(255), constrain(lightStrength*2, 0, 1));

            c = lerpColor(c, this.bgCol, lerp(0, 0.175, map(1-r.depth, 0.60, 1, 0, 1, true)));

            let dMod = lerp(0.5, 1.5, r.depth);
            for(let j = 0; j < lerp(1, 2, 1-r.depth)*subCount; j++) {
                let cx = r.pos[0] + r.w/2;
                let cy = r.pos[1];
                let newPos = [
                    cx + random(-1, 1) * r.w,
                    cy + random(-1, 0) * r.w
                ];

                let triLeft = [newPos[0] - random(0.25)*r.w, newPos[1]];
                let triRight = [newPos[0] + random(0.25)*r.w, newPos[1]];
                let norm = (r.surfaceDir - PI/2)+random(-0.1, 0.1)*PI;
                let triTop = [newPos[0] + dMod*cos(norm)*(random(r.w*random(2, 3))), newPos[1] + dMod*sin(norm)*(random(r.w*2))];

                fill(wobbleCol(c, 0.025));
                triangle(...triLeft, ...triRight, ...triTop);
            }

            if(i % skipper == 0) yield;
        }

        yield;
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
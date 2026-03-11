// Day 4: Only black! Use only the color black when drawing. Use blend modes and opacity to your advantage.

let p, renderGenerator;
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
    p = getPalette();

    let c = new Composition();
    renderGenerator = c.render();
    loop();
}

function draw() {
    let nxt = renderGenerator.next();
    if(nxt.done) {
        if(!granulated) {
            granulated = true;
            granulate(9);
        }
        noLoop();
    }
}

class Composition {
    constructor() {
        return;
    }

    *render() {
        // background(240);
        background(p.r());
        yield;

        let sampleRes = 0.0040*min(width, height);
        let countX = ceil(width/sampleRes);
        let countY = ceil(height/sampleRes);

        let aOff = random()*TAU;
        let rRange = [0.0125 * min(width, height), 0.05 * min(width, height)];

        let xNMod = random(1);
        let yNMod = random(1);

        random()>0.5 ? xNMod *= 5 : yNMod *= 5;

        let modulator = ceil(random(2, 5));
        // modulator = 4;
        let modulatorOffset = random(-1, 1)*PI/2;

        // let nDetail = 0.75;
        // nDetail = 0.25;

        let nDetail = random(0.25, 1.5);

        let ptsToDo = [];

        console.log(modulator)
        for(let i = 0.5; i < countX; i++) {
            let ti = i/countX;
            let x = lerp(-0.01*width, 1.01*width, ti);
            for(let j = 0.5; j < countY; j++) {
                let tj = j/countY;
                let y = lerp(-0.01*height, 1.01*height, tj);
                ptsToDo.push([x, y, i, j]);
            }
        }

        let skipper = 25;

        ptsToDo = shuffleArray(ptsToDo);

        for(let ix = 0; ix < ptsToDo.length; ix++) {
            let pt = ptsToDo[ix];
            let x = pt[0];
            let y = pt[1];
            let i = pt[2];
            let j = pt[3];

            let n = noise(x/min(width,height) * nDetail * xNMod, y/min(width,height) * nDetail * yNMod, (i/countX + j/countY));

            let a = aOff + (n * TAU) + PI;

            let nModulatorCheck = (n*100);
            nModulatorCheck = lerp(0, 50, n);
            let modResult = round(nModulatorCheck) % modulator;
            let modT = ((nModulatorCheck%modulator)-2)/(modulator-2);
            modT = -4 * (modT - 0.5) * (modT - 0.5) + 1;

            if(modResult <= 1) continue;

            if(a < modulatorOffset) lerp(a, modulatorOffset, modT);
            else if(a > modulatorOffset) lerp(a, modulatorOffset+PI, modT);
            

            
            let r = lerp(rRange[0], rRange[1], random());
            let rOffAmt = r/16;
            let pa = [x + random(-1,1)*rOffAmt + cos(a)*r/2, y + random(-1,1)*rOffAmt + sin(a)*r/2];
            let pb = [x + random(-1,1)*rOffAmt - cos(a)*r/2, y + random(-1,1)*rOffAmt - sin(a)*r/2];

            scribblyLine(pa, pb, color(0), ((1-modT)**2)*1.5);

            if(ix % skipper == 0) yield;
        }
    }
    
}

function scribblyLine(a, b, col, feather) {
    density = 0.0005 * min(width, height);
    let count = ceil(dist(...a, ...b)/density);
    noStroke();
    for(let i = 0; i < count; i++) {
        let t = i/count;
        let x = lerp(a[0], b[0], t);
        let y = lerp(a[1], b[1], t);
        
        let r = lerp(0.00075*min(width,height), 0.0015*width, random());
        let p = nPoint([x, y], r, 0.01);
        p = rPos(p, feather);

        fill(colTrans(col, random(0.25, 0.75)*255));
        circle(...p, r);
    }
}
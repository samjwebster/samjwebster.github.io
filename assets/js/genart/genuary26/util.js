/* UTILITY */
// var nScale, nStrength;
// function setupUtil(width, height) {
//     nScale = 0.01;
//     nStrength = min(0.01*width, 0.01*height);
// }

function granulate(amount, blur=0, rSeed=false) {
    push();
    if(rSeed) randomSeed(rSeed);

    loadPixels();
    const d = pixelDensity();
    const pixelsCount = 4 * (width * d) * (height * d);
    for (let i = 0; i < pixelsCount; i += 4) {
        const grainAmount = random(-amount, amount);
        pixels[i] = pixels[i] + grainAmount;     // R
        pixels[i+1] = pixels[i+1] + grainAmount; // G
        pixels[i+2] = pixels[i+2] + grainAmount; // B
        pixels[i+3] = pixels[i+3] + grainAmount; // A
    }
    updatePixels();
    if(blur) filter(BLUR, blur);
    pop();
}

function granulateColor(amount, blur=0) {
    loadPixels();
    const d = pixelDensity();
    const pixelsCount = 4 * (width * d) * (height * d);
    for (let i = 0; i < pixelsCount; i += 4) {
        // const grainAmount = random(-amount, amount);
        pixels[i] = pixels[i] + random(-amount, amount);     // R
        pixels[i+1] = pixels[i+1] + random(-amount, amount); // G
        pixels[i+2] = pixels[i+2] + random(-amount, amount); // B
        pixels[i+3] = pixels[i+3] + random(-amount, amount); // A
    }
    updatePixels();
    if(blur) filter(BLUR, blur);
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = floor(random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function linearGradient(sX, sY, eX, eY, colorS, colorE){
    let gradient = drawingContext.createLinearGradient(
         sX, sY, eX, eY
    );
    gradient.addColorStop(0, colorS);
    gradient.addColorStop(1, colorE);
    drawingContext.fillStyle = gradient;
}

function radialGradient(sX, sY, sR, eX, eY, eR, colorS, colorE){
    let gradient = drawingContext.createRadialGradient(
        sX, sY, sR, eX, eY, eR
    );
    gradient.addColorStop(0, colorS);
    gradient.addColorStop(1, colorE);
    drawingContext.fillStyle = gradient;
}

function lerpPos(p1, p2, t) {
    let x = lerp(p1[0], p2[0], t);
    let y = lerp(p1[1], p2[1], t);
    return [x, y];
}

function wobbleColRGB(col, max = 0.1) {
    let rCol = color(round(random(255)), round(random(255)), round(random(255)));
    return lerpColor(col, rCol, random(0.01, max));
}

function wobbleCol(col, max = 0.1) {
    push();
    colorMode(HSB);
    let h = hue(col);
    let s = saturation(col);
    let b = brightness(col);

    let newCol = color(h, s + random(-max, max)*100, b + random(-max, max)*100);
    pop();
    return newCol;
}

function nPoint(point, strength=1, nScale=0.02) {
    let a = lerp(0, 2*PI, noise(point[0]*nScale, point[1]*nScale));
    return [
        point[0] + cos(a)*strength,
        point[1] + sin(a)*strength
    ]
}

function rPoint(point, strength = 1) {
    let a = random(0, 2*PI);
    let x = point[0] + cos(a)*random(strength);
    let y = point[1] + sin(a)*random(strength);
    return [x, y];
}

function rPos(p, r) {
    let a = random(0, 2*PI);
    return [
        p[0] + cos(a)*r,
        p[1] + sin(a)*r
    ];
}


function n(pt) {
    if(pt.length > 0 && pt.length <= 3) {
        pt.map(p => p*nScale);
        return noise(...pt);
    }
    return null;
}

function randomProperty(obj) {
    var keys = Object.keys(obj);
    return obj[keys[keys.length*random()<<0]];
};

// function keyPressed() {
//     if(keyCode == 83) {
//         saveCanvas();
//     }
// }

function lerpVec(v1, v2, t) {
    return createVector(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t));
}

function lerpBez(p1, a1, a2, p2, t) {
    let x = bezierPoint(p1[0], a1[0], a2[0], p2[0], t);
    let y = bezierPoint(p1[1], a1[1], a2[1], p2[1], t);
    return [x, y];
}

function gradFill(start, end, start_col, end_col){
    let gradient = drawingContext.createLinearGradient(
      ...start, ...end
    );
    gradient.addColorStop(0, start_col);
    gradient.addColorStop(1, end_col);
    drawingContext.fillStyle = gradient;
}

function linearStroke(start, end, start_col, end_col){
    let gradient = drawingContext.createLinearGradient(
      ...start, ...end
    );
    gradient.addColorStop(0, start_col);
    gradient.addColorStop(1, end_col);
    drawingContext.strokeStyle = gradient;
}

function colTrans(col, alpha) {
    let c = color(col.levels[0], col.levels[1], col.levels[2], alpha);
    return c;
}

function applyKuwahara() {
    // Kuwahara filter
    frag_path = "../assets/glsl/kuwaharaFragmentShader.glsl";
    vert_path = "../assets/glsl/kuwaharaVertexShader.glsl";

    let shader = loadShader(vert_path, frag_path);

    // uniform int radius;
    // uniform sampler2D inputBuffer;
    // uniform vec4 resolution;
    // uniform sampler2D originalTexture;

    shader.setUniform("radius", 5);
    shader.setUniform("inputBuffer", canvas);
    shader.setUniform("resolution", [width, height, pixelDensity()]);
    shader.setUniform("originalTexture", canvas);

    fill(255);
    quad(-1, -1, 1, -1, 1, 1, -1, 1);


}

function pointInPolygon(point, vertices) {
    const x = point[0]
    const y = point[1]

    let inside = false
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0],
        yi = vertices[i][1]
    const xj = vertices[j][0],
        yj = vertices[j][1]

    const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
    }

    return inside
}

function chaikin(pts, iterations, threshold=0) {
    for (let iter = 0; iter < iterations; iter++) {
        let tmp = [];
        for (let i = 0; i < pts.length-1; i++) {
            let a = pts[i];
            let b = pts[i+1];
            if(dist(...a, ...b) < threshold) continue;
            let q = [0.75*a[0]+0.25*b[0], 0.75*a[1]+0.25*b[1]];
            let r = [0.25*a[0]+0.75*b[0], 0.25*a[1]+0.75*b[1]];
            tmp.push(q);
            tmp.push(r);
        }
        pts = tmp;
    }
    return pts;
}

function lerpPts(pts, t) {
    if (t < 0 || t > 1) {
        console.log("lerpPts: t must be between 0 and 1");
        return null;
    }
    let i = floor(t * (pts.length - 1));
    let i_next = min(i + 1, pts.length - 1);
    let local_t = (t * (pts.length - 1)) - i;
    return lerpPos(pts[i], pts[i_next], local_t);
}

function lerpColors(cols, t) {
    if (t < 0 || t > 1) {
        console.log("lerpColors: t must be between 0 and 1");
        return null;
    }
    let i = floor(t * (cols.length - 1));
    let i_next = min(i + 1, cols.length - 1);
    let local_t = (t * (cols.length - 1)) - i;
    return lerpColor(cols[i], cols[i_next], local_t);
}

function avgCol(cols) {
    push();
    colorMode(RGB);
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for(let c of cols) {
        r += red(c);
        g += green(c);
        b += blue(c);
        a += alpha(c);
    }
    r = r / cols.length;
    g = g / cols.length;
    b = b / cols.length;
    a = a / cols.length;
    pop();
    return color(r, g, b, a);
}

function ptsAB(a, b, step) {
    let pts = [];
    let d = dist(...a, ...b);
    let n = ceil(d/step);
    for (let i = 0; i <= n; i++) {
        pts.push(lerpPos(a, b, i/n));
    }
    return pts;
}


// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {

  // Check if none of the lines are of length 0
	if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
		return false
	}

	let denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

  // Lines are parallel
	if (denominator === 0) {
		return false
	}

	let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
	let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // is the intersection along the segments
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		return false
	}

  // Return a object with the x and y coordinates of the intersection
	let x = x1 + ua * (x2 - x1)
	let y = y1 + ua * (y2 - y1)

	return [x, y]
}

function circPts(x, y, r, step) {
    let pts = [];
    let circum = 2 * PI * r;
    let n = ceil(circum/step);
    for (let i = 0; i < n; i++) {
        let a = map(i, 0, n, 0, TWO_PI);
        let px = x + cos(a)*r;
        let py = y + sin(a)*r;
        pts.push([px, py]);
    }
    return pts;
}
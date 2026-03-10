let p, c, renderGen;
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
    c = new Composition();
    renderGen = c.render();
    loop();
}

function draw() {
    let val = renderGen.next();
    if (val.done) {
        noLoop();
        if(!granulated) {
            granulate(3);
            granulated = true;
        }
    }
}

class Composition {
    constructor() {

        let ctX = 0, ctY = 0;
        while(abs(ctX - ctY) < 2) {
            ctX = floor(random(6, 9));
            ctY = floor(random(6, 9));
        }

        this.padding = random(0.01, 0.025) * min(width, height);

        let cellW = (width - (2 * this.padding)) / ctX;
        let cellH = (height - (2 * this.padding)) / ctY;

        this.cells = [];

        for(let i = 0; i < ctX; i++) {
            let x = this.padding + i * cellW;
            for(let j = 0; j < ctY; j++) {
                let y = this.padding + j * cellH;
                this.cells.push(
                    new Cell(x, y, cellW, cellH, 0.1 * min(cellW, cellH))
                );
            }
        }

        let v = new Voronoi();

        this.layerCt = 6;
        for(let i = 0; i < this.layerCt; i++) {
            let t = i / (this.layerCt - 1);

            
            let bbox = {xl: this.padding, xr: width - this.padding, yt: this.padding, yb: height - this.padding};
            let sites = [];

            for(let cell of this.cells) {
                let site = lerpPos(cell.mp, cell.nmp, t);
                sites.push({x: site[0], y: site[1]});
            }

            let diagram = v.compute(sites, bbox);

            for(let i = 0; i < this.cells.length; i++) {
                let siteEdges = diagram.cells[i].halfedges;
                siteEdges = siteEdges.filter(e => e.edge != null);

                let edges = [];

                let verts = [];

                for(let edge of siteEdges) {
                    let va = edge.edge.va;
                    if(va) verts.push([va.x, va.y]);

                    let vb = edge.edge.vb;
                    if(vb) verts.push([vb.x, vb.y]);

                    edges.push([[va.x, va.y], [vb.x, vb.y]]);

                    // stroke('red');
                    // line(va.x, va.y, vb.x, vb.y);
                }

                try {
                    edges = orderPolygonEdges(edges);
                    verts = edges.map(e => e[0]);
                } catch(e) {
                    verts = [];

                    let firstEdge = edges.shift();
                    verts.push(firstEdge[0]);
                    verts.push(firstEdge[1]);
                    
                    while(edges.length > 0) {
                        let lastVert = verts[verts.length - 1];
                        let foundIdx = -1;
                        for(let j = 0; j < edges.length; j++) {
                            let edge = edges[j];
                            if(dist(lastVert[0], lastVert[1], edge[0][0], edge[0][1]) < 0.01) {
                                verts.push(edge[1]);
                                foundIdx = j;
                                break;
                            }
                            if(dist(lastVert[0], lastVert[1], edge[1][0], edge[1][1]) < 0.01) {
                                verts.push(edge[0]);
                                foundIdx = j;
                                break;
                            }
                        }
                        if(foundIdx === -1) {
                            // console.log('could not find matching edge');
                            break;
                        } else {
                            edges.splice(foundIdx, 1);
                        }
                    }

                    //  
                



                    verts = verts.reverse();

                    console.log('skip', edges, verts)
                    
                }

                

                // console.log(orderPolygonEdges(edges));

                // // Remove duplicates
                // verts = verts.filter((v, idx) => {
                //     for(let j = 0; j < idx; j++) {
                //         let ov = verts[j];
                //         if(dist(v[0], v[1], ov[0], ov[1]) < 0.01) {
                //             return false;
                //         }
                //     }
                //     return true;
                // });

                // Sort points in CW order
                let ctr = [0,0];
                for(let v of verts) {
                    ctr[0] += v[0];
                    ctr[1] += v[1];
                }
                ctr[0] /= verts.length;
                ctr[1] /= verts.length;
                verts.sort((a, b) => {
                    let angleA = atan2(a[1] - ctr[1], a[0] - ctr[0]);
                    let angleB = atan2(b[1] - ctr[1], b[0] - ctr[0]);
                    return angleB - angleA;
                });

                // console.log(verts);

                // verts = verts.reverse();

                verts = populateLine(verts, 0.01 * min(width, height));
                verts = chaikin(verts, 2);                

                this.cells[i].vcells.push(verts);
            }
        }
}

    renderSheet(i, t) {
    

        // Base glow
        drawingContext.filter = 'blur(12px)';
        fill(p.r());

        beginShape();
        vertex(-10, -10);
        vertex(width + 10, -10);
        vertex(width + 10, height + 10);
        vertex(-10, height + 10);

        for(let cell of this.cells) {
            cell.contour(i);
        }

        endShape(CLOSE);



        

        // Solid cover
        drawingContext.filter = 'none';
        fill(lerpColor(this.bgCol, color(220), t));

        beginShape();
        vertex(-10, -10);
        vertex(width + 10, -10);
        vertex(width + 10, height + 10);
        vertex(-10, height + 10);

        // Carve out cell contours
        
        for(let cell of this.cells) {
            cell.contour(i);
        }

        endShape(CLOSE);
    }

    *render() {
        this.bgCol = p.get(0);
        this.glowCol = p.get(1);
        background(lerpColor(this.bgCol, color(220), 1));

        noStroke();
        for(let i = 0; i < this.layerCt-1; i++) {
            let t = i/(this.layerCt - 1);
            this.renderSheet(this.layerCt-i-1, 1-t);
            yield;
        }
    }
}

class Cell {
    constructor(x, y, w, h, r) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.mp = [this.x + this.w/2, this.y + this.h/2];
        this.r = r;

        let n = noise(this.mp[0] * 0.005, this.mp[1] * 0.005);
        let a = n * TAU;
        this.nmp = [
            this.mp[0] + cos(a) * this.w/2,
            this.mp[1] + sin(a) * this.h/2
        ];

        this.vcells = [];
    }

    contour(i) {
        let vcell = this.vcells[i];
       
        if(!vcell) return;

        let mp = [0,0];
        for(let v of vcell) {
            mp[0] += v[0];
            mp[1] += v[1];
        }
        mp[0] /= vcell.length;
        mp[1] /= vcell.length;

        beginContour();

        for(let v of vcell) {

            vertex(...lerpPos(v, mp, 0.1));
        }
        
        endContour();


    }

    debug() {
        fill(255);
        stroke('blue');
        rect(this.x, this.y, this.w, this.h);
    }
}

function orderPolygonEdges(edges) {
    if (!edges || edges.length === 0) return [];

    // Helper to compare points
    const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];

    // Copy so we don't mutate input
    const remaining = edges.map(e => [e[0], e[1]]);
    const ordered = [];

    // Start with the first edge
    let current = remaining.shift();
    ordered.push(current);

    let currentEnd = current[1];

    while (remaining.length > 0) {
        let foundIndex = -1;
        let nextEdge = null;

        for (let i = 0; i < remaining.length; i++) {
        const [p1, p2] = remaining[i];

        if (samePoint(p1, currentEnd)) {
            nextEdge = [p1, p2];
            foundIndex = i;
            break;
        }

        if (samePoint(p2, currentEnd)) {
            // Reverse edge if needed
            nextEdge = [p2, p1];
            foundIndex = i;
            break;
        }
        }

        if (foundIndex === -1) {
            throw new Error("Edges do not form a single closed polygon");
        }

        ordered.push(nextEdge);
        currentEnd = nextEdge[1];
        remaining.splice(foundIndex, 1);
    }

    return ordered;
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
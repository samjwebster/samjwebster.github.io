let renderGen;
let p;
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
    background(lerpColor(p.r(), color(220), 0.8));

    noiseSeed(round(random()*999999));

    let pc = new PackedCircles();

    for(let i = 0; i < 500; i++) {
        pc.findCircles();
    }

    renderGen = pc.render();
    loop();
}



function draw() {
    let result = renderGen.next();
    if(result.done) {
        noLoop();
        if(!granulated) {
            granulate(3);
            granulated = true;
        }
    }


}


class PackedCircles {

    constructor() {
        this.circles = [];
        this.maxCircles = 200;
        this.minRadius = 10;
        this.maxRadius = width;
        this.attemptsPerFrame = 20;

        this.growSpeed = 10;

        this.findCircles();
    }

    findCircles() {
        let attempts = 0;
        while(attempts < this.attemptsPerFrame) {
            let newCircle = this.createCircle();
            if(newCircle) {
                this.circles.push(newCircle);
            }
            attempts++;
        }

        for(let c of this.circles) {
            c.grow(this.growSpeed, this.minRadius, this.maxRadius, this.circles, width, height);
        }
    }

    createCircle() {
        let x = random(width);
        let y = random(height);
        let valid = true;
        for(let c of this.circles) {
            let d = dist(x, y, c.x, c.y);
            if(d < c.radius + this.minRadius) {
                valid = false;
                break;
            }
        }
        if(valid) {
            return new Circle(x, y, this.minRadius);
        } else {
            return null;
        }
    }

    *render() {
        noStroke();
        for(let i = 0; i < this.circles.length; i++) {
            let c = this.circles[i];
            c.render();
            if(i % 100 == 0) {
                yield;
            }
        }
    }

}

class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.growing = true;

        this.cutout_t = random(0.25, 0.75);
    }

    grow(speed, minRadius, maxRadius, circles, width, height) {
        if(!this.growing) return;

        if(this.radius >= maxRadius) {
            this.growing = false;
            return;
        }

        for(let c of circles) {
            if(c === this) continue;
            let d = dist(this.x, this.y, c.x, c.y);
            if(d < this.radius + c.radius + speed) {
                this.growing = false;
                return;
            }
        }

        if(this.x - this.radius <= 0 || this.x + this.radius >= width ||
           this.y - this.radius <= 0 || this.y + this.radius >= height) {
            this.growing = false;
            return;
        }

        this.radius += speed;   
    }

    setup() {
        this.outer_verts = [];
        this.inner_verts = [];

        this.num_verts = 100;

        let aOffset = random() * TAU;

        let nDetail = 0.005;
        let nStrength = 0.005 * min(width, height);

        for(let i = 0; i < this.num_verts; i++) {
            let t = i / this.num_verts;
            let a = t * TAU + aOffset;

            let outer_x = this.x + cos(a) * this.radius;
            let outer_y = this.y + sin(a) * this.radius;

            let outer_n = noise(outer_x * nDetail, outer_y * nDetail);
            let outer_a = outer_n * TAU;
            outer_x += cos(outer_a) * nStrength;
            outer_y += sin(outer_a) * nStrength;

            this.outer_verts.push([outer_x, outer_y]);

            let inner_x = this.x + cos(a) * this.radius * this.cutout_t;
            let inner_y = this.y + sin(a) * this.radius * this.cutout_t;

            let inner_n = noise(inner_x * nDetail, inner_y * nDetail);
            let inner_a = inner_n * TAU;
            inner_x += cos(inner_a) * nStrength;
            inner_y += sin(inner_a) * nStrength;

            this.inner_verts.push([inner_x, inner_y]);
        }

        this.inner_verts.reverse();
    }

    render() {
        this.setup();
        let c = p.r();
        let c_dark = lerpColor(c, color(20), 0.4);

        let gradient = drawingContext.createRadialGradient(
            this.x, this.y, this.radius * this.cutout_t, this.x, this.y, this.radius
        );

        gradient.addColorStop(0, c_dark);
        gradient.addColorStop(0.5, c);
        gradient.addColorStop(1, c_dark);
        drawingContext.fillStyle = gradient;

        beginShape();
        for(let v of this.outer_verts) {
            vertex(v[0], v[1]);
        }
        beginContour();
        for(let v of this.inner_verts) {
            vertex(v[0], v[1]);
        }
        endContour();
        endShape(CLOSE);
    }
}
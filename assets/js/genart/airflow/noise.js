class Noise {
    constructor(detail, layers=1, ydetail=-1, scaleToCanvas=true) {
        this.seed = round(random()*100000000);
        this.detail = detail;
        if(ydetail == -1) {
            ydetail = detail;
        }
        this.ydetail = ydetail;
        this.scaleToCanvas = scaleToCanvas;

        this.layers = [];
        let totalSum = 0;
        for(let i = 0; i < layers; i++) {
            let xShift = random()*10000;
            let yShift = random()*10000;
            let zShift = random()*10000;

            let layerWeight = 0.5 ** i;
            totalSum += layerWeight;

            this.layers.push([
                xShift,
                yShift,
                zShift,
                layerWeight
            ]);
        }

        this.layers.forEach(l => l[3] /= totalSum);
    }

    setSeed() {
        noiseSeed(this.seed);
    }

    n(x=0, y=0, z=0) {
        if(this.scaleToCanvas) {
            x /= width;
            y /= height;
        }

        let n = 0;
        this.layers.forEach((layer) => {
            let xCurr = x + layer[0];
            let yCurr = y + layer[1];
            let zCurr = z + layer[2];
 
            // let l = lerp(-1, 1, adjNoise(xCurr*this.detail, yCurr*this.ydetail, zCurr*this.detail));
            let l = adjNoise(xCurr*this.detail, yCurr*this.ydetail, zCurr*this.detail)
            n += l * layer[3];
        });

        n = map(n, -1, 1, 0, 1);

        return constrain(n, 0, 1);
    }
}
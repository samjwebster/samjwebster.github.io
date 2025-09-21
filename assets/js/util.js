function getWindowDims() {
    return [window.innerWidth, window.innerHeight];
}

function windowResized() {
    // Prevent resize handling on mobile devices
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return;
    }

    let newDims = getWindowDims();
    diffX = prevDims[0] - newDims[0];
    diffY = prevDims[1] - newDims[1];

    resizeCanvas(...newDims);

    prevDims = newDims;

    restart_composition();
}

// Palette class
class Palette {
    constructor(name,level,colors) {
        this.name = name;
        this.level = level;
        this.colors = colors;
        this.size = colors.length;
    }

    getCol(i) {
        return this.colors[i];
    }

    get(i) {
        return this.colors[i];
    }

    getRandomCol() {
        return this.colors[this.getRandomIndex()];
    }

    r() {
        return this.colors[this.getRandomIndex()];
    }

    shuffle() {
        for (var i = this.colors.length - 1; i > 0; i--) {
            var j = floor(random() * (i + 1));
            var temp = this.colors[i];
            this.colors[i] = this.colors[j];
            this.colors[j] = temp;
        }
    }

    getRandomIndex() {
        return floor(random()*this.size);
    }

    makeMonochromatic(amount=0.5, overwrite = true) {
        let focus = floor(random()*this.size);
        if (overwrite == true) {
            for(let i = 0; i < this.size; i++) {
                if(i != focus) this.colors[i] = lerpColor(this.colors[i], this.colors[focus], amount);
            }
            return;
        } 
        // else {
        //     let mono = [];
        //     for(let i = 0; i < p.length; i++) {
        //         if(i != focus) mono.push(lerpColor(this.colors[i], this.colors[focus], amount));
        //         else mono.push(this.colors[i])
        //     }
        //     return mono;
        // }   
    }

    saturate(amount) {
        push();
        colorMode(HSB);
        for(let i = 0; i < this.size; i++) {
            let c = this.colors[i];
            let h = hue(c);
            let s = saturation(c);
            let b = brightness(c);
            this.colors[i] = color(h, amount > 0.5 ? lerp(s, 100, (amount - 0.5) * 2) : lerp(0, s, amount * 2), b);
        }
        pop();
    }
}

// Gets a random color palette from all color banks
function getPalette() {
    let minLevel = Infinity;
    let maxLevel = -1*Infinity;
    let levels = {};


    // Group palettes by their level
    // This can be used for palette rarity
    allPalettes().forEach(p => {
        minLevel = min(minLevel, p.level);
        maxLevel = min(minLevel, p.level);
        if(!levels[p.level]) {
            levels[p.level] = [p];
        } else {
            levels[p.level].push(p);
        }
    });

    // Select a palette from a randomly chosen palette level
    return random(levels[floor(random(minLevel, maxLevel+1))]);
}

// Utility function to draw the colors within a palette over the screen for quick viewing
function drawPalette(p) {
    for(i = 0; i < p.size; i++) {
        let col = p.getCol(i);
        fill(col);
        stroke(col);
        rect(i*(width/p.size), 0, (width/p.size), height);
    }
}

function colTrans(col, alpha) {
    let c = color(col.levels[0], col.levels[1], col.levels[2], alpha);
    return c;
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

// Gets a random bank of palettes
function getPaletteBank() {
    let options = [basicBank, porcelainBank, complimentaryBank, albersBank, bauhausBank];
    let bank = options[floor(random()*options.length)]();
    return bank;
}

// Gets a specific palette by palette name
function getPaletteByName(name) {
    let ps = allPalettes();

    pal = null;
    ps.forEach(p => {
        if (p.name == name) pal = p;
    });
    return pal;
}

// Gets all palettes
function allPalettes() {
    return [...basicBank(), ...porcelainBank(), ...albersBank(), ...bauhausBank(), ...genuaryBank()];
}

// Basic palette bank
function basicBank() {
    return [
        new Palette("wildflower", 1, [ 
            color("#d4afb9"),
            color("#d1cfe2"),
            color("#fcf4dd"),
            color("#ddedea"),
            color("#ffc09f"),
            color("#2b1c2f"),
        ]),
        new Palette("autumn", 1, [ 
            color("#f3bc5f"),
            color("#eca150"),
            color("#563935"),
            color("#b0595f"),
            color("#332331"),
            color("#aaaaaa"),
        ]),
        new Palette("gilded", 1, [
            color("#f2958c"),
            color("#e6fefe"),
            color("#ecdea5"),
            color("#cbaf89"),
            color("#f7fbbd"),
            color("#aaaaaa"),
        ]),
        new Palette("tropics", 1, [
            color("#6cbfa3"),
            color("#9fbfa7"),
            color("#f2d1a2"),
            color("#ff9f88"),
            color("#fb7777"),
            color("#ffdede"),
        ]),
        new Palette("palm", 1, [
            color("#606c38"),
            color("#283618"),
            color("#fefae0"),
            color("#dda15e"),
            color("#bc6c25"),
            color("#ccd5ae"),            
        ]),
        new Palette("grey", 1, [
            color("#3c3c3c"),
            color("#5a5a5a"),
            color("#787878"),
            color("#969696"),
            color("#b4b4b4"),
            color("#d2d2d2"),
        ]),
        new Palette("meteor", 1, [
            color(30),
            color("#003049"),
            color("#370617"),
            color("#3d405b"),
            color("#2b2d42"),
            color("#cad2c5"),
        ]),
        new Palette("mint", 1, [
            color("#1b4332"),
            color("#d8f3dc"),
            color("#95d5b2"),
            color("#52b788"),
            color("#2d6a4f"),
            color("#081c15"),
        ]),
        new Palette("vibrant", 1, [
            color("#f94144"),
            color("#f8961e"),
            color("#f9c74f"),
            color("#43aa8b"),
            color("#277da1"),
            color("#7209b7"),
        ]),
        new Palette("hotrod", 1, [
            color("#0b090a"),
            color("#660708"),
            color("#a4161a"),
            color("#ba181b"),
            color("#e5383b"),
            color("#b1a7a6"),
        ]),
    ];
}

// Porcelain palette bank
function porcelainBank() {
    return [
        new Palette("slate", 1, [
            color("#454349"),
            color("#4b545c"),
            color("#616074"),
            color("#9fa5bd"),
            color("#e8e7ed"),
        ]),
        new Palette("riverbank", 1, [
            color("#06060b"),
            color("#373d4e"),
            color("#3e4f51"),
            color("#844c34"),
            color("#a59b91"),
        ]),
        new Palette("dune", 1, [
            color("#141311"),
            color("#2c2b2c"),
            color("#a8956c"),
            color("#b1aa95"),
            color("#cfc1a6"),
        ]),
        new Palette("heather", 1, [
            color("#4e424a"),
            color("#4c3c69"),
            color("#6b5864"),
            color("#4c5c7c"),
            color("#aab0c5"),
        ]),
        new Palette("bamboo", 1, [
            color("#817a62"),
            color("#9dbf61"),
            color("#c0ca91"),
            color("#ccd4d0"),
            color("#f7edee"),
        ]),
        new Palette("holly", 1, [
            color("#373539"),
            color("#375d4f"),
            color("#bc3e43"),
            color("#749f79"),
            color("#c8a9ab"),
        ]),
        new Palette("peony", 1, [
            color("#671c20"),
            color("#86113a"),
            color("#665441"),
            color("#6b703c"),
            color("#ba3474"),
        ]),
        new Palette("crag", 1, [
            color("#152334"),
            color("#2c3b50"),
            color("#6b403c"),
            color("#885d3e"),
            color("#dde2f1"),
        ]),
        new Palette("meadow", 1, [
            color("#64741c"),
            color("#cc3d5c"),
            color("#c686c7"),
            color("#fac645"),
            color("#d3ccc0"),
        ]),
        new Palette("agate", 1, [
            color("#4f5026"),
            color("#6b4b35"),
            color("#a28077"),
            color("#fcc656"),
            color("#e4d4d3"),
        ])
    ];
}

// Complimentary color palette bank
function complimentaryBank() {
    let pairs = [
        ["aqua-vermillion", color("#1ECBE1"), color("#E1341E")],
        ["cobalt-tangerine", color("#1B84E4"), color("#E47B1B")],
        ["lapis-lemon", color("#211FE0"), color("#DEE01F")],
        ["indigo-lime", color("#5E1FE0"), color("#A1E01F")],
        ["orchid-chartreuse", color("#BF18E7"), color("#40E718")],
        ["mulberry-spring", color("#F10EBC"), color("#0EF143")],
        ["magenta-turquoise", color("#F10E78"), color("#0EF187")],
        ["scarlet-seafoam", color("#F30C3B"), color("#0CF3C4")],
    ];

    let palettes = [];
    push();
    colorMode(HSB);
    pairs.forEach(p => {
        colors = [];
        let pairName = p[0];
        let pairCols = [p[1], p[2]];

        pairCols.forEach(c => {
            let cHue = hue(c);
            let cSat = saturation(c);
            let cBright = brightness(c);

            let cBlack = color(cHue, cSat, lerp(cBright, 255, 0.15));
            let cWhite = color(cHue, cSat, lerp(0, cBright, 0.85));

            colors.push(c);
            colors.push(cBlack);
            colors.push(cWhite);
        });

        palettes.push(new Palette(pairName, 1, colors));
    });
    pop();
    return palettes;
}

function albersBank() {
    return [
        new Palette("albers", 1, [
            color("#942E21"),
            color("#FCEE48"),
            color("#FFFFFE"),
            color("#444444"),
            color("#737882"),
        ]),
    ]
}

function bauhausBank() {
    return [
        new Palette("bauhaus1", 1, [
            color("#DBC053"),
            color("#E45E38"),
            color("#1D3B77"),
            color("#DECDBF"),
            color("#191411"),
        ]),
        new Palette("bauhaus2", 1, [
            color("#FDA31A"),
            color("#BB0202"),
            color("#050E5A"),
            color("#F9E9DB"),
            color("#020405"),
        ]),
        new Palette("bauhaus3", 1, [
            color("#F77040"),
            color("#11213C"),
            color("#FFFFFF"),
            color("#3166D4"),
            color("#FDD9DA"),
        ]),
    ]
}

function genuaryBank() {
    return [
        new Palette("bus_seat", 1, [
            color("#109FF8"),
            color("#FF7E2E"),
            color("#92EF2E"),
            color("#E00156"),
            color("#CEDD34"),
        ]),
    ];
}
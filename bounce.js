let balls = [];
let lines = [];
let ballSize = 15;
let lineWidth = 10;
let timerAmount = 0.25;
let inertia = 0.95; // make this less than 1 for a ball that gradually slows down
let gravity = 0.1;
let lineWasHit = false;

let firstMousePos;
let stretchPos;

let bkCol = '#bbbb77';
let lineCol = '#eecc88';
let ballCol = '#ffeebb';

// set up sound
let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C"];
let scales = [
  [0, 2, 3, 5, 7, 8, 10, 12],
  [0, 2, 4, 5, 7, 9, 11, 12]
];
let octaveSpan = 4;
let transpose = 0;
let minMaj = 0;
let scale = [];
let noteLength = 2;

// remember to generate reverb! (it's in setup)
const reverb = new Tone.Reverb({
  wet: 0.5,
  decay: 26,
  preDelay: 0.01
}).toMaster();
const synth = new Tone.PolySynth({
  polyphony: 4,
  volume: -12,
  voice: Tone.MonoSynth
}).connect(reverb);


function CreateScales() {
  for (let j = 0; j < octaveSpan; j++) {
    var octave = j + 3;
    for (let i = 0; i < 8; i++) {
      scale[i + (j * scales[minMaj].length)] = notes[scales[minMaj][i % scales[minMaj].length] % notes.length] + (octave + Math.floor(i / 7)).toString();
    }
  }
}

function playSound(noteNum) {

  synth.set({
    "oscillator": {
      "type": "fmtriangle"
    },
    "envelope": {
      "attack": 0.02,
      "release": 8,
    },
    "filter": {
      "Q": 0,
      "type": "lowpass",
      "rolloff": -12
    },
    "filterEnvelope": {
      "attack": 0.001,
      "decay": 0.15,
      "release": 3,
      "baseFrequency": 100,
      "octaves": 4
    }

  });
  synth.triggerAttackRelease(scale[noteNum % scale.length], "32n");
}

class bounceLine {
  constructor(lp1, lp2) {
    this.p1 = lp1;
    this.p2 = lp2;
  }

  display(col) {
    stroke(col);
    strokeWeight(lineWidth);
    strokeCap(ROUND);
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);

    this.lineDelta = p5.Vector.sub(this.p2, this.p1);
    this.lineDelta.normalize();
    this.normal = createVector(-this.lineDelta.y, this.lineDelta.x);
    this.intercept = p5.Vector.dot(this.p1, this.normal);

  }

}


class ball {
  constructor(bp1, stretch) {
    this.p1 = bp1;
    this.speed = 1;
    // this.ballVel = p5.Vector.random2D();
    this.ballVel = createVector(0, 0, 0);
    this.ballVel.sub(stretch.mult(0.1));
    this.hasBounced = false;
    this.timer = timerAmount;
  }

  move() {

    this.p1.add(this.ballVel);
    this.ballVel.add(0, gravity, 0);

    this.incidence = p5.Vector.mult(this.ballVel, inertia * -1);
    // this.incidence.normalize();

    //detect line (there must be some better way to do this?)
    for (let i = 0; i < lines.length; i++) {
      if (this.p1.dist(lines[i].p1) + this.p1.dist(lines[i].p2) <= lines[i].p1.dist(lines[i].p2) + 0.35 && !this.hasBounced) {
        this.linePos = this.p1.dist(lines[i].p2);
        this.maxPos = lines[i].p1.dist(lines[i].p2);
        this.note = floor(map(this.linePos, 0, this.maxPos, 0, scale.length));
        playSound(this.note);
        this.hasBounced = true;
        // calculate dot product of incident vector and line
        let dot = this.incidence.dot(lines[i].normal);

        // calculate reflection vector
        // assign reflection vector to direction vector
        this.ballVel.set(
          2 * lines[i].normal.x * dot - this.incidence.x,
          2 * lines[i].normal.y * dot - this.incidence.y,
          0
        );

      }
      // run a timer before bounce can happen again
      if (this.hasBounced) {
        this.timer -= 0.01;
        if (this.timer <= 0) {
          this.hasBounced = false;
          this.timer = timerAmount;
        }
      }
    }


    // detect edges of screen (do I want this?)
    if (this.p1.x > windowWidth) {
      this.p1.x = windowWidth;
      this.ballVel.x *= inertia * -1;
    }

    if (this.p1.x < 0) {
      this.p1.x = 0;
      this.ballVel.x *= inertia * -1;
    }

    if (this.p1.y > windowHeight) {
      this.p1.y = windowHeight;
      this.ballVel.y *= inertia * -1;
      this.ballVel.x *= inertia;
    }

    if (this.p1.y < 0) {
      this.p1.y = 0;
      this.ballVel.y *= inertia * -1;
      this.ballVel.x *= inertia;
    }

  }

  display(num) {
    stroke(ballCol);
    strokeWeight(ballSize);
    strokeCap(ROUND);
    point(this.p1.x, this.p1.y);
    
    // debug text for ball vector
    // noStroke();
    // fill('black');
    // text(this.ballVel.toString(), 10, 10 + num * 10);
  }
}

function mousePressed() {
  firstMousePos = createVector(mouseX, mouseY);
}

function mouseReleased() {
  // let mp = createVector(mouseX, mouseY);
  let stretchVector = stretchPos.sub(firstMousePos);
  let gen = new ball(firstMousePos, stretchVector);
  balls.push(gen);
}

function preload() {
  reverb.generate();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  CreateScales();
  // generate lines
  for (let i = 0; i < 6; i++) {
    let l1 = createVector(random(windowWidth), random(windowHeight));
    let l2 = createVector(random(windowWidth), random(windowHeight));
    let newLine = new bounceLine(l1, l2);
    lines.push(newLine);
  }

}

function draw() {
  background(bkCol);

  // draw balls from ball class
  for (let i = 0; i < balls.length; i++) {
    balls[i].display(i);
    balls[i].move();
  }

  // draw lines from line class
  for (let i = 0; i < lines.length; i++) {
    lines[i].display(lineCol);
  }

  if (mouseIsPressed) {
    stroke(ballCol);
    strokeWeight(ballSize);
    strokeCap(ROUND);
    point(firstMousePos.x, firstMousePos.y);
    stretchPos = createVector(mouseX, mouseY);
    stroke(ballCol);
    strokeWeight(2);
    strokeCap(SQUARE);
    line(stretchPos.x, stretchPos.y, firstMousePos.x, firstMousePos.y);
  }

}

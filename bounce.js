let balls = [];
let lines = [];
let guns = [];
let ballSize = 15;
let lineWidth = 10;
let timerAmount = 0.25;
let inertia = 0.95; // make this less than 1 for a ball that gradually slows down
let gravity = 0.1;
let lineWasHit = false;
let onLinePoint = true;
let preparingBall = false;
let adjustingGun = false;
let adjustingStretch = false;
let dragTimer;
let dragTimerAmount = 0.5;
let pointNum;
let target;

let maxBalls = 10;
let ballFreq = 5;

let firstMousePos;
let stretchPos;

let bkCol;
let lineCol;
let ballCol;

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

// ================================================

function setup() {
  bkCol = color('#bbbb77')
  lineCol = color('#eecc88');
  ballCol = color('#ffeebb');
  createCanvas(windowWidth, windowHeight);
  CreateScales();

  // generate ball firing gun
  let gunPos = createVector(windowWidth * 0.25, windowHeight * 0.5);
  let gunStretch = createVector(windowWidth * 0.25 - 20, windowHeight * 0.5 - 30);
  let gunFreq = 2;
  let gun = new ballGun(gunPos, gunStretch, gunFreq);
  guns.push(gun);

  // generate lines
  for (let i = 0; i < 6; i++) {
    let l1 = createVector(random(windowWidth), random(windowHeight));
    let l2 = createVector(random(windowWidth), random(windowHeight));
    let newLine = new bounceLine(l1, l2);
    lines.push(newLine);
  }

}


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

// ================================================

// ===== BOUNCY LINES =====

class bounceLine {
  constructor(lp1, lp2) {
    this.p1 = lp1;
    this.p2 = lp2;
    this.hit = false;
    this.timer = 1.0;
  }

  display() {
    if (this.hit && this.timer > 0){
      stroke(lerpColor(lineCol, ballCol, this.timer));
      this.timer -= 0.1;
    } else if (this.hit && this.timer < 0) {
      stroke(lineCol);
      this.timer = 1.0;
      this.hit = false;
    } else {
      stroke(lineCol);
    }
    strokeWeight(lineWidth);
    strokeCap(ROUND);
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);

    this.lineDelta = p5.Vector.sub(this.p2, this.p1);
    this.lineDelta.normalize();
    this.normal = createVector(-this.lineDelta.y, this.lineDelta.x);
    this.intercept = p5.Vector.dot(this.p1, this.normal);

    if (mouseOver(this.p1) && !preparingBall && !adjustingGun && !adjustingStretch) {
      stroke('white');
      strokeWeight(ballSize);
      point(this.p1.x, this.p1.y);
      onLinePoint = true;
      pointNum = 1;
      target = this;
    }
    else if (mouseOver(this.p2) && !preparingBall && !adjustingGun && !adjustingStretch) {
      stroke('white');
      strokeWeight(ballSize);
      point(this.p2.x, this.p2.y);
      onLinePoint = true;
      pointNum = 2;
      target = this;
    }
    else if (!mouseIsPressed){
      onLinePoint = false;
      pointNum = 0;
    }

    if(pointNum == 1 && mouseIsPressed && !preparingBall){
      target.p1.x = mouseX;
      target.p1.y = mouseY;
    } else if (pointNum == 2 && mouseIsPressed && !preparingBall){
      target.p2.x = mouseX;
      target.p2.y = mouseY;
    }

  }

}

// ===== BALLZ =====

class ball {
  constructor(bp1, stretch, index) {
    this.p1 = bp1;
    this.speed = 1;
    this.ballVel = createVector(0, 0, 0);
    this.ballVel.sub(stretch.mult(0.1));
    this.hasBounced = false;
    this.timer = timerAmount;
    this.index = index;
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
        lines[i].hit = true;
        lines[i].timer = 1.0;
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
      // old code where it bounces off the bottom
      // this.p1.y = windowHeight;
      // this.ballVel.y *= inertia * -1;
      // this.ballVel.x *= inertia;

      // New code! Now it falls off the bottom and is removed.
      let tempIndex = this.index;
      balls.splice(this.index,1);
      for(let i = balls.length-1; i >= tempIndex; i-- && balls){
        balls[i].index--;
      }

    }


    if (balls.length > maxBalls){
      balls.splice(balls[0],1);
      for(let i = balls.length-1; i>= 0; i-- && balls){
        balls[i].index--;
      }
    }

    if (this.p1.y < 0) {
      this.p1.y = 0;
      this.ballVel.y *= inertia * -1;
      this.ballVel.x *= inertia;
    }

  }

  removeBall(){
    let tempIndex = this.index;
    balls.splice(this.index,1);
    for(let i = balls.length-1; i >=tempIndex; i-- && balls){
      balls[i].index--;
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

// ===== BALL SHOOTER =====

class ballGun {
  constructor(point, stretch, frequency) {
    this.point = point;
    this.stretch = stretch;
    this.frequency = frequency;
    this.timer = frequency;
  }

  display() {

    // draw line between two points
    stroke(ballCol);
    strokeWeight(2);
    line(this.point.x, this.point.y, this.stretch.x, this.stretch.y);

    // draw ball source
    stroke(ballCol);
    strokeWeight(2);
    ellipseMode(CENTER);
    fill(bkCol);
    ellipse(this.point.x, this.point.y, ballSize);
    strokeWeight((this.timer/this.frequency * -1 + 1) * ballSize);
    strokeCap(ROUND);
    point(this.point);

    // draw "stretch" point
    stroke("white");
    strokeWeight (ballSize / 2);
    point(this.stretch);


    if(mouseOver(this.point) && !preparingBall && !adjustingStretch){
      adjustingGun = true;
      stroke('white');
      strokeWeight(ballSize);
      point(this.point.x, this.point.y);
    }

    if (!mouseIsPressed){
      adjustingGun = false;
      adjustingStretch = false;
    }

    if(mouseOver(this.stretch) && !preparingBall){
      adjustingStretch = true;
      stroke('white');
      strokeWeight(ballSize);
      point(this.stretch);
    }

    if(mouseIsPressed && !preparingBall && adjustingGun){
      this.dist = p5.Vector.sub(this.point, this.stretch);
      this.point.x = mouseX;
      this.point.y = mouseY;
      this.stretch = p5.Vector.sub(this.point, this.dist);
    }

    if(mouseIsPressed && !preparingBall && adjustingStretch){
      this.stretch.x = mouseX;
      this.stretch.y = mouseY;
    }

    this.timer -= 0.01;
    if (this.timer <= 0){
      this.shoot();
      this.timer = this.frequency;
    }
  }

  shoot() {
      let stretchVector = p5.Vector.sub(this.stretch, this.point);
      let ballPoint = createVector(this.point.x, this.point.y);
      let index = balls.length;
      let gen = new ball(ballPoint, stretchVector, index);
      balls.push(gen);
  }

}


// ================================================


function mouseOver(point){
  if (mouseX >= point.x - ballSize / 2 && mouseX <= point.x + ballSize / 2 &&
      mouseY >= point.y - ballSize / 2 && mouseY <= point.y + ballSize / 2){
    return true;
  }
  else {
    return false;
  }

}

function mousePressed() {
  if (!onLinePoint) {
    firstMousePos = createVector(mouseX, mouseY);
  }
}

function mouseReleased() {
  preparingBall = false;
  if (!onLinePoint && !adjustingGun && !adjustingStretch) {
    let stretchVector = stretchPos.sub(firstMousePos);
    let index = balls.length;
    let gen = new ball(firstMousePos, stretchVector, index);
    balls.push(gen);
  }
}

function preload() {
  reverb.generate();
}

// ================================================

function draw() {
  background(bkCol);

  // draw balls from ball class
  for (let i = 0; i < balls.length; i++) {
    balls[i].display(i);
    balls[i].move();
  }

  // draw lines from line class
  for (let i = 0; i < lines.length; i++) {
    lines[i].display();
  }

  for (let i = 0; i < guns.length; i++) {
    guns[i].display();
  }

  if (mouseIsPressed && !onLinePoint && !adjustingGun && !adjustingStretch) {
    stroke(ballCol);
    strokeWeight(ballSize);
    strokeCap(ROUND);
    point(firstMousePos.x, firstMousePos.y);
    stretchPos = createVector(mouseX, mouseY);
    stroke(ballCol);
    strokeWeight(2);
    strokeCap(SQUARE);
    line(stretchPos.x, stretchPos.y, firstMousePos.x, firstMousePos.y);
    preparingBall = true;
  }

}

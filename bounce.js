let balls = [];
let lines = [];
let guns = [];
let buttons = [];
let ballSize = 15;
let lineWidth = 10;
let timerAmount = 0.25;
let inertia = 0.95; // make this less than 1 for a ball that gradually slows down
let gravity = 0.1;
let lineWasHit = false;
let onLinePoint = true;
let onMenu = false;
let menuButtonDown = false;
let preparingBall = false;
let adjustingGun = false;
let adjustingStretch = false;
let dragTimer;
let dragTimerAmount = 0.5;
let pointNum;
let target;

let maxBalls = 5;
let ballFreq = 5;

let autoBall = false;

let firstMousePos;
let stretchPos;

let bkCol;
let lineCol;
let buttonOnCol;
let buttonOnClickedCol;
let buttonActiveCol;
let buttonOnActiveCol;
let buttonOnActiveClickedCol;
let buttonTextCol;
let txtSize = 20;
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
  buttonOnCol = color('#d9b570');
  buttonOnClickedCol = color ('#c49e57');
  buttonActiveCol = color ('#af863f');
  buttonOnActiveCol = color ('#9a6f26');
  buttonOnActiveClickedCol = color ('#85580e');
  buttonTextCol = color('#805507')
  ballCol = color('#ffeebb');
  createCanvas(windowWidth, windowHeight);
  CreateScales();

  // generate ball firing gun
  let gunPos = createVector(windowWidth * 0.25, windowHeight * 0.5);
  let gunStretch = createVector(windowWidth * 0.25 - 20, windowHeight * 0.5 + 30);
  let gunFreq = 2;
  let gun = new ballGun(gunPos, gunStretch, gunFreq);
  guns.push(gun);

  // generate lines
  for (let i = 0; i < 6; i++) {
    let l1 = createVector(random(windowWidth), random(windowHeight-80-lineWidth));
    let l2 = createVector(random(windowWidth), random(windowHeight-80-lineWidth));
    let newLine = new bounceLine(l1, l2);
    lines.push(newLine);
  }

  let autoButton = new button(windowWidth*0.5-20,windowHeight-60,40,false,"ø");
  let addBall = new button(windowWidth * 0.25-10, windowHeight - 60,20,null,"+");
  let delBall = new button(windowWidth * 0.25-10, windowHeight - 40,20,null,"-");
  let increaseFreq = new button (windowWidth * 0.75-10, windowHeight - 60, 20, null, "+");
  let decreaseFreq = new button (windowWidth * 0.75-10, windowHeight - 40, 20, null, "-");
  buttons.push(autoButton, addBall, delBall, increaseFreq, decreaseFreq);

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

// ===== BUTTONS =====

class button {
  constructor(x, y, size, active, text) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.text = text;
    this.active = active;
    this.oneshot = false;
  }

  display() {
    this.mouseOver = mouseX >= this.x &&
                     mouseX <= this.x+this.size &&
                     mouseY >= this.y &&
                     mouseY <= this.y+this.size

    noStroke();
    if(this.mouseOver){
      fill(buttonOnCol);
    } else {
      fill(lineCol);
    }
    if(this.mouseOver && mouseIsPressed){
      fill(buttonOnClickedCol);
    }
    if (this.active){
      fill(buttonActiveCol);
    }
    if (this.mouseOver && !mouseIsPressed && this.active){
      fill(buttonOnActiveCol);
    }
    if (this.active && mouseIsPressed && this.mouseOver){
      fill(buttonOnActiveClickedCol);
    }
    rectMode(CORNER);
    rect(this.x, this.y, this.size);

    if(this.mouseOver && mouseIsPressed && !menuButtonDown) {
      menuButtonDown = true;
    }
    if(this.mouseOver && !mouseIsPressed && menuButtonDown){
      if(typeof this.active == "boolean"){
        // make it a toggle switch if bool
        this.active = !this.active;
      }
      if(typeof this.active == "object"){
        this.oneshot = true;
      }
      menuButtonDown = false;
    }
    textSize(this.size);
    fill(buttonTextCol);
    textAlign(CENTER);
    text(this.text, this.x+this.size/2, this.y+this.size*.77);
  }
}

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

    if (mouseOver(this.p1) && !preparingBall && !adjustingGun && !adjustingStretch && !onMenu) {
      stroke('white');
      strokeWeight(ballSize);
      point(this.p1.x, this.p1.y);
      onLinePoint = true;
      pointNum = 1;
      target = this;
    }
    else if (mouseOver(this.p2) && !preparingBall && !adjustingGun && !adjustingStretch && !onMenu) {
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

    if(pointNum == 1 && mouseIsPressed && !preparingBall && !onMenu){
      target.p1.x = mouseX;
      target.p1.y = mouseY;
      if (target.p1.y >= windowHeight - 80 - ballSize/2){
        target.p1.y = windowHeight - 80 - ballSize/2;
      }
    } else if (pointNum == 2 && mouseIsPressed && !preparingBall && !onMenu){
      target.p2.x = mouseX;
      target.p2.y = mouseY;
      if (target.p2.y >= windowHeight - 80 - ballSize/2){
        target.p2.y = windowHeight - 80 - ballSize/2;
      }
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

    if (this.p1.y > windowHeight-80 + ballSize/2) {
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
    strokeWeight(ballSize + 4);
    point(this.point);
    stroke(bkCol);
    strokeWeight(ballSize);
    point(this.point);
    if(buttons[0].active){
      stroke(ballCol);
      strokeWeight((this.timer/ballFreq * -1 + 1) * ballSize);
      strokeCap(ROUND);
      point(this.point);
    }

    // draw "stretch" point
    stroke("white");
    strokeWeight (ballSize / 2);
    point(this.stretch);


    if(mouseOver(this.point) && !preparingBall && !adjustingStretch && !onMenu){
      adjustingGun = true;
      stroke('white');
      strokeWeight(ballSize);
      point(this.point.x, this.point.y);
    }

    if (!mouseIsPressed){
      adjustingGun = false;
      adjustingStretch = false;
    }

    if(mouseOver(this.stretch) && !preparingBall && !onMenu){
      adjustingStretch = true;
      stroke('white');
      strokeWeight(ballSize);
      point(this.stretch);
    }

    if(mouseIsPressed && !preparingBall && adjustingGun && !onMenu){
      this.dist = p5.Vector.sub(this.point, this.stretch);
      this.point.x = mouseX;
      this.point.y = mouseY;
      if(this.point.y >= windowHeight-80-ballSize/2){
        this.point.y = windowHeight-80-ballSize/2;
      }
      this.stretch = p5.Vector.sub(this.point, this.dist);
    }

    if(mouseIsPressed && !preparingBall && adjustingStretch && !onMenu){
      this.stretch.x = mouseX;
      this.stretch.y = mouseY;
    }

    // buttons[0] = auto shoot button
    if(buttons[0].active){
      this.timer -= 0.05;
      if (this.timer <= 0){
        this.shoot();
        this.timer = ballFreq;
      }
    } else {
        this.timer = ballFreq;
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
  if (!onLinePoint && !buttons[0].active) {
    firstMousePos = createVector(mouseX, mouseY);
  }
}

function mouseReleased() {
  preparingBall = false;
  if (!onLinePoint && !adjustingGun && !adjustingStretch && !onMenu && !buttons[0].active) {
    let stretchVector = stretchPos.sub(firstMousePos);
    let index = balls.length;
    let gen = new ball(firstMousePos, stretchVector, index);
    balls.push(gen);
  }
}

function preload() {
  reverb.generate();
}

function drawMenu(){
  noStroke();
  fill(ballCol);
  rectMode(CORNER);
  rect(0, windowHeight - 80, windowWidth, 80);
  // max number of balls
  // auto launch on/off
  // auto launch speed
  if(mouseY>=windowHeight-80){
    onMenu = true;
  } else onMenu = false;

  for(i=0; i<buttons.length; i++){
    buttons[i].display();
  }

  // define add/rem button behaviours
  if(buttons[1].oneshot){
    buttons[1].oneshot = false;
    if(maxBalls < 10){
      maxBalls++;
    }
  }
  if(buttons[2].oneshot){
    buttons[2].oneshot = false;
    if(maxBalls > 1){
      maxBalls--;
    }
  }
  if(buttons[3].oneshot){
    buttons[3].oneshot = false;
    if(ballFreq < 10){
      ballFreq++;
    }
  }
  if(buttons[4].oneshot){
    buttons[4].oneshot = false;
    if(ballFreq > 1){
      ballFreq--;
    }
  }

  fill(buttonOnActiveClickedCol);
  textAlign(LEFT);
  textSize(txtSize+10);
  text("∴", windowWidth * 0.25 + 17, windowHeight - 55 + txtSize);
  textSize(txtSize);
  textAlign(RIGHT);
  text(maxBalls, windowWidth * 0.25 - 20, windowHeight - 54 + txtSize);
  text("∆", windowWidth * 0.75 - 20, windowHeight - 53 + txtSize);
  textAlign(LEFT);
  text(ballFreq, windowWidth * 0.75 + 20, windowHeight - 54 + txtSize);
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

  // manual ball launching
  if (mouseIsPressed && !onLinePoint && !adjustingGun && !adjustingStretch && !onMenu && !buttons[0].active) {
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

  drawMenu();

}

function windowResized() {
  buttons[0].x = windowWidth*0.5-20;
  buttons[0].y = windowHeight-60;
  buttons[1].x = windowWidth * 0.25-10;
  buttons[1].y = windowHeight - 60;
  buttons[2].x = windowWidth * 0.25-10;
  buttons[2].y = windowHeight - 40;
  buttons[3].x = windowWidth * 0.75-10;
  buttons[3].y = windowHeight - 60;
  buttons[4].x = windowWidth * 0.75-10;
  buttons[4].y = windowHeight - 40;
  resizeCanvas (windowWidth, windowHeight);
}

let balls = [];

let lines = [];

let ballSize = 15;

let lineWidth = 10;

let timerAmount = 0.3;

class bounceLine{
  constructor (lp1, lp2){
    this.p1 = lp1;
    this.p2 = lp2;
  }

  display(){
    stroke('black');
    strokeWeight(lineWidth);
    strokeCap(SQUARE);
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    
    this.lineDelta = p5.Vector.sub(this.p2, this.p1);
    this.lineDelta.normalize();
    this.normal = createVector(-this.lineDelta.y, this.lineDelta.x);
    this.intercept = p5.Vector.dot(this.p1, this.normal);
    
  }
  
}


class ball {
  constructor(bp1) {
    this.p1 = bp1;
    this.speed = 1;
    this.ballVel = p5.Vector.random2D();
    this.hasBounced = false;
    this.timer = timerAmount;
  }

  move() {
    // this.p1.y += this.speed;
    // this.speed += 0.1;

    this.p1.add(this.ballVel);

    this.incidence = p5.Vector.mult(this.ballVel, -1);
    this.incidence.normalize();

    //detect lines
    for(let i = 0; i<lines.length; i++){
      if (this.p1.dist(lines[i].p1) + this.p1.dist(lines[i].p2) <= lines[i].p1.dist(lines[i].p2) + 0.25 && !this.hasBounced) {
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
        // this.ballVel.mult(this.speed);

      }
      if(this.hasBounced){
        this.timer -= 0.01;
        if (this.timer <= 0){
          this.hasBounced = false;
          this.timer = timerAmount;
        }
      }
    }


    // detect edges of screen (do I want this?)
    if (this.p1.x > windowWidth) {
      this.p1.x = windowWidth;
      this.ballVel.x *= -1;
    }

    if (this.p1.x < 0) {
      this.p1.x = 0;
      this.ballVel.x *= -1;
    }

    if (this.p1.y > windowHeight) {
      this.p1.y = windowHeight;
      this.ballVel.y *= -1;
    }

    if (this.p1.y < 0) {
      this.p1.y = 0;
      this.ballVel.y *= -1;
    }

  }

  display() {
    stroke('black');
    strokeWeight(ballSize);
    strokeCap(ROUND);
    point(this.p1.x, this.p1.y);
  }
}

function mouseClicked() {
  let mp = createVector(mouseX, mouseY);
  let gen = new ball(mp);
  balls.push(gen);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // generate lines  
  for(let i = 0; i<4; i++){
    let l1 = createVector(random(windowWidth), random(windowHeight));
    let l2 = createVector(random(windowWidth), random(windowHeight));
    let newLine = new bounceLine(l1, l2);
    lines.push(newLine);
  }
}

function draw() {
  background(220);

  // draw balls from ball class
  for (let i = 0; i < balls.length; i++) {
    balls[i].display();
    balls[i].move();
  }

  // draw lines from line class
  for (let i = 0; i < lines.length; i++){
    lines[i].display();
  }
  
}

const VP_DISTANCE = 900;

const BODY_LENGTH = 500;
const BODY_HEIGHT = 200;
const HEAD_LENGTH = 100;
const HEAD_HEIGHT = 125;
const DEPTH = 200;

const AXIS_LENGTH = 200;
const AXIS_WIDTH = 10;
const AXIS_POSITIONING = 150;

const CYLINDER1_LENGTH = 70;
const CYLINDER2_LENGTH = 110;
const CYLINDER3_LENGTH = 30;
const CYLINDER_WIDTH = 20;

const KNEECAP_SIZE = 25;

const WINDOW_POSITIONING = 60;
const WINDOW_HEIGHT = 60;
const WINDOW1_LENGTH = 170;
const WINDOW2_LENGTH = 70;
const WINDOW_DEPTH = 1;

const TIRE_SIZE = 50;
const MAX_ANGLE_TURN = 45;
const MAX_ROTATION_Z = 180;
const MIN_ROTATION_Z = 0;

const PARAB_DIAMETER = 75;
const PARAB_DEPTH = 55;

const GRID_DEPTH = 10;
const GRID_LENGTH = 100;

const SPEED_LIMIT = 10; 
const TIME_INCREASE = 1/60;
const FRICTION = 0.99;
const THRESHOLD = 0.1;
const ACCELERATION_CHANGE = 0.1;

var canvas;
var gl;
var program;
var modLoc;
var colorLoc;

var aspect;
var visualization = false;

var mProjectionLoc, mModelViewLoc;

var matrixStack = [];
var modelView;
var eye = [1, 1, 1];
var up = [0,1,0];
var mod = 0;

var sideAngle = 0;
var armRotationAngleZ = 0;
var armRotationAngleY = 0;

var inMovement = false;
var speed = 0;
var acceleration = 0;
var r = 0;
var vx = 0;
var vz = 0;
var frontofthevan = 0;
var movementX = 0;
var movementZ = 0;
var timePosition = 0;
var timeVelocity = 0;
var speed0 = 0;
var rotationAng = 0;
var variation = 0;

// Stack related operations
function pushMatrix() {
    var m =  mat4(modelView[0], modelView[1],
           modelView[2], modelView[3]);
    matrixStack.push(m);
}

function popMatrix() {
    modelView = matrixStack.pop();
}

// Append transformations to modelView
function multMatrix(m) {
    modelView = mult(modelView, m);
}
function multTranslation(t) {
    modelView = mult(modelView, translate(t));
}
function multScale(s) { 
    modelView = mult(modelView, scalem(s)); 
}
function multRotationX(angle) {
    modelView = mult(modelView, rotateX(angle));
}
function multRotationY(angle) {
    modelView = mult(modelView, rotateY(angle));
}
function multRotationZ(angle) {
    modelView = mult(modelView, rotateZ(angle));
}

function fit_canvas_to_window() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    aspect = canvas.width / canvas.height;
    gl.viewport(0, 0,canvas.width, canvas.height);
}

window.onresize = function () {
    fit_canvas_to_window();
}

window.onload = function() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(document.getElementById('gl-canvas'));
    fit_canvas_to_window();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, 'default-vertex', 'default-fragment');

    gl.useProgram(program);

    mModelViewLoc = gl.getUniformLocation(program, "mModelView");
    mProjectionLoc = gl.getUniformLocation(program, "mProjection");
    modLoc = gl.getUniformLocation(program, "mod");
    colorLoc = gl.getUniformLocation(program, "fcolor")
    
    cubeInit(gl);
    cylinderInit(gl);
    parabInit(gl);
    sphereInit(gl);
    torusInit(gl);
   
    render();
}

window.onkeydown = function(event) {
    var key = String.fromCharCode(event.keyCode);
    switch (key) {
    case '0':
        eye = [VP_DISTANCE, VP_DISTANCE, VP_DISTANCE];
        up = [0,1,0];
    break;
    case '1': //vista topo
        eye = [0, VP_DISTANCE, 0];
        up = [0, 0, -1];
    break;
    case '2': //vista lateral
        eye = [0, 0, VP_DISTANCE];
        up = [0,1,0];
    break;
    case '3': //vista da frente
        eye = [VP_DISTANCE, 0, 0];
        up = [0,1,0];
    break;
    case 'W': //avanco
        //sideAngle = 0;        //removido devido ao bonus
        if (!inMovement) inMovement = true;
        inMovement = true;
        if(speed < SPEED_LIMIT){
            acceleration += ACCELERATION_CHANGE; 
            timeVelocity = 0;
        }     
    break;
    case 'S': //recuo
        //sideAngle = 0;        //removido devido ao bonus
        if (!inMovement) inMovement = true;
        if(speed > -SPEED_LIMIT){
            acceleration -= ACCELERATION_CHANGE; 
            timeVelocity = 0;
        } 
    break;
    case 'A': //esquerda
        if(/*!inMovement && */sideAngle < MAX_ANGLE_TURN) {sideAngle++;}  // condicao removida devido ao bonus
    break;
    case 'D': //direita
        if(/* !inMovement &&*/ sideAngle > -MAX_ANGLE_TURN) {sideAngle--;} // condicao removida devido ao bonus
    break;
    case 'I': //sobe braco
        if(armRotationAngleZ < MAX_ROTATION_Z) {armRotationAngleZ++;}
    break;
    case 'K': //desce braco
        if(armRotationAngleZ > MIN_ROTATION_Z) {armRotationAngleZ--;}
    break;
    case 'J': //roda braco sentido anti-horario
        armRotationAngleY++;
    break;
    case 'L': //roda braco sentido horario
        armRotationAngleY--;
    break;
    case 'F': //mudar modo de visualizacao
        visualization = !this.visualization;
    break;
    case ' ': //mudar cores
        if (mod == 0){
            mod = 1;
        } else{
            mod = 0;
        }
            gl.uniform1i(modLoc, mod);
    break;
    }
    
}

window.onkeyup = function(event) {
    var key = String.fromCharCode(event.keyCode);
    if (key == 'W'){
        acceleration = 0;
    } else if(key == 'S'){
        acceleration = 0;
    }
}

function render() 
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    timePosition += TIME_INCREASE;
    timeVelocity += TIME_INCREASE;
    
    speed *= FRICTION; //atrito
        
    var projection = ortho(-VP_DISTANCE*aspect, VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE, -3*VP_DISTANCE, 3*VP_DISTANCE);
    gl.uniformMatrix4fv(mProjectionLoc, false, flatten(projection));
    modelView = lookAt(eye, [0, 0, 0], up);

    if(speed <= SPEED_LIMIT && speed >= -SPEED_LIMIT){
        speed = speed + acceleration*timeVelocity; // v = v0 + a * t  equacao das velocidades utilizada
        if (speed > SPEED_LIMIT ){
            speed = SPEED_LIMIT;
        } else if(speed < -SPEED_LIMIT){
            speed = -SPEED_LIMIT;
        }
    }

    if (!inMovement) timePosition = 0;
    
    if (Math.abs(speed) > THRESHOLD){ //threshold
        // X = X0 + V0t + 0.5 * at2 //equacao das posicoes original
        //x = x0 + 0.5 * (v0 + v)*t //equacao das posicoes utilizada
        variation = 0.5 * (speed0 + speed)*timePosition;
        //bonus
        //vx - componente x da variancia de deslocamento da carrinha
        //vz - componente z da variancia de deslocamento da carrinha
        r = ((2*AXIS_POSITIONING/*distancia de eixo a eixo*/ + AXIS_LENGTH/2/* tamanho de meio eixo */)/Math.tan(radians(sideAngle)));
        frontofthevan +=(variation*180)/(r * Math.PI);
        vx = variation*Math.cos(radians(-frontofthevan));
        vz = variation*Math.sin(radians(-frontofthevan));
        movementX = movementX + vx; 
        movementZ = movementZ + vz; 
        if (!inMovement) inMovement = true;
    } else{
        if (inMovement) inMovement = false;
    }
    speed0 = speed;

    if(inMovement) rotationAng -= (variation/(TIRE_SIZE/2))*180/Math.PI; 
   
    //faz a grid
    grid();

    multTranslation([movementX, 0, movementZ]); //para movimentar o camiao
    multRotationY(frontofthevan);

    pushMatrix(); //janela frente
    multTranslation([BODY_LENGTH/2, WINDOW_POSITIONING, 0]);
    multScale([WINDOW_DEPTH, WINDOW_HEIGHT, WINDOW1_LENGTH]);
    gl.uniform3f(colorLoc, 0, 0, 0.8);
    cuboid();
    popMatrix();

    pushMatrix();   //janela lado direito
    multTranslation([BODY_LENGTH/2 - 45, WINDOW_POSITIONING, DEPTH/2]); 
        pushMatrix();
        gl.uniform3f(colorLoc, 0, 0, 0.8);
        sideWindow();
        popMatrix();

        //pushMatrix();         // janela lado esquerdo
        multTranslation([0, 0, -DEPTH]); 
        gl.uniform3f(colorLoc, 0, 0, 0.8);
        sideWindow();
        //popMatrix();
    popMatrix();

    pushMatrix(); //ramo corpo (2)
    multScale([BODY_LENGTH, BODY_HEIGHT, DEPTH]); //scale o corpo
    gl.uniform3f(colorLoc, 0.8, 0.8, 0.8);
    cuboid();
    popMatrix(); //fim ramo corpo (2)

    pushMatrix(); //ramo cabeca (3)
    multTranslation([BODY_LENGTH/2 + HEAD_LENGTH/2, - (BODY_HEIGHT - HEAD_HEIGHT)/2, 0]); //meter a cabeca no sitio
    multScale([HEAD_LENGTH, HEAD_HEIGHT, DEPTH]); //scale a cabeca
    gl.uniform3f(colorLoc, 0.8, 0.8, 0.8);
    cuboid();
    popMatrix(); //fim ramo cabeca (3)


    pushMatrix(); // (4)
    
    multTranslation([AXIS_POSITIONING,-BODY_HEIGHT/2,0]); // posiciona rodas da frente

        pushMatrix(); //ramo rodas da frente (6)
        multTranslation([0, 0, AXIS_LENGTH/2]);

            pushMatrix(); //ramo roda esquerda (7)
            multRotationY(sideAngle); // vira a roda para trocar de direcao
            multRotationZ(rotationAng); // faz rodas da frente rodarem quando o carro estiver em andamento
            tire();
            popMatrix(); //fim ramo roda esquerda (7)

            //pushMatrix(); //ramo roda direita (8)
            multTranslation([0, 0, -AXIS_LENGTH]);
            multRotationY(sideAngle); // vira a roda para trocar de direcao
            multRotationZ(rotationAng); // faz rodas da frente rodarem quando o carro estiver em andamento
            tire();
            //popMatrix(); //fim ramo roda direita (8)

        popMatrix(); // fim ramo rodas da frente (6)

            pushMatrix(); // ramo eixo (9)
            multRotationZ(rotationAng); // faz o eixo da frente rodar quando o carro estiver em andamento
            axis();
            popMatrix(); // fim ramo eixo (9)

        //pushMatrix(); //inicio ramo rodas e eixos de tras (10)

        multTranslation([-2*AXIS_POSITIONING, 0, 0]); // posiciona rodas de tras
        multRotationZ(rotationAng); // faz rodas de tras rodarem quando o carro estiver em andamento

            pushMatrix(); //ramo rodas de tras (11)
            multTranslation([0, 0, AXIS_LENGTH/2]);

                pushMatrix(); //ramo roda esquerda (12)
                tire();
                popMatrix(); //fim ramo roda esquerda (12)

                //pushMatrix(); //ramo roda direita (13)
                multTranslation([0, 0, -AXIS_LENGTH]);
                tire();
                //popMatrix(); //fim ramo roda direita (13)

            popMatrix(); // fim ramo rodas de tras (11)
            
            //pushMatrix(); // ramo eixo (14)
            axis();
            //popMatrix(); // fim ramo eixo (14)

        //popMatrix(); // (10)

    popMatrix(); // (4)
    //pushMatrix(); // ramo antena (15)
        multTranslation([-BODY_LENGTH/5,BODY_HEIGHT/2 + CYLINDER1_LENGTH/2,0]); //mete cilindro em cima da carrinha

        pushMatrix(); //ramo cilindro inicio (16)
            multScale([CYLINDER_WIDTH, CYLINDER1_LENGTH, CYLINDER_WIDTH]); //da tamanho ao cilindro
            gl.uniform3f(colorLoc, 0, 0, 0.7);
            cylinder();
        popMatrix(); //fim ramo cilindro inicio (16)
        
        //pushMatrix(); // ramo das rotacoes (17)
            multTranslation([0,CYLINDER1_LENGTH/2 + KNEECAP_SIZE/2, 0]); //move a rotula para cima do cilindro
            multRotationY(armRotationAngleY); //movimenta antena da esquerda para a direita
            multRotationZ(armRotationAngleZ); //movimenta antena de cima para baixo

            pushMatrix(); //ramo da roda (18)
            multScale([KNEECAP_SIZE, KNEECAP_SIZE, KNEECAP_SIZE]); //atribui dimensao a rotula
            gl.uniform3f(colorLoc, 1, 1, 0);
            sphere();
            popMatrix(); //fim ramo da roda (18)

            //pushMatrix(); //ramo da translacao3 (19)
                multTranslation([CYLINDER2_LENGTH/2 + KNEECAP_SIZE/2, 0, 0]);

                pushMatrix(); //ramo cilindro (20)
                multRotationZ(90); 
                multScale([CYLINDER_WIDTH, CYLINDER2_LENGTH, CYLINDER_WIDTH]); //da tamanho ao cilindro
                gl.uniform3f(colorLoc, 0, 0, 0.7);
                cylinder();
                popMatrix(); //fim ramo cilindro (20)

                //pushMatrix(); //ramo translacao4 (21)
                    multTranslation([CYLINDER2_LENGTH/4, CYLINDER_WIDTH/2, 0]); //posiciona cilindro

                    pushMatrix(); //ramo cilindro2 (22)
                    multScale([CYLINDER_WIDTH, CYLINDER3_LENGTH, CYLINDER_WIDTH]); //da tamanho ao cilindro
                    gl.uniform3f(colorLoc, 0.8, 0.8, 0);
                    cylinder();
                    popMatrix(); //fim ramo cilindro2 (22)

                    //pushMatrix(); //ramo paraboloide (23)
                    multTranslation([0, KNEECAP_SIZE/2, 0]);
                    multScale([PARAB_DIAMETER, PARAB_DEPTH, PARAB_DIAMETER]);
                    gl.uniform3f(colorLoc, 1, 1, 0);
                    paraboloid();
                    //popMatrix(); //fim ramo paraboloide (23)

                //popMatrix(); //fim ramo translacao4 (21)

            //popMatrix(); //fim ramo da translacao3 (19)

        //popMatrix(); // fim ramo das rotacoes (17)

    //popMatrix(); //fim do ramo antena (15)
    requestAnimationFrame(render);
}

function sideWindow() {
    multScale([WINDOW2_LENGTH, WINDOW_HEIGHT, WINDOW_DEPTH]);
    cuboid();
}

function cuboid(){
    gl.uniformMatrix4fv(mModelViewLoc,false,flatten(modelView));
    cubeDraw(gl,program, visualization);
}

function tire(){
    multRotationX(90); //mete roda na vertical
    multScale([TIRE_SIZE, TIRE_SIZE, TIRE_SIZE]); //mete roda com dimensoes corretas
    gl.uniformMatrix4fv(mModelViewLoc,false,flatten(modelView));
    gl.uniform3f(colorLoc, 0.2, 0.2, 0.2);
    torusDraw(gl,program, visualization);
}

function axis(){
    multRotationX(90); // mete eixo na horizontal
    multScale([AXIS_WIDTH, AXIS_LENGTH, AXIS_WIDTH]); // mete eixo com dimensoes corretas
    gl.uniform3f(colorLoc, 0.5, 0.5, 0.5);
    cylinder();
}

function cylinder(){
    gl.uniformMatrix4fv(mModelViewLoc,false,flatten(modelView));
    cylinderDraw(gl,program, visualization);
}

function sphere() {
    gl.uniformMatrix4fv(mModelViewLoc,false,flatten(modelView));
    sphereDraw(gl,program, visualization);
}

function paraboloid(){
    gl.uniformMatrix4fv(mModelViewLoc,false,flatten(modelView));
    parabDraw(gl,program, visualization);
}


function grid() {
    for(let i = 0; i < 2*VP_DISTANCE; i+= GRID_LENGTH) {
        for(let j = 0; j < 2*VP_DISTANCE; j+= GRID_LENGTH) {
            pushMatrix();
                multTranslation([-VP_DISTANCE + GRID_LENGTH/2 + i, -(BODY_HEIGHT/2 + TIRE_SIZE/2 + GRID_DEPTH), -VP_DISTANCE + GRID_LENGTH/2 + j]);
                multScale([GRID_LENGTH, GRID_DEPTH, GRID_LENGTH]);
                gl.uniform3f(colorLoc, 0, 0.5, 0);
                cuboid();
            popMatrix();
        }
    }
}
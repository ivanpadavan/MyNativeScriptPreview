import { Button, GridLayout, Label, Page, StackLayout } from '@nativescript/core';
import { Canvas } from '@nativescript/canvas';

// A native WebGL mesh: perspective, depth buffer, per-pixel lighting. No DOM.
const vertex = `
attribute vec3 position;
attribute vec3 normal;
uniform vec2 rotation;
uniform float aspect;
varying mediump vec3 vNormal;
varying mediump vec3 vPosition;
mat3 turn(){
 float a=rotation.x,b=rotation.y;
 mat3 x=mat3(1.,0.,0.,0.,cos(a),sin(a),0.,-sin(a),cos(a));
 mat3 y=mat3(cos(b),0.,-sin(b),0.,1.,0.,sin(b),0.,cos(b));
 return y*x;
}
void main(){
 mat3 r=turn();
 vec3 p=r*position;
 vNormal=r*normal;
 vPosition=p;
 float depth=6.6-p.z;
 gl_Position=vec4(p.x*2.8/aspect,p.y*2.8,depth*1.025-0.405,depth);
}`;
const fragment = `
precision mediump float;
varying mediump vec3 vNormal;
varying mediump vec3 vPosition;
uniform float palette;
void main(){
 vec3 n=normalize(vNormal);
 vec3 view=normalize(vec3(0.,0.,6.6)-vPosition);
 vec3 key=normalize(vec3(-3.,5.,5.));
 vec3 fill=normalize(vec3(4.,-2.,2.));
 float blend=0.5+0.5*sin(vPosition.y*1.3+vPosition.x*0.6);
 vec3 a=mix(vec3(.12,.86,1.),vec3(1.,.33,.16),palette);
 vec3 b=mix(vec3(.67,.24,1.),vec3(1.,.75,.26),palette);
 vec3 base=mix(a,b,blend);
 float diffuse=max(dot(n,key),0.);
 float rim=pow(1.-max(dot(n,view),0.),2.7);
 float spec=pow(max(dot(n,normalize(key+view)),0.),55.);
 vec3 color=base*(.14+.75*diffuse+.22*max(dot(n,fill),0.));
 color+=vec3(.65,.84,1.)*spec*.9+base*rim*.75;
 gl_FragColor=vec4(color,1.);
}`;

function mesh() {
  const out = [];
  const point = (t) => [(1.12 + .38 * Math.cos(3*t))*Math.cos(2*t),
    (1.12 + .38 * Math.cos(3*t))*Math.sin(2*t), .48*Math.sin(3*t)];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = (a) => { const l = Math.hypot(...a); return a.map(v=>v/l); };
  function sample(i,j) {
    const t=i/160*Math.PI*2, s=j/14*Math.PI*2;
    const c=point(t), d=point(t+.0001);
    const tangent=unit(d.map((v,k)=>v-c[k]));
    const b=unit(cross(tangent,[0,0,1])), n=unit(cross(b,tangent));
    const normal=n.map((v,k)=>v*Math.cos(s)+b[k]*Math.sin(s));
    return [...c.map((v,k)=>v+.24*normal[k]),...normal];
  }
  for(let i=0;i<160;i++) for(let j=0;j<14;j++) {
    const a=sample(i,j), b=sample(i+1,j), c=sample(i+1,j+1), d=sample(i,j+1);
    out.push(...a,...b,...c,...a,...c,...d);
  }
  return new Float32Array(out);
}

export function createPage(context) {
  const page = new Page();
  page.actionBarHidden = true;
  page.backgroundColor = '#080b14';
  page.statusBarStyle = 'light';
  const root = new GridLayout();
  root.rows = 'auto,*,auto';
  const header = new StackLayout();
  header.padding = '26 26 0';
  const eyebrow = new Label();
  eyebrow.text = 'INTERACTIVE OBJECT / 001';
  eyebrow.color = '#8c93b0';
  eyebrow.fontSize = 11;
  eyebrow.letterSpacing = .18;
  header.addChild(eyebrow);
  const title = new Label();
  title.text = 'ORBIT';
  title.color = '#f5f4ff';
  title.fontSize = 54;
  title.fontWeight = 'bold';
  header.addChild(title);
  const subtitle = new Label();
  subtitle.text = 'Скульптура из света.';
  subtitle.color = '#9da5be';
  subtitle.fontSize = 16;
  header.addChild(subtitle);
  root.addChild(header);

  const canvas = new Canvas();
  canvas.automationText = 'orbit-canvas';
  GridLayout.setRow(canvas,1);
  root.addChild(canvas);

  const footer = new StackLayout();
  footer.padding = '0 26 24';
  GridLayout.setRow(footer,2);
  const hint = new Label();
  hint.text = 'Вращайте пальцем';
  hint.color = '#8c93b0';
  hint.textAlignment = 'center';
  hint.fontSize = 13;
  hint.marginBottom = 16;
  footer.addChild(hint);
  const actions = new GridLayout();
  actions.columns = '*,*';
  const pause = new Button();
  pause.text = 'Пауза';
  const color = new Button();
  color.text = 'Другой свет';
  for (const button of [pause,color]) {
    button.backgroundColor = '#1b2034';
    button.color = '#d8d6ff';
    button.borderRadius = 15;
    button.height = 50;
    button.fontSize = 14;
  }
  pause.marginRight = 6;
  color.marginLeft = 6;
  GridLayout.setColumn(color,1);
  actions.addChild(pause); actions.addChild(color);
  footer.addChild(actions);
  const badge = new Label();
  badge.text = 'NATIVE WEBGL  ·  4 480 TRIANGLES  ·  OFFLINE';
  badge.color = '#626b86';
  badge.fontSize = 10;
  badge.textAlignment = 'center';
  badge.marginTop = 18;
  footer.addChild(badge);
  root.addChild(footer);
  page.content = root;

  let gl, program, buffer, timer, stopped=false, running=true;
  let pitch=.45, yaw=.2, palette=0, lastX=0, lastY=0;
  let rotationLocation, paletteLocation, aspectLocation;
  let count=0;
  function render() {
    if (!gl || stopped) return;
    if (running) { yaw+=.012; pitch+=.002; }
    gl.useProgram(program);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(8/255,11/255,20/255,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(rotationLocation,pitch,yaw);
    gl.uniform1f(aspectLocation,canvas.width/canvas.height);
    gl.uniform1f(paletteLocation,palette);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  canvas.on('pan',args=>{
    if(args.state===1) { lastX=0; lastY=0; }
    yaw+=(args.deltaX-lastX)*.008;
    pitch+=(args.deltaY-lastY)*.008;
    lastX=args.deltaX; lastY=args.deltaY;
    render();
  });
  pause.on('tap',()=>{running=!running;pause.text=running?'Пауза':'Вращать';});
  color.on('tap',()=>{palette=1-palette;render();});
  canvas.on('ready',()=>{
    if(stopped || timer) return;
    try {
      canvas.width=Math.max(280,Math.round(canvas.getActualSize().width));
      canvas.height=Math.max(280,Math.round(canvas.getActualSize().height));
      gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:true});
      if(!gl) throw new Error('WebGL недоступен');
      const shaders=[];
      function compile(type,source) {
        const shader=gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader,source); gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      }
      program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      for(const shader of shaders) gl.deleteShader(shader);
      gl.useProgram(program);
      const data=mesh(); count=data.length/6;
      buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      for(const [name,offset] of [['position',0],['normal',12]]) {
        const attribute=gl.getAttribLocation(program,name);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,offset);
      }
      rotationLocation=gl.getUniformLocation(program,'rotation');
      paletteLocation=gl.getUniformLocation(program,'palette');
      aspectLocation=gl.getUniformLocation(program,'aspect');
      gl.enable(gl.DEPTH_TEST);
      render();
      timer=setInterval(render,32);
    } catch(error) {
      hint.text=String(error.message||error);
      hint.textWrap=true;
      hint.color='#ff869e';
    }
  });
  context.onDispose(()=>{
    stopped=true;
    if(timer) clearInterval(timer);
    if(gl) { if(buffer) gl.deleteBuffer(buffer); if(program) gl.deleteProgram(program); }
  });
  return page;
}

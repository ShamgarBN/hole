/* Voidling 3D — a chill hole.io-style time killer built from break-apart voxels.
   Three.js (vendored, offline). Everything in the world is made of tiny cubes; as your
   hole's edge passes over a structure you're big enough for, its cubes tumble in one by
   one. Higher tiers are built from chunkier cubes, so the world gets blockier as you grow. */

(() => {
'use strict';
const T = window.THREE;

// ---------- LEVEL LIBRARY ----------
// Each theme = color mood. Shapes are generic voxel forms tinted from `pal`.
// sky/ground/grid set the world colors; pal[] colors the structures; leaf/trunk for trees.
const THEMES = [
  { id:'downtown', name:'Downtown',  emo:'🏙️', sky:0x141b34, ground:0x222d52, grid:0x33406e,
    pal:[0x6f7bdc,0x9aa6e8,0xc7ccf2,0xe05a6a,0xf0a85a,0x5ad0e0], leaf:0x4caf6a, trunk:0x7a5a3a },
  { id:'beach', name:'Beach Day', emo:'🏖️', sky:0x123047, ground:0x1d6a7e, grid:0x2a8aa0,
    pal:[0xffe08a,0xffc14d,0xff8c5a,0x5fd0c0,0x4aa8d0,0xffffff], leaf:0x57c08a, trunk:0x9a7a4a },
  { id:'park', name:'City Park', emo:'🌳', sky:0x15331f, ground:0x214a2b, grid:0x2e6638,
    pal:[0x6fbf5a,0x4ca04a,0xe0d060,0xd0905a,0xa0c060,0xf0f0e0], leaf:0x49b25a, trunk:0x6a4a2a },
  { id:'space', name:'Orbit Station', emo:'🛰️', sky:0x07071a, ground:0x10122e, grid:0x232858,
    pal:[0xd0d6ff,0x9aa6ff,0x7c8cff,0xe0e0e0,0xffd24d,0xff6a6a], leaf:0x8a9aff, trunk:0x5a5a7a },
  { id:'candy', name:'Candy Land', emo:'🍬', sky:0x3a1840, ground:0x52215a, grid:0x6e2e78,
    pal:[0xff8ad0,0xff5aa8,0xffd24d,0x8affd0,0x9a8aff,0xffffff], leaf:0xff8ad0, trunk:0xc06aa0 },
  { id:'farm', name:'Funny Farm', emo:'🚜', sky:0x2a2410, ground:0x4a4018, grid:0x665826,
    pal:[0xe0c060,0xd0a040,0xc06a40,0xe05a4a,0x90b050,0xf0e0c0], leaf:0x8ab050, trunk:0x7a5a30 },
  { id:'winter', name:'Snow Town', emo:'❄️', sky:0x1c2940, ground:0x35496b, grid:0x4a6088,
    pal:[0xffffff,0xd0e0ff,0xa0c0e0,0xe05a5a,0x5ac0d0,0xc0d0e0], leaf:0xe8f0ff, trunk:0x8a98b0 },
  { id:'neon', name:'Neon Nights', emo:'🌃', sky:0x0a0820, ground:0x18103a, grid:0x2e1c66,
    pal:[0xff4dd8,0x4dd0ff,0x9a4dff,0x4dff9a,0xffe04d,0xff5a7a], leaf:0x4dff9a, trunk:0x6a4d9a },
  { id:'jungle', name:'Jungle Ruins', emo:'🐘', sky:0x0e2410, ground:0x1a3a1a, grid:0x265a26,
    pal:[0x6fae4a,0x4c8a3a,0xa0c060,0xc0a070,0x8a9a5a,0xd0c0a0], leaf:0x4fa24a, trunk:0x6a4a2a },
  { id:'office', name:'The Office', emo:'🖇️', sky:0x202024, ground:0x303036, grid:0x44444e,
    pal:[0xc0c0cc,0x9aa0b0,0x6a8ad0,0xe0e0e8,0x70b070,0xd0a050], leaf:0x70b070, trunk:0x8a8a8a },
  { id:'kitchen', name:'Giant Kitchen', emo:'🍳', sky:0x2b2218, ground:0x4a3a26, grid:0x66502e,
    pal:[0xf0e0c0,0xe0c090,0xd0a060,0xe05a4a,0x9ac0d0,0xffffff], leaf:0x9ac0a0, trunk:0x9a7a4a },
  { id:'dino', name:'Dino Valley', emo:'🦕', sky:0x231a10, ground:0x4a371a, grid:0x665026,
    pal:[0x8aae5a,0x6f8a4a,0xc0a070,0xd07a4a,0xa0905a,0xe0c0a0], leaf:0x6fae5a, trunk:0x7a5a30 },
];

// ---------- ENGINE GLOBALS ----------
let renderer, scene, camera, dirLight, ground, gridMesh, holeDisc, holeRing, cubeMesh;
const dummy = new T.Object3D();
const _c = new T.Color();
let boxGeo;

// ---------- STATE ----------
const state = {
  scene:'menu', mode:'zen', theme:null, t:0,
  worldR: 380,
  hole:{ x:0, z:0, r:7, vx:0, vz:0 },
  cubes:[],            // {x,y,z,size,col, gy, landY, state(0 rest/1 fall/2 landed), vy, struct}
  structs:[],          // {cx,cz,groundR,boundR,tier,alive,released,cubeIdx:[]}
  falling:[],          // indices currently falling under gravity
  landed:[],           // indices resting on the ground as debris (re-eaten if hole reaches them)
  cam:{ dist:60, height:90 },
  // floating joystick: anchor = where the finger first landed; cur = current finger pos
  input:{ active:false, ax:0, ay:0, cx:0, cy:0 },
  score:0, eaten:0, timeLeft:120, running:false, raf:0, lastTs:0,
};

const store = {
  best: +(localStorage.getItem('voidling.best')||0),
  save(){ localStorage.setItem('voidling.best', this.best); },
};

function $(id){return document.getElementById(id);}
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- TIERS ----------
// cube size grows with tier -> world gets chunkier as you progress.
const TIER = [
  { cube:1.6,  grow:0.018, pts:1 },  // 0 pebbles/crates
  { cube:2.2,  grow:0.020, pts:1 },  // 1 cars/bushes
  { cube:2.9,  grow:0.024, pts:2 },  // 2 trees/huts
  { cube:3.8,  grow:0.030, pts:3 },  // 3 houses
  { cube:5.0,  grow:0.040, pts:5 },  // 4 towers/landmarks
];
// A structure is edible once it physically fits the hole: its footprint radius must be no larger
// than the hole radius * EAT_MARGIN. Anything bigger blocks the hole like a wall. This keeps the
// rule intuitive — if it looks the hole's size or smaller, you can swallow it.
const EAT_MARGIN = 1.05;
// Eating a cube banks this much area (by tier) into the hole's reserve; the radius eases toward the
// reserve. Because the reserve ONLY advances when a cube is eaten, the hole grows strictly while
// consuming and settles the instant you stop — never on a timer.
const GROW_AREA = [0.6, 0.8, 1.1, 1.5, 2.2];
const GROW_EASE = 4;       // how fast the radius eases to the banked reserve (per second)
const CAP_FRAC  = 0.30;    // hole can grow to this fraction of the arena radius
const MAX_STICK = 78;      // px of finger travel from anchor that maps to full speed
const STICK_VIS = 55;      // px the visual thumb is clamped to

// ---------- VOXEL BUILDERS ----------
// each returns array of {x,y,z (cube-units, y>=0 = stack height), col}
function jit(hex){ _c.setHex(hex); const k=rand(0.86,1.12); return (Math.min(255,(_c.r*k*255))<<16)|(Math.min(255,(_c.g*k*255))<<8)|Math.min(255,(_c.b*k*255)); }
function jc(hex){ _c.setHex(hex); const k=rand(0.86,1.12); _c.r=clamp(_c.r*k,0,1); _c.g=clamp(_c.g*k,0,1); _c.b=clamp(_c.b*k,0,1); return _c.clone(); }

function vbox(w,h,d, shell, hex){
  const out=[]; const ox=(w-1)/2, oz=(d-1)/2;
  for(let x=0;x<w;x++)for(let y=0;y<h;y++)for(let z=0;z<d;z++){
    const edge = x===0||x===w-1||z===0||z===d-1||y===0||y===h-1;
    if(shell && !edge) continue;
    out.push({x:x-ox,y,z:z-oz,col:jc(hex)});
  }
  return out;
}
function vsphere(r, cy, hex, fill){
  const out=[]; const R=Math.ceil(r);
  for(let x=-R;x<=R;x++)for(let y=-R;y<=R;y++)for(let z=-R;z<=R;z++){
    const d=Math.sqrt(x*x+y*y+z*z);
    if(d>r) continue;
    if(!fill && d<r-1.05) continue;
    out.push({x,y:cy+y,z,col:jc(hex)});
  }
  return out;
}
function vrock(hex){
  const out=[]; const n=Math.floor(rand(4,9));
  out.push({x:0,y:0,z:0,col:jc(hex)});
  for(let i=0;i<n;i++) out.push({x:Math.round(rand(-1,1)),y:Math.round(rand(0,1)),z:Math.round(rand(-1,1)),col:jc(hex)});
  return out;
}
function vcar(hex){
  const body=vbox(4,1,2,false,hex);          // chassis
  const cab=vbox(2,1,2,false,hex).map(c=>({x:c.x,y:1,z:c.z,col:c.col})); // cabin
  return body.concat(cab);
}

function makeStruct(tier, theme){
  const pal=theme.pal;
  const pick=()=>pal[Math.floor(Math.random()*pal.length)];
  let cubes, footW, footD;
  if(tier===0){ cubes=vrock(pick()); footW=footD=2; }
  else if(tier===1){
    if(Math.random()<0.5){ cubes=vcar(pick()); footW=4; footD=2; }
    else { cubes=vsphere(rand(1.6,2.2),2, theme.leaf, true).concat(vbox(1,2,1,false,theme.trunk)); footW=footD=4; }
  }
  else if(tier===2){
    const th=Math.floor(rand(3,5)); const cr=rand(2.2,2.8);
    cubes=vbox(1,th,1,false,theme.trunk).concat(vsphere(cr, th+cr-1, theme.leaf, true));
    footW=footD=Math.ceil(cr*2);
  }
  else if(tier===3){
    const w=Math.floor(rand(4,6)), h=Math.floor(rand(5,8)), d=Math.floor(rand(4,6));
    cubes=vbox(w,h,d,true,pick()); footW=w; footD=d;
  }
  else {
    const w=Math.floor(rand(3,5)), h=Math.floor(rand(11,16)), d=Math.floor(rand(3,5));
    cubes=vbox(w,h,d,true,pick()); footW=w; footD=d;
  }
  // groundR = horizontal reach of the cubes that actually touch the ground (y===0). This is what
  // blocks the hole — a thin trunk barely blocks, a wide building base blocks a lot. boundR is the
  // full extent, used only for culling/spacing.
  const cs=TIER[tier].cube;
  let gr=0, br=0;
  for(const c of cubes){
    const horiz=Math.hypot(c.x,c.z); if(horiz>br) br=horiz;
    if(c.y===0){ const m=Math.max(Math.abs(c.x),Math.abs(c.z)); if(m>gr) gr=m; }
  }
  return { cubes, groundR:(gr+0.5)*cs, boundR:(br+0.6)*cs };
}

// ---------- LEVEL BUILD ----------
function buildLevel(theme){
  state.theme=theme;
  state.worldR = 300 + Math.random()*100;
  state.hole={ x:0, z:0, r:7, vx:0, vz:0 };
  state.holeReserve = Math.PI*7*7;   // banked area the radius eases toward
  state.cubes=[]; state.structs=[]; state.falling=[]; state.landed=[];
  state.score=0; state.eaten=0;
  state.timeLeft = state.mode==='timed' ? 120 : Infinity;

  buildWorld(theme);

  // place structures within a cube budget
  const weights=[0.30,0.30,0.22,0.13,0.05];
  const cum=[]; let s=0; for(const w of weights){s+=w;cum.push(s);}
  const CUBE_BUDGET=16000, MAX_STRUCT=260;
  const placed=[];
  let guard=0;
  while(state.cubes.length<CUBE_BUDGET && state.structs.length<MAX_STRUCT && guard++<4000){
    const r=Math.random(); let tier=0; for(let i=0;i<cum.length;i++) if(r<=cum[i]){tier=i;break;}
    const st=makeStruct(tier, theme);
    // find a spot
    let cx,cz,ok=false;
    for(let a=0;a<14;a++){
      const ang=rand(0,Math.PI*2), rad=Math.sqrt(Math.random())*(state.worldR-20-st.boundR);
      cx=Math.cos(ang)*rad; cz=Math.sin(ang)*rad;
      if(Math.hypot(cx,cz) < 26+st.boundR) continue;        // keep spawn area clear
      ok=true;
      for(const p of placed){ if(Math.hypot(cx-p.cx,cz-p.cz) < (st.boundR+p.boundR)*0.6){ok=false;break;} }
      if(ok) break;
    }
    if(!ok) continue;
    const cs=TIER[tier].cube;
    const struct={ cx, cz, groundR:st.groundR, boundR:st.boundR, tier, alive:st.cubes.length, released:false, cubeIdx:[] };
    for(const c of st.cubes){
      const wx=cx + c.x*cs, wy=(c.y+0.5)*cs, wz=cz + c.z*cs;
      const idx=state.cubes.length;
      state.cubes.push({ x:wx,y:wy,z:wz, size:cs, col:c.col, gy:c.y, landY:cs*0.5,
        state:0, vy:0, rx:rand(-1,1),ry:rand(-1,1),rz:rand(-1,1), struct });
      struct.cubeIdx.push(idx);
    }
    state.structs.push(struct);
    placed.push({cx,cz,boundR:st.boundR});
  }

  buildCubeMesh();
  placeHole();
}

function buildWorld(theme){
  scene.background = new T.Color(theme.sky);
  scene.fog = new T.Fog(theme.sky, state.worldR*0.7, state.worldR*1.7);
  renderer.setClearColor(theme.sky, 1);

  if(ground){ scene.remove(ground); ground.geometry.dispose(); ground.material.map&&ground.material.map.dispose(); ground.material.dispose(); }
  // grid texture
  const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d');
  g.fillStyle='#'+theme.ground.toString(16).padStart(6,'0'); g.fillRect(0,0,256,256);
  g.strokeStyle='#'+theme.grid.toString(16).padStart(6,'0'); g.lineWidth=4;
  g.strokeRect(0,0,256,256);
  const tex=new T.CanvasTexture(cv); tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.repeat.set(40,40);
  const gm=new T.Mesh(new T.CircleGeometry(state.worldR,72),
    new T.MeshLambertMaterial({map:tex, color:0xffffff}));
  gm.rotation.x=-Math.PI/2; gm.position.y=0; ground=gm; scene.add(ground);
}

function buildCubeMesh(){
  if(cubeMesh){ scene.remove(cubeMesh); cubeMesh.dispose(); }
  const n=state.cubes.length || 1;
  cubeMesh=new T.InstancedMesh(boxGeo, new T.MeshLambertMaterial({color:0xffffff}), n);
  cubeMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for(let i=0;i<state.cubes.length;i++){
    const c=state.cubes[i];
    dummy.position.set(c.x,c.y,c.z); dummy.rotation.set(0,0,0); dummy.scale.setScalar(c.size*0.96);
    dummy.updateMatrix(); cubeMesh.setMatrixAt(i, dummy.matrix);
    cubeMesh.setColorAt(i, c.col);
  }
  cubeMesh.instanceMatrix.needsUpdate=true;
  if(cubeMesh.instanceColor) cubeMesh.instanceColor.needsUpdate=true;
  scene.add(cubeMesh);
}

function placeHole(){
  holeDisc.scale.setScalar(state.hole.r);
  holeRing.scale.setScalar(state.hole.r);
}

// ---------- INPUT (floating joystick) ----------
function pt(e){ const t=e.touches?e.touches[0]:e; return {x:t.clientX,y:t.clientY}; }
function onDown(e){
  if(state.scene!=='play')return;
  const p=pt(e); const i=state.input;
  i.active=true; i.ax=p.x; i.ay=p.y; i.cx=p.x; i.cy=p.y;   // anchor wherever the finger lands
  showStick(); e.preventDefault();
}
function onMove(e){ if(!state.input.active)return; const p=pt(e); state.input.cx=p.x; state.input.cy=p.y; moveStick(); e.preventDefault(); }
function onUp(){ state.input.active=false; $('stick').classList.add('hidden'); }
function showStick(){
  const i=state.input;
  $('stickBase').style.left=i.ax+'px'; $('stickBase').style.top=i.ay+'px';
  $('stickThumb').style.left=i.ax+'px'; $('stickThumb').style.top=i.ay+'px';
  $('stick').classList.remove('hidden');
}
function moveStick(){
  const i=state.input;
  let dx=i.cx-i.ax, dy=i.cy-i.ay; const d=Math.hypot(dx,dy);
  if(d>STICK_VIS){ dx=dx/d*STICK_VIS; dy=dy/d*STICK_VIS; }
  $('stickThumb').style.left=(i.ax+dx)+'px'; $('stickThumb').style.top=(i.ay+dy)+'px';
}

// ---------- UPDATE ----------
function update(dt){
  const h=state.hole;

  // steering: motion relative to the floating-joystick anchor (where the finger first landed)
  if(state.input.active){
    let dx=state.input.cx - state.input.ax;
    let dy=state.input.cy - state.input.ay;
    const d=Math.hypot(dx,dy);
    if(d>3){
      dx/=d; dy/=d;
      const speed = (90 + Math.min(h.r,45)*1.3) * clamp(d/MAX_STICK,0,1);
      h.vx += (dx*speed - h.vx)*Math.min(1,dt*8);
      h.vz += (dy*speed - h.vz)*Math.min(1,dt*8);
    }
  } else { h.vx*=Math.pow(0.0002,dt); h.vz*=Math.pow(0.0002,dt); }
  h.x += h.vx*dt; h.z += h.vz*dt;

  // arena clamp
  const maxR=state.worldR - h.r*0.5;
  const hd=Math.hypot(h.x,h.z);
  if(hd>maxR){ const a=Math.atan2(h.z,h.x); h.x=Math.cos(a)*maxR; h.z=Math.sin(a)*maxR; h.vx*=0.4; h.vz*=0.4; }

  // growth: ease toward the banked reserve. The reserve only grows when cubes are eaten, so the
  // radius climbs strictly while consuming and settles within a fraction of a second of stopping.
  const capR = state.worldR*CAP_FRAC;
  const targetR = Math.min(Math.sqrt(state.holeReserve/Math.PI), capR);
  if(Math.abs(targetR - h.r) > 0.01) h.r += (targetR - h.r) * Math.min(1, dt*GROW_EASE);

  // Structures: a structure collapses once the hole reaches its ground footprint (and that
  // footprint fits the hole). When it collapses, every cube is released to gravity — no magnetic
  // pull. Structures whose GROUND contact is too wide for the hole act as a wall instead.
  const r2 = h.r*h.r;
  for(const st of state.structs){
    if(st.released || st.alive<=0) continue;
    const ddx=st.cx-h.x, ddz=st.cz-h.z, dc=Math.hypot(ddx,ddz);
    if(dc > h.r + st.boundR + 8) continue;                // far: skip
    if(st.groundR <= h.r*EAT_MARGIN){
      // fits the hole: collapse when the hole's edge touches the ground footprint
      if(dc < h.r + st.groundR*0.5){
        st.released=true;
        for(const idx of st.cubeIdx){ const c=state.cubes[idx]; if(c.state===0){ c.state=1; c.vy=0; state.falling.push(idx); } }
      }
    } else {
      // ground footprint too big to fit: wall the hole off (limited strictly by the hole's size)
      const min=st.groundR + h.r*0.10;
      if(dc < min && dc>0.001){ const push=(min-dc); h.x -= (ddx/dc)*push; h.z -= (ddz/dc)*push; h.vx*=0.4; h.vz*=0.4; }
    }
  }

  // Falling cubes: pure gravity, no horizontal pull. Over the hole -> fall through and get eaten.
  // Over solid ground -> land and remain as debris.
  if(state.falling.length){
    const G=170; let still=[];
    for(const idx of state.falling){
      const c=state.cubes[idx];
      c.vy -= G*dt; c.y += c.vy*dt;
      const dx=c.x-h.x, dz=c.z-h.z; const overHole=(dx*dx+dz*dz) < r2;
      if(overHole){
        if(c.y < -c.size*2){ eatCube(idx); continue; }    // dropped into the hole
      } else if(c.y <= c.landY){
        c.y=c.landY; c.vy=0; c.state=2; state.landed.push(idx);   // came to rest on the ground
        dummy.position.set(c.x,c.y,c.z); dummy.rotation.set(0,0,0); dummy.scale.setScalar(c.size*0.96);
        dummy.updateMatrix(); cubeMesh.setMatrixAt(idx,dummy.matrix); continue;
      }
      dummy.position.set(c.x,c.y,c.z);
      dummy.rotation.set(state.t*c.rx*3, state.t*c.ry*3, state.t*c.rz*3);
      dummy.scale.setScalar(c.size*0.96);
      dummy.updateMatrix(); cubeMesh.setMatrixAt(idx,dummy.matrix);
      still.push(idx);
    }
    state.falling=still;
    cubeMesh.instanceMatrix.needsUpdate=true;
  }

  // Debris on the ground gets vacuumed if the hole later rolls over it.
  if(state.landed.length){
    let keep=[];
    for(const idx of state.landed){
      const c=state.cubes[idx];
      const dx=c.x-h.x, dz=c.z-h.z;
      if(dx*dx+dz*dz < r2){ c.state=1; c.vy=0; state.falling.push(idx); }
      else keep.push(idx);
    }
    state.landed=keep;
  }

  // hole visual
  holeDisc.scale.setScalar(h.r); holeRing.scale.setScalar(h.r);
  holeDisc.position.set(h.x,0.06,h.z); holeRing.position.set(h.x,0.08,h.z);
  holeRing.rotation.z = state.t*0.6;

  // camera follow + pull back as you grow
  const targetDist = 34 + h.r*2.4;
  const targetHt   = 48 + h.r*3.2;
  state.cam.dist += (targetDist-state.cam.dist)*Math.min(1,dt*3);
  state.cam.height += (targetHt-state.cam.height)*Math.min(1,dt*3);
  camera.position.set(h.x, state.cam.height, h.z + state.cam.dist);
  camera.lookAt(h.x, 0, h.z);

  // timer
  if(state.mode==='timed' && isFinite(state.timeLeft)){
    state.timeLeft-=dt; if(state.timeLeft<=0){ state.timeLeft=0; endGame(); }
  }
  updateHud();
}

function eatCube(idx){
  const c=state.cubes[idx];
  c.state=3; c.struct.alive--;   // 3 = consumed
  state.eaten++;
  const ti=clamp(c.struct.tier,0,4);
  state.score += TIER[ti].pts;
  // bank growth into the reserve; the radius eases toward it at a capped rate (see update()).
  state.holeReserve += GROW_AREA[ti];
  // hide instance
  dummy.position.set(0,-9999,0); dummy.scale.setScalar(0.0001); dummy.rotation.set(0,0,0);
  dummy.updateMatrix(); cubeMesh.setMatrixAt(idx,dummy.matrix);
  if(c.size>=3.5 && state.eaten%7===0) bigToast('+'+TIER[4].pts);
}

// ---------- RENDER LOOP ----------
function frame(ts){
  if(!state.running) return;
  const dt=Math.min((ts-state.lastTs)/1000||0, 0.05);
  state.lastTs=ts; state.t+=dt;
  update(dt);
  renderer.render(scene,camera);
  state.raf=requestAnimationFrame(frame);
}

// ---------- HUD ----------
function updateHud(){
  $('scoreVal').textContent=state.score;
  $('sizeVal').textContent=Math.round(state.hole.r/7*10)/10;
  if(state.mode==='timed'){
    const s=Math.max(0,Math.ceil(state.timeLeft));
    $('timeVal').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
    $('timeBox').classList.remove('hidden'); $('timeVal').classList.toggle('low', s<=15);
  } else $('timeBox').classList.add('hidden');
}
let toastTimer=0;
function bigToast(txt){
  const el=$('toast'); el.textContent=txt; el.style.transition='none'; el.style.opacity='1'; el.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  requestAnimationFrame(()=>{ el.style.transition='all .8s ease'; el.style.opacity='0'; el.style.transform='translateX(-50%) translateY(-18px)'; });
}
function showLevelTitle(name){
  const el=$('levelTitle'); el.textContent=name; el.style.transition='none'; el.style.opacity='1';
  requestAnimationFrame(()=>{ el.style.transition='opacity 1.4s ease 0.6s'; el.style.opacity='0'; });
}

// ---------- THREE SETUP ----------
function initThree(){
  const canvas=$('game');
  renderer=new T.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  scene=new T.Scene();
  camera=new T.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.5, 4000);
  scene.add(new T.AmbientLight(0xffffff, 0.72));
  dirLight=new T.DirectionalLight(0xffffff, 0.85); dirLight.position.set(0.5,1,0.35); scene.add(dirLight);
  scene.add(new T.HemisphereLight(0xffffff, 0x223044, 0.25));
  boxGeo=new T.BoxBufferGeometry(1,1,1);

  // hole disc + glowing rim (flat on ground)
  holeDisc=new T.Mesh(new T.CircleGeometry(1,56), new T.MeshBasicMaterial({color:0x05060c}));
  holeDisc.rotation.x=-Math.PI/2; holeDisc.position.y=0.06; holeDisc.renderOrder=2; scene.add(holeDisc);
  const ringGeo=new T.RingGeometry(0.86,1.06,56);
  holeRing=new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:0x8aa0ff, transparent:true, opacity:0.9, side:T.DoubleSide}));
  holeRing.rotation.x=-Math.PI/2; holeRing.position.y=0.08; holeRing.renderOrder=3; scene.add(holeRing);
}
function onResize(){
  if(!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
}

// ---------- SCENE FLOW ----------
function startGame(theme){
  state.mode=state._chosenMode||'zen';
  buildLevel(theme);
  state.scene='play'; state.running=true; state.lastTs=performance.now();
  hideAll(); $('hud').classList.remove('hidden');
  showLevelTitle(theme.name);
  onResize();
  cancelAnimationFrame(state.raf); state.raf=requestAnimationFrame(frame);
}
function endGame(){
  state.running=false; cancelAnimationFrame(state.raf); state.scene='results';
  const isBest=state.score>store.best; if(isBest){ store.best=state.score; store.save(); }
  $('resTitle').textContent=pickPraise();
  $('resLevel').textContent=state.theme.name+(state.mode==='timed'?' · Timed':' · Zen');
  $('resScore').textContent=state.score;
  $('resSize').textContent=Math.round(state.hole.r/7*10)/10+'×';
  $('resEaten').textContent=state.eaten;
  $('resBest').textContent=isBest?'🏆 New best score!':'Best: '+store.best;
  $('bestScore').textContent=store.best;
  hideAll(); $('results').classList.remove('hidden'); $('results').classList.add('fade-in');
}
function pickPraise(){ const p=['Nice run!','Cosmic.','Devoured!','So satisfying.','The void is pleased.','Whole lotta hole.','Time well killed.']; return p[Math.floor(Math.random()*p.length)]; }
function hideAll(){ ['menu','picker','pause','results','hud','stick'].forEach(id=>$(id).classList.add('hidden')); state.input.active=false; }
function toMenu(){ state.running=false; cancelAnimationFrame(state.raf); state.scene='menu'; hideAll(); $('menu').classList.remove('hidden'); $('bestScore').textContent=store.best; }
function randomTheme(){ return THEMES[Math.floor(Math.random()*THEMES.length)]; }

function buildPicker(){
  const grid=$('levelGrid'); grid.innerHTML='';
  for(const th of THEMES){
    const div=document.createElement('div'); div.className='lvl';
    div.innerHTML=`<div class="emo">${th.emo}</div><div class="nm">${th.name}</div>`;
    div.addEventListener('click',()=>startGame(th)); grid.appendChild(div);
  }
}

// ---------- WIRING ----------
function wire(){
  const canvas=$('game');
  canvas.addEventListener('touchstart',onDown,{passive:false});
  canvas.addEventListener('touchmove',onMove,{passive:false});
  canvas.addEventListener('touchend',onUp); canvas.addEventListener('touchcancel',onUp);
  canvas.addEventListener('mousedown',onDown); window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  window.addEventListener('resize',onResize);

  document.querySelectorAll('.chip[data-mode]').forEach(chip=>chip.addEventListener('click',()=>{
    document.querySelectorAll('.chip[data-mode]').forEach(c=>c.classList.remove('on'));
    chip.classList.add('on'); state._chosenMode=chip.dataset.mode;
  }));
  state._chosenMode='zen';

  $('playRandom').addEventListener('click',()=>startGame(randomTheme()));
  $('pickLevel').addEventListener('click',()=>{ buildPicker(); hideAll(); $('picker').classList.remove('hidden'); });
  $('backToMenu').addEventListener('click',toMenu);
  $('pauseBtn').addEventListener('click',()=>{ if(state.scene!=='play')return; state.running=false; cancelAnimationFrame(state.raf); state.scene='pause'; $('pause').classList.remove('hidden'); });
  $('resumeBtn').addEventListener('click',()=>{ $('pause').classList.add('hidden'); state.scene='play'; state.running=true; state.lastTs=performance.now(); state.raf=requestAnimationFrame(frame); });
  $('restartBtn').addEventListener('click',()=>{ $('pause').classList.add('hidden'); startGame(state.theme); });
  $('quitBtn').addEventListener('click',toMenu);
  $('againBtn').addEventListener('click',()=>startGame(state.theme));
  $('nextBtn').addEventListener('click',()=>startGame(randomTheme()));
  $('menuBtn').addEventListener('click',toMenu);

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ if(state.scene==='play'){ state.running=false; cancelAnimationFrame(state.raf); state._wasPlaying=true; } }
    else if(state._wasPlaying && state.scene==='play'){ state._wasPlaying=false; state.running=true; state.lastTs=performance.now(); state.raf=requestAnimationFrame(frame); }
  });

  $('bestScore').textContent=store.best;
}

// boot
initThree();
wire();

})();

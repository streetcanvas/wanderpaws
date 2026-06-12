// =====================================================================
//  Mochi & Latte: Biscuit City — CITY EXPANSION PACK (v3.3.0)
//  Ten outskirt mega-districts that unlock one per real day (three on
//  day one): skyscraper downtown, grand railyard + a FULL railway loop
//  with a moving freight train, ironworks, ring highway, ferris-wheel
//  pier, space launch complex, container terminal, stadium, neon night
//  market and an ancient stone circle. Locked districts appear as 🚧
//  construction sites. Three districts bring brand-new gig types:
//  🏙️ Tower Slalom, 🚛 Freight Run and 🚀 Star Courier.
//  Loaded as a separate module so the core game file stays lean.
// =====================================================================
export function installCityExpansion(ctx){
  const {THREE,scene,mat,box,cyl,sph,grp,makeLabelSprite,addCollider,inRiver,disposeMesh,
    toast,popText,haptic,getSfx,player,cars,peds,makeCar,makeNpc,CAR_TYPES,
    routeTo,GIG_BASE_PAY,GIG_BASE_REP,GIG_HANDLERS,addGigPad,
    gig,gigDone,gigFail,gigHudSet,setGigMarker,LANDMARKS31,addBones}=ctx;

  const CITY_KEY='mochi_city_v1';
  let CITY={startDay:null,seen:0};
  try{ const s=JSON.parse(localStorage.getItem(CITY_KEY)||'null'); if(s) CITY=Object.assign(CITY,s); }catch(e){}
  function citySave(){ try{ localStorage.setItem(CITY_KEY,JSON.stringify(CITY)); }catch(e){} }
  const dayNum=()=>Math.floor(Date.now()/86400000);
  if(CITY.startDay==null){ CITY.startDay=dayNum(); citySave(); }

  // ------------------------------------------------------------------
  //  district registry — order = unlock order (3 on day one, +1/day)
  // ------------------------------------------------------------------
  const zones=[
    {id:'downtown', e:'🏙️', name:'Downtown Heights',   x:225, z:-255, r:26, build:buildDowntown,  gig:'slalom'},
    {id:'railyard', e:'🚂', name:'Grand Railyard',      x:95,  z:285,  r:24, build:buildRailyard,  gig:'freight'},
    {id:'ironworks',e:'🏭', name:'Ironworks District',  x:-95, z:-285, r:24, build:buildIronworks},
    {id:'highway',  e:'🛣️', name:'Ring Highway',        x:0,   z:305,  r:0,  build:buildHighway},
    {id:'pier',     e:'🎡', name:'Boardwalk Pier',      x:-165,z:285,  r:22, build:buildPier},
    {id:'cape',     e:'🚀', name:'Cape Biscuit',        x:-285,z:-150, r:22, build:buildCape,      gig:'orbit'},
    {id:'port',     e:'📦', name:'Container Terminal',  x:285, z:75,   r:22, build:buildPort},
    {id:'stadium',  e:'🏟️', name:'Sunbowl Stadium',     x:285, z:-75,  r:24, build:buildStadium},
    {id:'market',   e:'🌃', name:'Neon Night Market',   x:-285,z:115,  r:20, build:buildMarket},
    {id:'stones',   e:'🗿', name:'Old Stone Circle',    x:-15, z:-320, r:16, build:buildStones},
  ];
  for(const z of zones){ if(inRiver(z.x,z.z)) z.z+=z.z>0?42:-42; z.built=false; z.unlocked=false; z.site=null; }
  const openCount=()=>Math.min(zones.length, 3+Math.max(0,dayNum()-CITY.startDay));

  // ------------------------------------------------------------------
  //  shared little builders
  // ------------------------------------------------------------------
  function tag(z,extraY){ const lab=makeLabelSprite(z.e); lab.position.set(z.x,(extraY||9),z.z); lab.scale.set(2.4,2.4,2.4); scene.add(lab); }
  function buildSite(z){ // 🚧 construction placeholder for locked districts
    const g=grp();
    const sign=box(4.4,2.2,0.25,mat('#e8b94d',{r:0.85})); sign.position.y=2.4; g.add(sign);
    const post1=cyl(0.12,0.12,2.6,6,mat('#3a342d')); post1.position.set(-1.6,1.2,0); g.add(post1);
    const post2=post1.clone(); post2.position.x=1.6; g.add(post2);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,8),mat(i%2?'#e0584a':'#f2efe6',{r:0.85}));
      cone.position.set(Math.cos(a)*6,0.6,Math.sin(a)*6); g.add(cone); }
    const crane=cyl(0.3,0.4,10,6,mat('#e8b94d',{r:0.8})); crane.position.set(3.5,5,3.5); g.add(crane);
    const jib=box(8,0.4,0.4,mat('#e8b94d',{r:0.8})); jib.position.set(6.5,9.8,3.5); g.add(jib);
    g.position.set(z.x,0,z.z); scene.add(g);
    const lab=makeLabelSprite('🚧'); lab.position.set(z.x,5.6,z.z); lab.scale.set(2,2,2); scene.add(lab);
    z.site={g,lab};
  }
  function clearSite(z){ if(!z.site)return; scene.remove(z.site.g); disposeMesh(z.site.g); scene.remove(z.site.lab); z.site=null; }

  // ------------------------------------------------------------------
  //  district builders
  // ------------------------------------------------------------------
  function buildDowntown(z){
    const palette=['#8a93a6','#aab4c6','#6f7a8e','#9aa6ba','#7d8aa0'];
    let k=0;
    for(let gx=-1;gx<=1;gx++) for(let gz=-1;gz<=1;gz++){
      const h=20+((k*7)%23), x=z.x+gx*16, zz=z.z+gz*16;
      const body=box(8,h,8,mat(palette[k%palette.length],{r:0.8})); body.position.set(x,h/2,zz); scene.add(body);
      const win=box(8.15,h*0.78,0.5,mat('#ffe08a',{emissive:'#ffd84d',emissiveIntensity:0.45,r:0.6}));
      win.position.set(x,h*0.5,zz+4.1); scene.add(win);
      const cap=box(5,1.6,5,mat('#5a6374',{r:0.8})); cap.position.set(x,h+0.8,zz); scene.add(cap);
      addCollider(x,zz,6.2); k++;
    }
    tag(z,46);
  }

  // ---- railway: a loop hugging the map edge + a moving freight train ----
  const TRACK_R=332;
  const trackSegs=[ // rectangle loop, clockwise
    {ax:-TRACK_R, az:-TRACK_R, bx: TRACK_R, bz:-TRACK_R},
    {ax: TRACK_R, az:-TRACK_R, bx: TRACK_R, bz: TRACK_R},
    {ax: TRACK_R, az: TRACK_R, bx:-TRACK_R, bz: TRACK_R},
    {ax:-TRACK_R, az: TRACK_R, bx:-TRACK_R, bz:-TRACK_R},
  ];
  let trackLen=0; for(const s of trackSegs){ s.len=Math.hypot(s.bx-s.ax,s.bz-s.az); s.at=trackLen; trackLen+=s.len; }
  function trackPos(t){ t=((t%trackLen)+trackLen)%trackLen;
    for(const s of trackSegs){ if(t<=s.at+s.len){ const f=(t-s.at)/s.len;
      return {x:s.ax+(s.bx-s.ax)*f, z:s.az+(s.bz-s.az)*f, ang:Math.atan2(s.bx-s.ax,s.bz-s.az)}; } }
    const s=trackSegs[0]; return {x:s.ax,z:s.az,ang:0};
  }
  let train=null;
  function buildRails(){
    const railM=mat('#7a8290',{r:0.5,m:0.6});
    for(const s of trackSegs){
      const len=s.len, cx=(s.ax+s.bx)/2, cz=(s.az+s.bz)/2, horiz=Math.abs(s.bx-s.ax)>1;
      for(const off of [-0.9,0.9]){
        const rail=box(horiz?len:0.28,0.22,horiz?0.28:len,railM);
        rail.position.set(cx+(horiz?0:off),0.25,cz+(horiz?off:0)); scene.add(rail);
      }
    }
    const tieGeo=new THREE.BoxGeometry(0.5,0.16,2.6);
    const tieM=mat('#6a5743',{r:0.9});
    const count=Math.floor(trackLen/9);
    const inst=new THREE.InstancedMesh(tieGeo,tieM,count);
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){ const p=trackPos(i*9);
      dummy.position.set(p.x,0.1,p.z); dummy.rotation.y=p.ang; dummy.updateMatrix();
      inst.setMatrixAt(i,dummy.matrix); }
    inst.instanceMatrix.needsUpdate=true; scene.add(inst);
  }
  function makeWagon(col,loco){
    const g=grp();
    const body=box(2.6,2.4,7,mat(col,{r:0.8})); body.position.y=1.7; g.add(body);
    if(loco){ const cab=box(2.7,1.4,2.4,mat('#3a342d',{r:0.8})); cab.position.set(0,3.4,-1.8); g.add(cab);
      const stack=cyl(0.3,0.42,1.4,8,mat('#221d24')); stack.position.set(0,3.7,2.2); g.add(stack);
      const lamp=sph(0.3,mat('#ffe08a',{emissive:'#ffd84d',emissiveIntensity:0.9})); lamp.position.set(0,1.7,3.6); g.add(lamp); }
    for(const dz of [-2.4,2.4]) for(const dx of [-1.1,1.1]){
      const w=cyl(0.55,0.55,0.3,10,mat('#221d24')); w.rotation.z=Math.PI/2; w.position.set(dx,0.55,dz); g.add(w); }
    scene.add(g); return g;
  }
  function buildRailyard(z){
    buildRails();
    const plat=box(26,1.1,6,mat('#cdbfa6',{r:0.85})); plat.position.set(z.x,0.55,z.z+8); scene.add(plat); addCollider(z.x-9,z.z+8,3); addCollider(z.x+9,z.z+8,3);
    const depot=box(15,6.5,11,mat('#b0563f',{r:0.85})); depot.position.set(z.x-4,3.25,z.z-10); scene.add(depot); addCollider(z.x-4,z.z-10,8);
    const roof=box(16,1,12,mat('#6a5743',{r:0.85})); roof.position.set(z.x-4,7,z.z-10); scene.add(roof);
    for(let i=0;i<4;i++){ const w=makeWagon(['#5fa3d9','#e0a35a','#9ed98a','#b07fc0'][i]); w.position.set(z.x+14,0,z.z-14+i*8); addCollider(z.x+14,z.z-14+i*8,2); }
    // two freight trucks ready for the Freight Run gig
    for(let i=0;i<2;i++){ const prof=CAR_TYPES.truck||CAR_TYPES.sedan;
      const pal={type:'truck',name:'Freight Truck',body:i?'#e0a35a':'#8a93a6',roof:'#221d24',hub:'#d9d2c4'};
      const mesh=makeCar(pal); mesh.position.set(z.x-14,0,z.z+2+i*6); scene.add(mesh);
      cars.push({mesh,x:z.x-14,z:z.z+2+i*6,ang:Math.PI/2,speed:0,vx:0,vz:0,bankZ:0,pitchX:0,occupied:false,name:pal.name,type:'truck',phys:prof.phys,snd:prof.snd}); }
    // the moving train
    train={t:0, speed:13, units:[makeWagon('#b0563f',true),makeWagon('#5fa3d9'),makeWagon('#e0a35a'),makeWagon('#9ed98a')]};
    tag(z,12);
  }
  function buildIronworks(z){
    for(let i=0;i<3;i++){
      const x=z.x-16+i*16, h=7+(i%2)*2;
      const hall=box(13,h,10,mat(i%2?'#9a6a52':'#8a93a6',{r:0.85})); hall.position.set(x,h/2,z.z); scene.add(hall); addCollider(x,z.z,7.4);
      const roofl=box(13.4,0.8,10.6,mat('#5a6374',{r:0.85})); roofl.position.set(x,h+0.4,z.z); scene.add(roofl);
    }
    for(let i=0;i<3;i++){ const x=z.x-12+i*12;
      const stack=cyl(1.0,1.5,13+i*1.6,10,mat('#b0563f',{r:0.85})); stack.position.set(x,(13+i*1.6)/2,z.z-8); scene.add(stack); addCollider(x,z.z-8,1.7);
      const puff=sph(1.1,mat('#f2efe6',{transparent:true,opacity:0.55,r:1})); puff.position.set(x,14.5+i*1.6,z.z-8); scene.add(puff);
      smokePuffs.push({m:puff,x,z:z.z-8,y0:14.5+i*1.6,ph:i*2.1}); }
    for(let i=0;i<7;i++){ const x=z.x-14+(i%4)*7, zz=z.z+10+((i/4)|0)*4;
      const crate=box(2.4,2.4,2.4,mat(['#e0a35a','#9ed98a','#cdbfa6'][i%3],{r:0.9})); crate.position.set(x,1.2,zz); scene.add(crate); addCollider(x,zz,1.8); }
    tag(z,18);
  }
  const smokePuffs=[];
  function buildHighway(){
    const HW=305, W=13;
    const roadM=mat('#4a4a52',{r:0.95});
    for(const side of [[0,-HW,2*HW+W,W],[0,HW,2*HW+W,W],[-HW,0,W,2*HW+W],[HW,0,W,2*HW+W]]){
      const strip=box(side[2],0.12,side[3],roadM); strip.position.set(side[0],0.06,side[1]); scene.add(strip);
    }
    // dashed centre lines (instanced)
    const dashGeo=new THREE.BoxGeometry(2.4,0.05,0.4);
    const dashM=mat('#ffe08a',{emissive:'#ffd84d',emissiveIntensity:0.3,r:0.8});
    const per=Math.floor(2*HW/8), inst=new THREE.InstancedMesh(dashGeo,dashM,per*4);
    const dummy=new THREE.Object3D(); let k=0;
    for(let i=0;i<per;i++){ const t=-HW+4+i*8;
      dummy.rotation.y=0;        dummy.position.set(t,0.14,-HW); dummy.updateMatrix(); inst.setMatrixAt(k++,dummy.matrix);
      dummy.position.set(t,0.14, HW); dummy.updateMatrix(); inst.setMatrixAt(k++,dummy.matrix);
      dummy.rotation.y=Math.PI/2; dummy.position.set(-HW,0.14,t); dummy.updateMatrix(); inst.setMatrixAt(k++,dummy.matrix);
      dummy.position.set( HW,0.14,t); dummy.updateMatrix(); inst.setMatrixAt(k++,dummy.matrix); }
    inst.instanceMatrix.needsUpdate=true; scene.add(inst);
    // a few billboards for flavour
    const ads=['#e0584a','#5fa3d9','#e8b94d'];
    for(let i=0;i<3;i++){ const x=-120+i*120;
      const post=cyl(0.3,0.3,7,8,mat('#3a342d')); post.position.set(x,3.5,-HW-9); scene.add(post);
      const bb=box(8,4,0.4,mat(ads[i],{emissive:ads[i],emissiveIntensity:0.25,r:0.8})); bb.position.set(x,8.5,-HW-9); scene.add(bb);
      addCollider(x,-HW-9,1); }
  }
  let ferris=null;
  function buildPier(z){
    const deck=box(30,0.6,9,mat('#b08a5a',{r:0.9})); deck.position.set(z.x,0.3,z.z); scene.add(deck);
    for(let i=0;i<3;i++){ const x=z.x-10+i*10;
      const stall=box(3,2.6,3,mat(['#e0584a','#5fa3d9','#9ed98a'][i],{r:0.85})); stall.position.set(x,1.6,z.z+2.4); scene.add(stall); addCollider(x,z.z+2.4,2.2);
      const awn=box(3.6,0.3,3.6,mat('#f2efe6',{r:0.85})); awn.position.set(x,3.1,z.z+2.4); scene.add(awn); }
    // the ferris wheel (animated)
    const base=grp(); base.position.set(z.x+9,0,z.z-4);
    const legM=mat('#5a6374',{r:0.8});
    const l1=cyl(0.35,0.45,9,8,legM); l1.position.set(-2.2,4.5,0); l1.rotation.z=0.25; base.add(l1);
    const l2=cyl(0.35,0.45,9,8,legM); l2.position.set(2.2,4.5,0); l2.rotation.z=-0.25; base.add(l2);
    const wheel=grp(); wheel.position.y=9;
    const rim=new THREE.Mesh(new THREE.TorusGeometry(6.4,0.22,10,28),mat('#e0584a',{r:0.7})); wheel.add(rim);
    const cabins=[];
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
      const spoke=box(0.16,6.3,0.16,mat('#f2efe6',{r:0.8})); spoke.position.set(Math.cos(a)*3.2,Math.sin(a)*3.2,0); spoke.rotation.z=a+Math.PI/2; wheel.add(spoke);
      const cab=box(1.3,1.1,1.1,mat(['#e8b94d','#5fa3d9','#9ed98a','#f2a6c0'][i%4],{r:0.8}));
      cab.position.set(Math.cos(a)*6.4,Math.sin(a)*6.4,0); wheel.add(cab); cabins.push(cab); }
    base.add(wheel); base.rotation.y=Math.PI/2; scene.add(base);
    addCollider(z.x+9,z.z-4,3.4);
    ferris={wheel,cabins};
    tag(z,16);
  }
  let capeZ=null;
  function buildCape(z){
    capeZ=z;
    const pad=cyl(8,8.6,0.7,18,mat('#8a93a6',{r:0.9})); pad.position.set(z.x,0.35,z.z); scene.add(pad);
    const rocket=grp();
    const bodyR=cyl(1.7,1.7,12,14,mat('#f2efe6',{r:0.6})); bodyR.position.y=6.7; rocket.add(bodyR);
    const nose=new THREE.Mesh(new THREE.ConeGeometry(1.7,3.4,14),mat('#e0584a',{r:0.6})); nose.position.y=14.4; rocket.add(nose);
    const band=cyl(1.74,1.74,1.4,14,mat('#5fa3d9',{r:0.6})); band.position.y=9.6; rocket.add(band);
    for(let i=0;i<3;i++){ const a=i/3*Math.PI*2;
      const fin=box(0.3,2.6,1.8,mat('#e0584a',{r:0.7})); fin.position.set(Math.cos(a)*1.9,1.9,Math.sin(a)*1.9); fin.rotation.y=-a; rocket.add(fin); }
    rocket.position.set(z.x,0.7,z.z); scene.add(rocket); addCollider(z.x,z.z,2.6);
    const gantry=box(1.6,17,1.6,mat('#b0563f',{r:0.85})); gantry.position.set(z.x+4.5,9.2,z.z); scene.add(gantry); addCollider(z.x+4.5,z.z,1.4);
    const arm=box(3.4,0.5,0.5,mat('#b0563f',{r:0.85})); arm.position.set(z.x+2.7,14,z.z); scene.add(arm);
    const dome=sph(5,mat('#cdbfa6',{r:0.8})); dome.scale.y=0.55; dome.position.set(z.x-12,0,z.z+10); scene.add(dome); addCollider(z.x-12,z.z+10,5.2);
    // the orbital ring the Star Courier gig flies through
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10,0.5,10,30),mat('#9ad4e8',{emissive:'#9ad4e8',emissiveIntensity:0.7,transparent:true,opacity:0.55}));
    ring.rotation.x=Math.PI/2; ring.position.set(z.x,100,z.z); scene.add(ring);
    tag(z,20);
  }
  function buildPort(z){
    const colors=['#e0584a','#5fa3d9','#9ed98a','#e8b94d','#b07fc0'];
    let k=0;
    for(let row=0;row<3;row++) for(let col=0;col<3;col++){
      const x=z.x-12+col*12, zz=z.z-8+row*8, stack=1+((k*5)%3);
      for(let s=0;s<stack;s++){ const c=box(9,2.6,3.4,mat(colors[(k+s)%colors.length],{r:0.85}));
        c.position.set(x,1.3+s*2.6,zz); scene.add(c); }
      addCollider(x,zz,4.6); k++;
    }
    for(let i=0;i<2;i++){ const x=z.x-10+i*22;
      const legA=box(0.9,14,0.9,mat('#e8b94d',{r:0.85})); legA.position.set(x,7,z.z+14); scene.add(legA);
      const legB=legA.clone(); legB.position.z=z.z+20; scene.add(legB);
      const beam=box(0.9,0.9,18,mat('#e8b94d',{r:0.85})); beam.position.set(x,14,z.z+11); scene.add(beam);
      addCollider(x,z.z+14,1.2); addCollider(x,z.z+20,1.2); }
    tag(z,18);
  }
  function buildStadium(z){
    const segs=16, rx=22, rz=16;
    for(let i=0;i<segs;i++){ const a=i/segs*Math.PI*2;
      const x=z.x+Math.cos(a)*rx, zz=z.z+Math.sin(a)*rz;
      const wall=box(8,6,2.4,mat(i%2?'#cdbfa6':'#b0563f',{r:0.85}));
      wall.position.set(x,3,zz); wall.rotation.y=-a; scene.add(wall);
      if(i%2===0) addCollider(x,zz,3.4); }
    const field=cyl(13,13,0.15,24,mat('#7fb86a',{r:1})); field.position.set(z.x,0.08,z.z); scene.add(field);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+Math.PI/4;
      const x=z.x+Math.cos(a)*(rx+5), zz=z.z+Math.sin(a)*(rz+5);
      const pole=cyl(0.35,0.45,13,8,mat('#5a6374',{r:0.8})); pole.position.set(x,6.5,zz); scene.add(pole);
      const light=box(2.6,1.4,0.5,mat('#ffe08a',{emissive:'#ffd84d',emissiveIntensity:0.8,r:0.6}));
      light.position.set(x,13.4,zz); light.lookAt(z.x,2,z.z); scene.add(light); addCollider(x,zz,0.8); }
    tag(z,18);
  }
  function buildMarket(z){
    const neon=['#ff6ea0','#5fd9d0','#ffd84d','#b07fc0','#9ed98a','#5fa3d9'];
    for(let i=0;i<6;i++){ const x=z.x-12+(i%3)*12, zz=z.z-5+((i/3)|0)*11;
      const stall=box(5,3,4,mat('#3a342d',{r:0.85})); stall.position.set(x,1.8,zz); scene.add(stall); addCollider(x,zz,3.2);
      const sign=box(4.4,1.1,0.3,mat(neon[i],{emissive:neon[i],emissiveIntensity:0.85,r:0.5})); sign.position.set(x,3.9,zz+2.1); scene.add(sign);
      const awn=box(5.6,0.25,5,mat(neon[(i+3)%6],{r:0.85})); awn.position.set(x,3.3,zz); scene.add(awn); }
    const archL=cyl(0.4,0.4,6.5,8,mat('#b0563f')); archL.position.set(z.x-4,3.2,z.z+12); scene.add(archL); addCollider(z.x-4,z.z+12,0.8);
    const archR=archL.clone(); archR.position.x=z.x+4; scene.add(archR); addCollider(z.x+4,z.z+12,0.8);
    const archT=box(9.4,1.2,0.6,mat('#e0584a',{emissive:'#e0584a',emissiveIntensity:0.4,r:0.7})); archT.position.set(z.x,6.7,z.z+12); scene.add(archT);
    // a couple of night-market regulars
    for(let i=0;i<3;i++){ const kinds=['man','cat','fisher'];
      const m=makeNpc(kinds[i]); const x=z.x-8+i*8, zz=z.z+4; m.position.set(x,0,zz); scene.add(m);
      peds.push({mesh:m,x,z:zz,ang:Math.random()*7,speed:0.6,turnT:1,phase:i,kvx:0,kvz:0,kvy:0,ky:0,ktumble:0,knocked:0}); }
    tag(z,12);
  }
  function buildStones(z){
    for(let i=0;i<9;i++){ const a=i/9*Math.PI*2;
      const x=z.x+Math.cos(a)*12, zz=z.z+Math.sin(a)*12;
      const m=box(2,5.5+(i%3),1.3,mat('#9aa0a6',{r:0.95}));
      m.position.set(x,(5.5+(i%3))/2,zz); m.rotation.y=a; m.rotation.z=(i%2?0.06:-0.06); scene.add(m); addCollider(x,zz,1.6); }
    const slab=box(4.5,0.9,3,mat('#8a9096',{r:0.95})); slab.position.set(z.x,0.45,z.z); scene.add(slab); addCollider(z.x,z.z,2.6);
    tag(z,10);
  }

  // ------------------------------------------------------------------
  //  NEW GIGS shipped by districts
  // ------------------------------------------------------------------
  const dt0=zones[0], rl0=zones[1], cp0=zones.find(z=>z.id==='cape');
  const slalomDef={ id:'slalom', icon:'🏙️', name:'Tower Slalom', col:'#8a93a6', x:dt0.x-28, z:dt0.z, noSnap:true, needs:'car',
    desc:'Six tight gates threaded between the towers. Drift or die trying (gently).', tip:'Bring a nimble car onto the pad' };
  const freightDef={ id:'freight', icon:'🚛', name:'Freight Run', col:'#e0a35a', x:rl0.x-22, z:rl0.z+10, noSnap:true, needs:'car',
    desc:'Three heavy crates, three industrial doorsteps across the outskirts. Long hauls, big pay.', tip:'Grab a truck from the yard' };
  const orbitDef={ id:'orbit', icon:'🚀', name:'Star Courier', col:'#9ad4e8', x:cp0.x+16, z:cp0.z+14, noSnap:true, needs:'air',
    desc:'Carry the payload UP through the glowing orbital ring above the pad, then bring the capsule back down to land.', tip:'Fly in with the helicopter or a plane' };
  Object.assign(GIG_BASE_PAY,{slalom:130, freight:150, orbit:180});
  Object.assign(GIG_BASE_REP,{slalom:30, freight:32, orbit:36});

  GIG_HANDLERS.slalom={
    start(){
      const o=[[-22,-10],[0,-24],[22,-10],[22,12],[0,26],[-22,12]];
      gig.data={cps:o.map(p=>({x:dt0.x+p[0],z:dt0.z+p[1],done:false})),i:0,meshes:[]};
      gig.timer=70; gig.data.t0=70;
      const c=gig.data.cps[0]; setGigMarker(c.x,c.z,'🏁','#8a93a6'); routeTo(c.x,c.z);
      toast('🏙️ Six gates — thread the towers!');
    },
    update(dt){
      const D=gig.data, c=D.cps[D.i];
      if(!player.car){ gig.offVehT+=dt; if(gig.offVehT>6){ gigFail('The clock only runs on wheels.'); return; } } else gig.offVehT=0;
      if(c && Math.hypot(c.x-player.x,c.z-player.z)<7){
        c.done=true; D.i++;
        popText('🏁 GATE '+D.i+'/6','#8a93a6'); const s=getSfx(); if(s&&s.pick)s.pick(); haptic(12);
        if(D.i>=6){ const frac=gig.timer/Math.max(1,D.t0);
          gigDone(frac>0.4?3:(frac>0.15?2:1), GIG_BASE_PAY.slalom*(frac>0.4?3:(frac>0.15?2:1)), 'All six gates threaded'); return; }
        const n=D.cps[D.i]; setGigMarker(n.x,n.z,'🏁','#8a93a6');
      }
      gigHudSet('🏙️','Gate '+(D.i+1)+'/6',gig.timer,null);
      gig.timer-=dt;
      if(gig.timer<=0) gigFail('Timed out between the towers.');
    }
  };
  GIG_HANDLERS.freight={
    start(){
      const targets=zones.filter(z=>z.unlocked&&['ironworks','port','downtown','market'].includes(z.id));
      const picks=(targets.length?targets:zones.slice(0,1)).sort(()=>Math.random()-0.5).slice(0,3);
      while(picks.length<3) picks.push(picks[picks.length-1]);
      gig.data={legs:picks.map(p=>({x:p.x,z:p.z+ (p.r||20)+6,n:p.name,done:false})),i:0,meshes:[]};
      const L=gig.data.legs[0];
      gig.timer=Math.hypot(L.x-player.x,L.z-player.z)/8+16;
      setGigMarker(L.x,L.z,'📦','#e0a35a'); routeTo(L.x,L.z);
      toast('🚛 Crate loaded — first stop: '+L.n+'!');
    },
    update(dt){
      const D=gig.data, L=D.legs[D.i];
      if(!player.car){ gig.offVehT+=dt; if(gig.offVehT>7){ gigFail('Freight left on the kerb…'); return; } } else gig.offVehT=0;
      if(L && Math.hypot(L.x-player.x,L.z-player.z)<9){
        L.done=true; D.i++;
        popText('📦 DROP '+D.i+'/3','#e0a35a'); const s=getSfx(); if(s&&s.pick)s.pick(); haptic(16);
        if(D.i>=3){ const stars=gig.timer>14?3:(gig.timer>6?2:1);
          gigDone(stars, GIG_BASE_PAY.freight*stars, 'Every crate signed for'); return; }
        const N=D.legs[D.i];
        gig.timer=Math.hypot(N.x-player.x,N.z-player.z)/8+16;
        setGigMarker(N.x,N.z,'📦','#e0a35a'); routeTo(N.x,N.z);
      }
      gigHudSet('🚛','Haul to '+(L?L.n:''),gig.timer,null);
      gig.timer-=dt;
      if(gig.timer<=0) gigFail('The crate missed its window.');
    }
  };
  GIG_HANDLERS.orbit={
    start(){
      gig.data={phase:'up',meshes:[]};
      gig.timer=150;
      setGigMarker(cp0.x,cp0.z,'🚀','#9ad4e8');
      toast('🚀 Payload aboard — climb through the glowing ring at altitude 100!');
    },
    update(dt){
      const D=gig.data, dd=Math.hypot(cp0.x-player.x,cp0.z-player.z);
      if(D.phase==='up'){
        if(dd<14 && (player.y||0)>95){
          D.phase='down'; popText('🛰️ ORBIT REACHED!','#9ad4e8'); const s=getSfx(); if(s&&s.done)s.done(); haptic(28);
          setGigMarker(cp0.x,cp0.z,'🛬','#9ad4e8');
        }
        gigHudSet('🚀', player.plane?('Climb! ALT '+Math.round(player.y||0)+'/95 over the pad'):'Get back in an aircraft!', gig.timer, Math.min(1,(player.y||0)/95));
      } else {
        if(dd<10 && (player.y||0)<4){
          const stars=gig.timer>90?3:(gig.timer>45?2:1);
          gigDone(stars, GIG_BASE_PAY.orbit*stars, 'Capsule down — mission control is howling'); return;
        }
        gigHudSet('🚀','Bring the capsule down on the pad',gig.timer,null);
      }
      gig.timer-=dt;
      if(gig.timer<=0) gigFail('The launch window closed.');
    }
  };

  // ------------------------------------------------------------------
  //  unlock engine — runs every frame, reacts to real-day rollover too
  // ------------------------------------------------------------------
  function unlockZone(z,announce){
    if(z.built) return;
    clearSite(z); z.unlocked=true; z.built=true;
    z.build(z);
    LANDMARKS31.push({e:z.e,name:z.name,x:z.x,z:z.z});
    if(z.gig==='slalom') addGigPad(slalomDef);
    if(z.gig==='freight') addGigPad(freightDef);
    if(z.gig==='orbit') addGigPad(orbitDef);
    if(announce){ toast('🏗️ The city has grown — NEW: '+z.e+' '+z.name+'!'); popText('🏗️ '+z.e+' '+z.name,'#7fc6c0');
      const s=getSfx(); if(s&&s.done)s.done(); haptic(26); }
  }
  function syncZones(){
    const open=openCount();
    for(let i=0;i<zones.length;i++){
      const z=zones[i];
      if(i<open){ if(!z.built) unlockZone(z, CITY.seen>0 && i>=CITY.seen); }
      else if(!z.site && !z.built) buildSite(z);
    }
    if(open>CITY.seen){ if(CITY.seen>0) setTimeout(()=>toast('🗺️ '+open+'/'+zones.length+' districts open — check the map!'),1800);
      CITY.seen=open; citySave(); }
  }
  syncZones();

  // ------------------------------------------------------------------
  //  per-frame: train, ferris wheel, smoke, daily rollover
  // ------------------------------------------------------------------
  let dayChk=0;
  function update(dt){
    dayChk+=dt; if(dayChk>10){ dayChk=0; syncZones(); }   // catches midnight rollovers mid-session
    if(train){
      train.t+=train.speed*dt;
      train.units.forEach((u,i)=>{ const p=trackPos(train.t-i*9.5);
        u.position.set(p.x,0,p.z); u.rotation.y=p.ang;
        // gentle push so the train feels solid
        const pd=Math.hypot(p.x-player.x,p.z-player.z);
        if(pd<3.4&&pd>0.01){ const k=(3.4-pd)*8*dt; player.x+=(player.x-p.x)/pd*k; player.z+=(player.z-p.z)/pd*k;
          if(player.car){ player.car.x=player.x; player.car.z=player.z; } }
      });
    }
    if(ferris){ ferris.wheel.rotation.z+=dt*0.25; for(const c of ferris.cabins) c.rotation.z=-ferris.wheel.rotation.z; }
    const t=performance.now()*0.001;
    for(const p of smokePuffs){ p.m.position.y=p.y0+1.4*(((t*0.5+p.ph)%2)); p.m.material.opacity=0.55*(1-(((t*0.5+p.ph)%2)/2)); p.m.scale.setScalar(0.8+(((t*0.5+p.ph)%2))*0.5); }
  }

  return { update, zones, openCount, _debug:{ get train(){return train;}, get ferris(){return ferris;}, trackPos } };
}

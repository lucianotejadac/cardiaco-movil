/* Caso 7: gatillado, en cada fase (estres y reposo).
   Paso 4 de cada fase: reconstruye los 8 intervalos con la receta del equipo para el gatillado
   (OSEM 4 x 4, gaussiano 8,4 mm, sin atenuacion), sobre la adquisicion gatillada corregida con los
   mismos saltos que encontro la correccion automatica, si el estudiante corrigio. La caja y la
   orientacion trabajan sobre la suma de los intervalos; el eje parte en 0° y 0°.
   Mapa QGS (con menu estres / reposo): con el eje del estudiante, calcula lo que muestra QGS:
   volumenes por intervalo, fraccion de eyeccion, forma, llenado, mapas polares de perfusion en fin
   de diastole y de sistole, movimiento y engrosamiento, y un ventriculo en 3D que late (liso, en
   WebGL, con cuadros interpolados entre los 8 intervalos). La
   calibracion viene congelada por fase (caso7-gatillado-constantes.js), obtenida con los datos sin
   saltos y el eje del equipo; si falta, se calibra aqui contra lo que informo el equipo. */
'use strict';
const Gatillado7=(()=>{
 const Q=QpsNucleo,$=id=>document.getElementById(id),dec=(x,d=0)=>Number(x).toFixed(d).replace('.',',');
 const N=192,RECETA={it:4,sub:4,fwhm:8.4},MEDIO=24,LADO_XY=34;
 // Lo que informo el equipo en las pantallas QGS de cada fase (por la huella del marco de
 // referencia de sus proyecciones), con los valores por segmento del 1 al 17.
 const EQUIPOS={'22d4f455':{fase:'estrés',imagen:'caso7-qgs-estres',edv:55,esv:18,sv:37,ef:67,ed:1,es:4,si_ed:.61,si_es:.45,ecc:.79,per:-3.60,pfr:1.08,pfr2:3.50,mfr3:.78,ttpf:130,bpm:81.3,rr:738,
  curva:[55,40.5,24.7,18.0,21.4,27.0,35.0,51.5],
  seg:{ed:[51,37,36,36,32,42,50,45,45,48,46,56,50,45,48,53,42],es:[62,53,45,46,48,62,75,64,68,60,56,72,75,64,76,80,84],mov:[10.5,4.6,1.3,5.2,9.6,11.8,8.0,3.7,1.7,5.7,9.5,10.0,7.4,3.3,8.0,11.3,10.2],eng:[31,35,28,25,30,38,39,40,47,32,30,39,51,46,50,50,68]}},
  '474e44e4':{fase:'reposo',imagen:'caso7-qgs-reposo',edv:68,esv:22,sv:46,ef:68,ed:1,es:4,si_ed:.61,si_es:.44,ecc:.81,per:-3.40,pfr:1.72,pfr2:3.17,mfr3:1.04,ttpf:132,bpm:79.9,rr:751,
  curva:[68,50.5,30.2,22.0,25.8,35.6,47.5,66.2],
  seg:{ed:[49,38,35,41,36,47,56,47,47,52,49,63,51,46,51,53,46],es:[68,56,42,48,48,63,92,69,70,71,67,90,91,72,88,85,89],mov:[12.5,6.0,1.1,4.3,9.2,12.3,11.0,4.8,1.1,5.0,10.0,11.9,10.4,4.0,7.9,12.7,10.3],eng:[36,37,27,21,25,33,52,44,49,39,37,48,62,50,57,54,68]}},
  // Caso 8 (estudio normal; fin de diastole en el intervalo 8. En el reposo la curva leida bajaba apenas bajo el ESV en el
  // intervalo 3; se dejo en 37,5 ml para respetar el intervalo 4 que informa el equipo).
  'b13ef109':{fase:'estrés',imagen:'caso8-qgs-estres',edv:92,esv:40,sv:52,ef:57,ed:8,es:3,si_ed:.68,si_es:.50,ecc:.85,per:-2.51,pfr:1.81,pfr2:.99,mfr3:1.16,ttpf:186,bpm:60.4,rr:994,
  curva:[82.5,58.5,40.0,40.9,58.9,76.1,83.2,92.0],
  seg:{ed:[61,42,30,32,35,48,51,53,47,37,40,52,40,52,41,47,36],es:[82,49,32,43,48,64,87,73,60,60,63,81,71,76,70,72,65],mov:[9.7,6.1,4.0,3.8,6.8,9.2,9.2,7.3,5.9,6.5,7.3,7.5,7.3,6.7,7.5,6.8,6.8],eng:[34,19,10,18,19,26,50,38,28,36,34,44,45,43,44,41,46]}},
  'a17066aa':{fase:'reposo',imagen:'caso8-qgs-reposo',edv:88,esv:37,sv:52,ef:59,ed:8,es:4,si_ed:.72,si_es:.49,ecc:.85,per:-2.63,pfr:1.87,pfr2:1.01,mfr3:1.24,ttpf:176,bpm:59.9,rr:1001,
  curva:[82.3,53.3,37.5,37.0,56.5,71.7,78.4,88.0],
  seg:{ed:[54,41,34,26,32,44,48,51,46,33,42,50,39,45,43,52,36],es:[76,51,36,38,47,66,90,70,66,60,62,85,73,73,70,79,61],mov:[10.9,7.2,4.5,4.6,6.3,10.1,10.9,7.4,5.6,6.2,6.3,8.2,8.3,5.7,5.8,6.2,5.9],eng:[35,20,8,17,18,30,58,35,33,38,30,48,48,44,40,40,38]}}};
 let EQUIPO=EQUIPOS['22d4f455'];
 const g={vols:null,suma:null,s:null,d:null,sp:1,fuente:'',res:null,ref:null,K:null,revelar:false,t:0,x:0,corre:false,raf:null,vel:1,yaw:28,pitch:12,vis:null,ocupado:false,tarea:null,rechazo:null,detenido:false};

 /* ---------- reconstruccion ---------- */
 function osem(sg,z0,z1,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const pool=createOsem95Pool(codigo);g.tarea=pool;g.rechazo=mal;const mid=Math.floor((z0+z1)/2),rad=Math.ceil((z1-z0)/2);
   pool.onerror=err=>{pool.terminate();mal(Error(err.message||'Error del cálculo.'));};
   pool.onmessage=({data:q})=>{if(q.error){pool.terminate();mal(Error(q.error));return;}if(q.progress){avance(q.total?q.completed/q.total:0);return;}if(q.volume){pool.terminate();g.tarea=null;g.rechazo=null;ok(q.volume);}};
   pool.postMessage({n:sg.n,data:sg.data,views:sg.views,spacing:sg.spacing,window:1,scatterWindow:0,settings:{attenuationCorrection:false,scatter:false,scatterWeight:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,scatterSmoothing:false,scatterFwhm:0,postFilter:false,postFilterFWHMmm:0,initialization:'uniform',scatterWindowScale:0,iterations:RECETA.it,subsets:RECETA.sub},mu:null,fbp:null,outsideAir:true,previewRow:mid,previewRadius:rad});
  });
 }
 function cancelar(){if(g.ocupado)g.detenido=true;if(g.tarea){g.tarea.terminate();g.tarea=null;}if(g.rechazo){g.rechazo(Error('detenida'));g.rechazo=null;}}
 // Guardado: cada intervalo recortado a una caja alrededor del corazon.
 const BD={nombre:'cardiaco-movil-caso7',tienda:'recon'};
 function bd(){return new Promise((ok,mal)=>{const r=indexedDB.open(BD.nombre,1);r.onupgradeneeded=()=>r.result.createObjectStore(BD.tienda);r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
 async function tienda(modo,f){const b=await bd();try{return await new Promise((ok,mal)=>{const t=b.transaction(BD.tienda,modo),r=f(t.objectStore(BD.tienda));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>mal(t.error);});}finally{b.close();}}
 function recortar(vols,n,caja){const [x0,x1,y0,y1,z0,z1]=caja,w=x1-x0+1,h=y1-y0+1,k=z1-z0+1,p=n*n;return vols.map(v=>{const d=new Float32Array(w*h*k);for(let z=0;z<k;z++)for(let y=0;y<h;y++)d.set(v.subarray((z+z0)*p+(y+y0)*n+x0,(z+z0)*p+(y+y0)*n+x0+w),(z*h+y)*w);return d;});}
 function extender(datos,n,caja){const [x0,x1,y0,y1,z0,z1]=caja,w=x1-x0+1,h=y1-y0+1,k=z1-z0+1,p=n*n;return datos.map(d=>{const v=new Float32Array(n*p);for(let z=0;z<k;z++)for(let y=0;y<h;y++)v.set(d.subarray((z*h+y)*w,(z*h+y)*w+w),(z+z0)*p+(y+y0)*n+x0);return v;});}
 const clave=(s,fuente)=>`v1|${cardiacoHash(s.frame)}|${fuente}|gatillado`;

 /* est: estado de la aplicacion (gat, correccion). centro: centro del corazon del estres (voxel, z hacia la cabeza). */
 // forzar: reconstruye aunque este guardado (el boton del paso 4 del caso 7); sin forzar, recupera lo guardado.
 async function reconstruir({est,s,fuente,centro,forzar}){
  if(g.ocupado)return null;
  EQUIPO=EQUIPOS[cardiacoHash(s.frame)]||EQUIPOS['22d4f455'];
  const n=s.n;let guardado=null;if(!forzar){try{guardado=await tienda('readonly',t=>t.get(clave(s,fuente)));}catch(err){}}
  if(guardado&&guardado.caja){g.vols=extender(guardado.datos,n,guardado.caja);g.deMemoria=true;}
  else{
   if(!est.gat)throw Error(`El ZIP no trae la adquisición gatillada del ${EQUIPO.fase}.`);
   g.ocupado=true;g.detenido=false;const t0=performance.now();
   Progreso.abrir(window.Caso7&&Caso7.caso&&Caso7.caso.gatillado?'Gatillado: OSEM 4 × 4, gaussiano 8,4 mm':'Gatillado: receta del equipo (OSEM 4 × 4, gaussiano 8,4 mm)',cancelar,'Ocho reconstrucciones, una por intervalo del ciclo cardíaco. Queda guardado en este dispositivo.');
   try{
    Progreso.avance(0,'Leyendo la adquisición gatillada…');await new Promise(r=>setTimeout(r,20));
    const d=await Lab95.read(new Blob([est.gat])),sg0=Lab95.spect(d,{gated:true}),cuadros=Array.from({length:sg0.frames},(_,i)=>({cabezal:d.uint16('x00540020',i),ventana:d.uint16('x00540010',i),paso:d.uint16('x00540090',i)}));
    const zc=Math.round(centro[2]),fila=n-1-zc,z0=Math.max(0,fila-MEDIO),z1=Math.min(n-1,fila+MEDIO),T=sg0.slots,vols=[];
    for(let t=1;t<=T;t++){
     if(g.detenido)throw Error('detenida');
     let sg=Lab95.gate(sg0,t);
     if(est.correccion&&est.correccion.saltos&&est.correccion.saltos.length){const org=sg0.views.filter(v=>v.slot===t).map(v=>v.source);sg=Correccion.aplicar(sg,org.map(i=>cuadros[i]),est.correccion).s;}
     let vol=await osem(sg,z0,z1,f=>Progreso.avance((t-1+f*.9)/T,`Intervalo ${t} de ${T}: OSEM ${Math.round(f*100)} %`));
     Progreso.avance((t-.1)/T,`Intervalo ${t} de ${T}: gaussiano…`);vol=await Lab95.gaussian3D(vol,n,RECETA.fwhm/s.spacing/2.354820045,()=>g.detenido);if(!vol)throw Error('detenida');
     const p=n*n,zu=new Float32Array(n*p);for(let z=0;z<n;z++)zu.set(vol.subarray((n-1-z)*p,(n-z)*p),z*p);vols.push(zu);
    }
    g.vols=vols;g.deMemoria=false;g.segundos=(performance.now()-t0)/1000;
    const cx=Math.round(centro[0]),cy=Math.round(centro[1]),caja=[Math.max(0,cx-LADO_XY),Math.min(n-1,cx+LADO_XY),Math.max(0,cy-LADO_XY),Math.min(n-1,cy+LADO_XY),Math.max(0,zc-MEDIO),Math.min(n-1,zc+MEDIO)];
    try{await tienda('readwrite',t=>t.put({caja,datos:recortar(vols,n,caja)},clave(s,fuente)));}catch(err){console.warn('No se pudo guardar el gatillado',err);}
   }finally{g.ocupado=false;g.tarea=null;g.rechazo=null;Progreso.cerrar();}
  }
  const suma=new Float32Array(g.vols[0].length);for(const v of g.vols)for(let i=0;i<v.length;i++)suma[i]+=v[i];
  g.suma=suma;g.s=s;g.d={nx:n,ny:n,nz:n};g.sp=s.spacing;g.fuente=fuente;return suma;
 }

 /* ---------- calculo tipo QGS ---------- */
 function spline(y,T){ // spline cubico periodico por T puntos: devuelve funciones valor y derivada
  const n=T,M=Array.from({length:n},()=>new Float64Array(n)),b=new Float64Array(n);
  for(let i=0;i<n;i++){M[i][(i-1+n)%n]+=1;M[i][i]+=4;M[i][(i+1)%n]+=1;b[i]=6*(y[(i+1)%n]-2*y[i]+y[(i-1+n)%n]);}
  const a=M.map((f,i)=>[...f,b[i]]);for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(a[k][i])>Math.abs(a[p][i]))p=k;[a[i],a[p]]=[a[p],a[i]];for(let k=i+1;k<n;k++){const f=a[k][i]/a[i][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}}
  const m=new Float64Array(n);for(let i=n-1;i>=0;i--){let s=a[i][n];for(let j=i+1;j<n;j++)s-=a[i][j]*m[j];m[i]=s/a[i][i];}
  const seg=x=>{x=((x%n)+n)%n;const i=Math.floor(x),t=x-i,j=(i+1)%n;return {i,j,t};};
  const val=x=>{const {i,j,t}=seg(x);return (1-t)*y[i]+t*y[j]+((1-t)**3-(1-t))*m[i]/6+(t**3-t)*m[j]/6;};
  const der=x=>{const {i,j,t}=seg(x);return y[j]-y[i]+(-3*(1-t)**2+1)*m[i]/6+(3*t*t-1)*m[j]/6;};
  return {val,der};
 }
 function polyfit(x,y){const n=x.length;let sx=0,sy=0,sxx=0,sxy=0;for(let i=0;i<n;i++){sx+=x[i];sy+=y[i];sxx+=x[i]*x[i];sxy+=x[i]*y[i];}const a=(n*sxy-sx*sy)/(n*sxx-sx*sx||1);return [a,(sy-a*sx)/n];}
 function percentil(a,p){const b=Float32Array.from(a).sort();return b[Math.min(b.length-1,Math.floor(p/100*(b.length-1)))];}
 /* vols: 8 volumenes (z hacia la cabeza). marco, O0: eje y centro. K: constantes congeladas o null. */
 function calcular(vols,marco,O0,K){
  const T=vols.length,d=g.d,sp=g.sp,ml=sp**3/1000,NF=Q.NF,E=Q.elipsoideConEje(g.suma,d,O0,marco),Ps=Q.perfiles(g.suma,d,E),Ws=Q.pared(Ps),tbase=Q.limiteBasal(Ps,Ws);
  const inter=vols.map(v=>{const P=Q.perfiles(v,d,E),W=Q.pared(P);return {P,W,mid:Q.suavizar(W.mid),si:Q.suavizar(W.sin),so:Q.suavizar(W.sout)};});
  const bases=K?K.bases.slice():inter.map(q=>Math.min(tbase+8,Math.max(tbase-8,Q.limiteBasal(q.P,q.W))));
  const sup=(q,base,fe,fp)=>{const nsel=Q.anillosHasta(q.P,base),n=Q.NT*NF,de=new Float32Array(n),dp=new Float32Array(n),dm=q.mid;for(let i=0;i<n;i++){de[i]=q.mid[i]-fe*q.si[i];dp[i]=q.mid[i]+fp*q.so[i];}return {nsel,de,dp,Se:Q.superficie(q.P,de,nsel),Sp:Q.superficie(q.P,dp,nsel),Sm:Q.superficie(q.P,dm,nsel)};};
  const vol=(S,nsel)=>Q.volumenMalla(S,nsel)*ml,bis=(f,a,b)=>{let fa=f(a),fb=f(b);if(fa*fb>0)return fa>0?a:b;for(let i=0;i<40;i++){const m=(a+b)/2,fm=f(m);if(fa*fm<=0){b=m;fb=fm;}else{a=m;fa=fm;}}return (a+b)/2;};
  let fe,fp;
  if(K){fe=K.fe.slice();fp=K.fp.slice();}
  else{fe=inter.map((q,t)=>bis(x=>{const s=sup(q,bases[t],x,.5);return vol(s.Se,s.nsel)-EQUIPO.curva[t];},-.6,2.5));
   const s0=sup(inter[0],bases[0],fe[0],.56),masa=vol(s0.Sp,s0.nsel)-vol(s0.Se,s0.nsel);fp=inter.map((q,t)=>bis(x=>{const s=sup(q,bases[t],fe[t],x);return vol(s.Sp,s.nsel)-vol(s.Se,s.nsel)-masa;},-.5,3));}
  const S=inter.map((q,t)=>sup(q,bases[t],fe[t],fp[t])),V=S.map(s=>vol(s.Se,s.nsel)),ed=V.indexOf(Math.max(...V)),es=V.indexOf(Math.min(...V)),edv=V[ed],esv=V[es];
  // mapas polares
  const tcom=Math.min(bases[ed],bases[es]),disco=(M,tm)=>Q.disco(M,inter[0].P,E,tm,N),Ded=disco(inter[ed].W.pico,bases[ed]),Des=disco(inter[es].W.pico,bases[es]);
  const dentro=[];for(let o=0;o<N*N;o++)if(Des.rho[o]<1)dentro.push(Des.A[o]);const mx=percentil(dentro,99.5)||1;
  const dend=new Float32Array(Q.NT*NF);for(let i=0;i<dend.length;i++)dend[i]=((inter[ed].mid[i]-fe[ed]*inter[ed].si[i])-(inter[es].mid[i]-fe[es]*inter[es].si[i]))*sp;
  const dpk=new Float32Array(Q.NT*NF);for(let i=0;i<dpk.length;i++)dpk[i]=inter[es].W.pico[i]-inter[ed].W.pico[i];
  const Dm=disco(Q.suavizar(dend,3),tcom),Dt=disco(Q.suavizar(dpk,2),tcom),seg=Q.segmentos(Ded),area=new Float32Array(N*N);for(let o=0;o<N*N;o++)if(Ded.rho[o]<1)area[o]=E.b*Math.sin(Ded.tt[o])/Math.max(Ded.rho[o],1e-3);
  const mapas={ed:Ded.A.map(v=>100*v/mx),es:Des.A.map(v=>100*v/mx),mov:Dm.A,eng:Dt.A},segv={},rectas=K?K.rectas:{};
  for(const k in mapas){const s=new Float64Array(18),w=new Float64Array(18);for(let o=0;o<N*N;o++)if(Ded.rho[o]<1){s[seg[o]]+=area[o]*mapas[k][o];w[seg[o]]+=area[o];}const x=Array.from({length:17},(_,i)=>s[i+1]/(w[i+1]||1));if(!K)rectas[k]=polyfit(x,EQUIPO.seg[k]);const [a,b]=rectas[k];mapas[k]=mapas[k].map(v=>a*v+b);segv[k]=x.map(v=>a*v+b);}
  // forma, curva y llenado
  const forma=s=>{let tmin=Infinity,tmax=-Infinity,dmax=0;for(let q=0;q<s.nsel*NF;q++){const t=(s.Se[q*3]-E.O[0])*E.eje[0]+(s.Se[q*3+1]-E.O[1])*E.eje[1]+(s.Se[q*3+2]-E.O[2])*E.eje[2];if(t<tmin)tmin=t;if(t>tmax)tmax=t;}for(let i=0;i<s.nsel;i++)for(let j=0;j<NF/2;j++){const a=(i*NF+j)*3,b=(i*NF+j+NF/2)*3,dd=Math.hypot(s.Se[a]-s.Se[b],s.Se[a+1]-s.Se[b+1],s.Se[a+2]-s.Se[b+2]);if(dd>dmax)dmax=dd;}return dmax/(tmax-tmin);};
  const rr=EQUIPO.rr/1000,sp8=spline(V,T),tt=Array.from({length:1601},(_,i)=>i/200),cur=tt.map(sp8.val),der=tt.map(x=>sp8.der(x)*T/rr/edv);let ies=0;for(let i=1;i<cur.length;i++)if(cur[i]<cur[ies])ies=i;
  const pic=[];for(let i=ies+1;i<tt.length-1;i++)if(der[i]>der[i-1]&&der[i]>=der[i+1]&&der[i]>0)pic.push(i);
  let per=0,tper=0;for(let i=0;i<ies;i++)if(der[i]<per){per=der[i];tper=tt[i]+1;}
  const p1=pic[0]??ies,p2=pic[1]??p1,Dd=T-tt[ies],mfr3=(sp8.val(tt[ies]+Dd/3)-cur[ies])/(Dd/3/T*rr)/edv;
  const crudo={edv,esv,ef:100*(edv-esv)/edv,si_ed:forma(S[ed]),si_es:forma(S[es]),ecc:Math.sqrt(1-(E.b/E.a)**2),per,pfr:der[p1],pfr2:der[p2],mfr3,ttpf:(tt[p1]-tt[ies])/T*rr*1000};
  const factores=K?K.factores:Object.fromEntries(['si_ed','si_es','ecc','per','pfr','pfr2','mfr3','ttpf'].map(k=>[k,EQUIPO[k]==null||!crudo[k]?1:EQUIPO[k]/crudo[k]]));
  const r={edv:Math.round(edv),esv:Math.round(esv),ed:ed+1,es:es+1,tper,tpfr:tt[p1]+1,tpfr2:tt[p2]+1};r.sv=r.edv-r.esv;r.ef=Math.round(100*(edv-esv)/edv);for(const k in factores)r[k]=crudo[k]*factores[k];
  return {E,S,V,ed,es,r,mapas,segv,rho:Ded.rho,cur,der,tt,P:inter[0].P,constantes:{bases,fe,fp,rectas,factores}};
 }

 /* ---------- interfaz ---------- */
 async function abrir({marco,centro}){
  const KK=window.CASO7_QGS;g.K=(KK&&KK[cardiacoHash(g.s.frame)])||null;g.marco=marco;g.O0=centro.slice();g.revelar=false;
  g.res=calcular(g.vols,marco,g.O0,g.K);g.constantes=g.res.constantes;g.vis=null;g.x=g.res.ed;pintar();velocidad();animar();
 }
 const PAL=[[0,0,0],[0,15,14],[0,51,50],[0,85,84],[0,119,118],[26,99,154],[60,65,188],[94,31,222],[130,2,246],[164,36,178],[198,70,110],[234,106,38],[254,140,26],[254,174,94],[254,210,166],[254,240,225]],PX=[0,3.5,10.4,17.4,24.3,31.3,38.3,45.2,52.2,59.1,66.1,73,80,87,93.9,100];
 function color(v){v=Math.min(100,Math.max(0,v||0));let i=1;while(i<PX.length-1&&PX[i]<v)i++;const f=(v-PX[i-1])/(PX[i]-PX[i-1]);return [0,1,2].map(c=>PAL[i-1][c]+(PAL[i][c]-PAL[i-1][c])*f);}
 function lienzo(id,w,h){const c=typeof id==='string'?$(id):id;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c.getContext('2d');}
 function posiciones(){const p=[[17,0,0]];[1,6,5,4,3,2].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/3;p.push([s,.875*Math.cos(a),.875*Math.sin(a)],[s+6,.625*Math.cos(a),.625*Math.sin(a)]);});[13,16,15,14].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/2;p.push([s,.375*Math.cos(a),.375*Math.sin(a)]);});return p;}
 function polar(id,A,rho,vmax,nums,dec1,x=210){
  const ctx=lienzo(id,x,x),im=ctx.createImageData(x,x),R=x/2;
  for(let j=0;j<x;j++)for(let i=0;i<x;i++){const o=Math.min(N-1,Math.round((j+.5)/x*N-.5))*N+Math.min(N-1,Math.round((i+.5)/x*N-.5)),p=(j*x+i)*4;if(Math.hypot(i+.5-R,j+.5-R)>=R-1){im.data[p+3]=255;continue;}const c=color(100*A[o]/vmax);im.data[p]=c[0];im.data[p+1]=c[1];im.data[p+2]=c[2];im.data[p+3]=255;}
  ctx.putImageData(im,0,0);ctx.strokeStyle='#00e5e5';for(const f of [.25,.5,.75,1]){ctx.beginPath();ctx.arc(R,R,R*f-.5,0,2*Math.PI);ctx.stroke();}
  for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.beginPath();ctx.moveTo(R+.5*R*Math.cos(a),R+.5*R*Math.sin(a));ctx.lineTo(R+R*Math.cos(a),R+R*Math.sin(a));ctx.stroke();}
  for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2;ctx.beginPath();ctx.moveTo(R+.25*R*Math.cos(a),R+.25*R*Math.sin(a));ctx.lineTo(R+.5*R*Math.cos(a),R+.5*R*Math.sin(a));ctx.stroke();}
  ctx.fillStyle='#00ff00';ctx.font='12px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(const [s,px,py] of posiciones())ctx.fillText(dec(nums[s-1],dec1?1:0),R+px*R,R+py*R);
 }
 function tabla(){
  const r=g.res.r,e=EQUIPO,f=[['Volumen de fin de diástole','edv',0,'ml'],['Volumen de fin de sístole','esv',0,'ml'],['Volumen sistólico','sv',0,'ml'],['Fracción de eyección','ef',0,'%'],['Forma en fin de diástole','si_ed',2,''],['Forma en fin de sístole','si_es',2,''],['Excentricidad','ecc',2,''],['Vaciado máximo (PER)','per',2,'EDV/s'],['Llenado, primer pico (PFR)','pfr',2,'EDV/s'],['Llenado, segundo pico (PFR2)','pfr2',2,'EDV/s'],['Llenado del primer tercio (MFR/3)','mfr3',2,'EDV/s'],['Tiempo al primer pico (TTPF)','ttpf',0,'ms']];
  const t=$('qgsTabla');t.replaceChildren();const cab=t.insertRow();(g.revelar?['Medida','Tu resultado','Equipo']:['Medida','Tu resultado']).forEach(x=>{const c=document.createElement('th');c.textContent=x;cab.append(c);});
  for(const [n,k,d,u] of f){const fila=t.insertRow();[n,`${dec(r[k],d)}${u?' '+u:''}`,...(g.revelar?[e[k]==null?'—':`${dec(e[k],d)}${u?' '+u:''}`]:[])].forEach((x,i)=>{const c=fila.insertCell();c.textContent=x;if(i===1&&g.revelar&&e[k]!=null&&Math.abs(r[k]-e[k])>=(d?.5*10**-d:.5))c.className='cambia';});}
 }
 function curva(destino){
  const res=g.res,w=340,h=150,ctx=lienzo(destino||'qgsCurva',w,h),x0=34,y0=10,W=w-80,H=h-34,vmax=Math.ceil(Math.max(...res.V)/10)*10+10,X=t=>x0+t/8*W,Y=v=>y0+H-v/vmax*H,YD=v=>y0+H/2-v/250*H/2;
  ctx.fillStyle='#0d1114';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#555';ctx.strokeRect(x0,y0,W,H);ctx.font='10px system-ui,sans-serif';ctx.fillStyle='#ff8080';ctx.textAlign='right';
  for(let v=0;v<=vmax;v+=20){ctx.fillText(String(v),x0-4,Y(v)+3);}ctx.textAlign='center';for(let k=0;k<8;k++)ctx.fillText(String(k+1),X(k),y0+H+12);
  ctx.strokeStyle='#e53935';ctx.lineWidth=1.5;ctx.beginPath();res.tt.forEach((t,i)=>{if(t>8)return;const x=X(t),y=Y(res.cur[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();res.tt.forEach((t,i)=>{if(t>8)return;const x=X(t),y=YD(res.der[i]*res.r.edv*0+res.der[i]*res.V[res.ed]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  ctx.fillStyle='#e53935';res.V.forEach((v,k)=>{ctx.beginPath();ctx.arc(X(k),Y(v),2.5,0,2*Math.PI);ctx.fill();});
  if(g.revelar){ctx.fillStyle='#4dd0e1';EQUIPO.curva.forEach((v,k)=>{ctx.fillRect(X(k)-2,Y(v)-2,4,4);});}
  ctx.fillStyle='#aaa';ctx.textAlign='left';ctx.fillText('Volumen (ml), rojo · llenado (ml/s), gris'+(g.revelar?' · equipo, celeste':''),x0,h-3);
 }
 // Ventriculo en 3D: superficie interna que late y externa de fin de diastole en alambre. Vista
 // oblicua anterior derecha, como QGS: base arriba a la izquierda, apex abajo a la derecha, septum
 // hacia el observador. Arrastrar la gira. Entre los 8 intervalos medidos, los cuadros se interpolan
 // con el mismo spline periodico de la curva de volumen: cada vertice es una suma ponderada de sus 8
 // posiciones medidas. Los resultados se siguen midiendo con los 8 intervalos. La superficie se dibuja
 // con WebGL (malla3d.js); sin WebGL, por caras.
 const NR=48,ESCALA=2,rr=()=>(EQUIPO&&EQUIPO.rr)||1000;
 function preparar3d(){
  // Liso para mirar: se suaviza el desplazamiento de cada punto sobre el elipsoide (no las posiciones),
  // asi la forma no encoge; 100 pasadas dejan la forma de cada intervalo sin los bultos del ruido.
  const res=g.res,NF=Q.NF,malla=(d,nsel)=>Malla3D.alisar(Malla3D.remuestrear(Q.superficie(res.P,Malla3D.alisarCampo(d,nsel,NF,100),nsel),nsel,NF,NR),NR,NF,4);
  g.vis={endo:res.S.map(s=>malla(s.de,s.nsel)),epi:malla(res.S[res.ed].dp,res.S[res.ed].nsel),
   pesos:Array.from({length:8},(_,k)=>spline(Array.from({length:8},(_,i)=>i===k?1:0),8)),vol:spline(res.V,8)};
 }
 function cuadro(x){const w=g.vis.pesos.map(s=>s.val(x)),E=g.vis.endo,S=new Float32Array(E[0].length);for(let k=0;k<8;k++){const wk=w[k],e=E[k];if(Math.abs(wk)<1e-7)continue;for(let i=0;i<S.length;i++)S[i]+=wk*e[i];}return S;}
 function ventriculo(destino,x){
  const res=g.res,E=res.E,NF=Q.NF,lado=300,ctx=lienzo(destino||'qgs3d',lado*ESCALA,lado*ESCALA);if(!g.vis)preparar3d();
  ctx.setTransform(ESCALA,0,0,ESCALA,0,0);g.dibujados=(g.dibujados||0)+1;x=x==null?g.x:x;const S=cuadro(x),ext=g.vis.epi,pi=2,pj=4;
  const rot=(p,q,a)=>{const c=Math.cos(a*Math.PI/180),sn=Math.sin(a*Math.PI/180);return [[0,1,2].map(k=>c*p[k]+sn*q[k]),[0,1,2].map(k=>-sn*p[k]+c*q[k])];};
  let der=E.eje.slice(),arr=E.v.map(t=>-t),hac=E.u.map(t=>-t);[der,hac]=rot(der,hac,g.yaw);[arr,hac]=rot(arr,hac,g.pitch);[der,arr]=rot(der,arr,32);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],esc=lado/46,P=(S,i,j)=>{const o=(i*NF+((j+NF)%NF))*3,d=[S[o]-E.O[0],S[o+1]-E.O[1],S[o+2]-E.O[2]];return {x:lado/2+dot(d,der)*esc,y:lado/2-dot(d,arr)*esc,z:dot(d,hac),d};};
  const img=Malla3D.dibujar({w:lado*ESCALA,h:lado*ESCALA,S,nr:NR,nf:NF,O:E.O,D:der,A:arr,H:hac,k:[esc/(lado/2),esc/(lado/2)],fondo:[0,0,100/255],luz:[-.4,.55,.73],modo:'gris',interior:'oscuro',pasesNormales:2,brillo:.08});
  if(img)ctx.drawImage(img,0,0,lado,lado);
  else{
  ctx.fillStyle='#000064';ctx.fillRect(0,0,lado,lado);const caras=[],luz=[-.4,.55,.73],ln=Math.hypot(...luz);
  const cara=(S,i,j,i2,j2,lista,fondo)=>{const A=P(S,i,j),B=P(S,i,j2),C=P(S,i2,j2),D=P(S,i2,j),e1=[0,1,2].map(k=>B.d[k]-A.d[k]),e2=[0,1,2].map(k=>D.d[k]-A.d[k]);let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n)||1;n=n.map(t=>t/l);
   const m=[0,1,2].map(k=>(A.d[k]+C.d[k])/2),ax=dot(m,E.eje),mr=[0,1,2].map(k=>m[k]-(ax>0?.3:.95)*ax*E.eje[k]);if(dot(n,mr)<0)n=n.map(t=>-t);const nv=[dot(n,der),dot(n,arr),dot(n,hac)];
   if(nv[2]<=0&&!fondo)return;const lu=Math.max(0,(nv[0]*luz[0]+nv[1]*luz[1]+nv[2]*luz[2])/ln);lista.push([(A.z+B.z+C.z+D.z)/4,[A,B,C,D],lu,nv[2]>0]);};
  for(let i=0;i+pi<NR;i+=pi)for(let j=0;j<NF;j+=pj)cara(S,i,j,i+pi,j+pj,caras,true);
  caras.sort((a,b)=>a[0]-b[0]);
  for(const [,p,lu,frente] of caras){const gr=frente?Math.round(35+215*Math.pow(lu,1.1)):Math.round(25+70*lu);ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let k=1;k<4;k++)ctx.lineTo(p[k].x,p[k].y);ctx.closePath();ctx.fillStyle=`rgb(${gr},${gr},${gr})`;ctx.fill();ctx.strokeStyle=`rgba(${gr},${gr},${gr},.9)`;ctx.lineWidth=.6;ctx.stroke();}
  }
  ctx.strokeStyle='rgba(235,150,0,.8)';ctx.lineWidth=.9;
  const anillos=[];for(let i=0;i<NR;i+=4)anillos.push(i);if(anillos[anillos.length-1]!==NR-1)anillos.push(NR-1);
  for(const i of anillos){ctx.beginPath();for(let j=0;j<=NF;j+=2){const a=P(ext,i,j);j?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);}ctx.stroke();}
  for(let j=0;j<NF;j+=8){ctx.beginPath();for(let i=0;i<NR;i++){const a=P(ext,i,j);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);}ctx.stroke();}
  const k=Math.round(x)%8,a=Math.floor(x)%8,justo=Math.abs(x-Math.round(x))<.02;
  ctx.fillStyle='#ffee00';ctx.font='12px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(justo?`Intervalo ${k+1} de 8 · ${dec(res.V[k],0)} ml`:`Entre los intervalos ${a+1} y ${(a+1)%8+1} · ${dec(g.vis.vol.val(x),0)} ml`,8,16);
  ctx.font='13px system-ui,sans-serif';for(const [tx,px,py] of [['BASE',.08,.24],['ANT',.62,.12],['SEPT',.45,.5],['ÁPEX',.8,.8],['INF',.2,.88]])ctx.fillText(tx,px*lado,py*lado);
 }
 // Late con la frecuencia real del caso (R-R del equipo) por la velocidad elegida.
 function animar(){parar();g.corre=true;let t0=null;const paso=ts=>{if(!g.corre)return;if(t0!==null)g.x=(g.x+Math.min(100,ts-t0)/(rr()/8)*g.vel)%8;t0=ts;const c=$('qgs3d');if(g.res&&c&&c.offsetParent!==null&&!document.hidden)ventriculo();g.raf=requestAnimationFrame(paso);};g.raf=requestAnimationFrame(paso);const b=$('qgsLatir');if(b)b.textContent='■ Parar';}
 function parar(){g.corre=false;if(g.raf){cancelAnimationFrame(g.raf);g.raf=null;}const b=$('qgsLatir');if(b)b.textContent='▶ Latir';}
 function velocidad(){const pct=Math.round(g.vel*100),lpm=Math.round(60000/rr()*g.vel),t=$('qgsVelTxt');if(t)t.textContent=pct===100?`real, ${lpm} lpm`:`${lpm} lpm (${pct} % de la real)`;}
 function cortes(destino){
  const res=g.res,E=res.E,vm=(()=>{let m=0;const v=g.vols[res.es];for(let i=0;i<v.length;i+=5)if(v[i]>m)m=v[i];return m||1;})(),lado=96,semi=22,ctx=lienzo(destino||'qgsCortes',lado*3+8,lado*2+4),a=E.eje,u=E.u,v=E.v,na=a.map(t=>-t);
  ctx.fillStyle='#000';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  [[res.ed,0],[res.es,lado+4]].forEach(([t,y])=>{[[u,v],[a,v],[u,na]].forEach(([dr,ab],k)=>{const im=ctx.createImageData(lado,lado),e=2*semi/lado;for(let j=0;j<lado;j++)for(let i=0;i<lado;i++){const x=(i+.5)*e-semi,yy=(j+.5)*e-semi,val=Q.muestra(g.vols[t],g.d,E.O[0]+dr[0]*x+ab[0]*yy,E.O[1]+dr[1]*x+ab[1]*yy,E.O[2]+dr[2]*x+ab[2]*yy),c=color(100*val/vm),p=(j*lado+i)*4;im.data[p]=c[0];im.data[p+1]=c[1];im.data[p+2]=c[2];im.data[p+3]=255;}ctx.putImageData(im,k*(lado+4),y);});
   ctx.fillStyle='#00ff00';ctx.font='11px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(t===res.ed?'Fin de diástole':'Fin de sístole',3,y+12);});
 }
 function pintar(){
  const res=g.res;tabla();curva();ventriculo();cortes();
  polar('qgsEd',res.mapas.ed,res.rho,100,res.segv.ed);polar('qgsEs',res.mapas.es,res.rho,100,res.segv.es);polar('qgsMov',res.mapas.mov,res.rho,10,res.segv.mov,true);polar('qgsEng',res.mapas.eng,res.rho,100,res.segv.eng);
  const E=res.E,a=CardiacoCore.angulosDe(E.eje[0],E.eje[1],E.eje[2]);
  $('qgsEstado').className='estado ok';$('qgsEstado').textContent=`Tu eje del gatillado: azimut ${dec(a.azimut,1)}°, elevación ${dec(a.elevacion,1)}°. ${window.Caso7&&Caso7.caso&&Caso7.caso.gatillado?`Receta para el gatillado: ${Caso7.caso.gatillado}.`:'Receta del equipo para el gatillado: OSEM 4 × 4, gaussiano 8,4 mm.'}${g.deMemoria?' Reconstrucción recuperada de lo guardado.':''}`;
  // Comparacion par a par: cada mapa y la curva del estudiante junto a los del equipo de esta fase.
  $('qgs7').classList.toggle('revelado',g.revelar);$('qgsCurvaEquipo').hidden=!g.revelar;
  const pon=(im,src)=>{if(im&&im.getAttribute('src')!==src)im.src=src;};
  pon(document.querySelector('#qgsCurvaEquipo img'),`${EQUIPO.imagen}-curva.png?v=1`);
  document.querySelectorAll('#qgsMapas figure.equipo').forEach(f=>{f.hidden=!g.revelar;if(g.revelar)pon(f.querySelector('img'),`${EQUIPO.imagen}-${f.dataset.mapa}.png?v=1`);});
  $('qgsRevelar').textContent=g.revelar?'Ocultar el resultado del equipo':'Ver el resultado del equipo';
  $('qgsNota').textContent=g.revelar?`El equipo informó para el ${EQUIPO.fase}: volumen de fin de diástole ${EQUIPO.edv} ml, de fin de sístole ${EQUIPO.esv} ml, fracción de eyección ${EQUIPO.ef} %. Los cuatro mapas del equipo traen un número por segmento; la calibración de esta sección se hizo con ellos, con el eje del equipo y sin los saltos.`:'Los números del equipo se ven al pulsar «Ver el resultado del equipo».';
 }
 function iniciar(){
  $('qgsLatir').addEventListener('click',()=>{g.corre?parar():animar();});const vel=$('qgsVel');if(vel)vel.addEventListener('input',()=>{g.vel=Math.max(.25,Math.min(2,+vel.value/100));velocidad();});$('qgsRevelar').addEventListener('click',()=>{g.revelar=!g.revelar;pintar();});
  const c=$('qgs3d');let ult=null;c.addEventListener('pointerdown',e=>{ult=[e.clientX,e.clientY];try{c.setPointerCapture(e.pointerId);}catch(err){}});c.addEventListener('pointermove',e=>{if(!ult||!g.res)return;g.yaw+=(e.clientX-ult[0])*.6;g.pitch=Math.max(-80,Math.min(80,g.pitch+(e.clientY-ult[1])*.6));ult=[e.clientX,e.clientY];ventriculo();});['pointerup','pointercancel'].forEach(v=>c.addEventListener(v,()=>{ult=null;}));
 }
 function exportarConstantes(){return g.constantes;}
 // Pantallas finales: mapas, curva, ventriculo en fin de diastole y cortes, en lienzos aparte.
 function instantanea(){
  const res=g.res,nuevo=()=>document.createElement('canvas'),m={};
  for(const [k,vm,d1] of [['ed',100],['es',100],['mov',10,true],['eng',100]]){m[k]=nuevo();polar(m[k],res.mapas[k],res.rho,vm,res.segv[k],d1,280);}
  const cu=nuevo();curva(cu);const v3=nuevo();ventriculo(v3,res.ed);const co=nuevo();cortes(co);
  return {r:{...res.r},V:res.V.slice(),segv:{ed:res.segv.ed.slice(),es:res.segv.es.slice(),mov:res.segv.mov.slice(),eng:res.segv.eng.slice()},mapas:m,curva:cu,ventriculo:v3,cortes:co,equipo:EQUIPO};
 }
 return {instantanea,iniciar,reconstruir,abrir,parar,exportarConstantes,cancelar,estado:g,get EQUIPO(){return EQUIPO;},EQUIPOS,calcular};
})();
window.Gatillado7=Gatillado7;

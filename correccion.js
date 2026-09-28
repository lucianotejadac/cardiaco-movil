/* Correccion automatica de movimiento para proyecciones SPECT adquiridas con dos cabezales.
   Validada primero en un prototipo (Python) contra datos con saltos conocidos.

   Idea. Los dos cabezales adquieren a la vez, asi que el movimiento del paciente es una funcion
   del paso del giro (1..32) y no de la vista. Para cada cabezal y cada paso se registra en dos
   dimensiones la vista t contra la t-1 (imagenes suavizadas, solo sobre la zona medida comun).
   El giro produce un corrimiento lateral suave entre vistas vecinas, que se quita con una mediana
   movil; un salto del paciente queda como un pico.
   - A lo largo de la camilla el pico es el mismo en los dos cabezales: se promedian.
   - Hacia el lado, los dos cabezales estan a 90 grados y ven dos proyecciones del mismo
     desplazamiento del paciente: juntas dan el vector en el plano, que despues se proyecta en
     cada vista segun su angulo.
   Solo corrige saltos bruscos que se mantienen; no corrige derivas lentas. */
'use strict';
const Correccion=(()=>{
 const R=6,SIGMA=1.5,UMBRAL_MIN=1.2;
 function suavizar(img,n){
  const r=Math.floor(3*SIGMA),k=[];let s=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*SIGMA*SIGMA));k.push(v);s+=v;}for(let i=0;i<k.length;i++)k[i]/=s;
  const a=new Float32Array(n*n),b=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){let q=0;for(let i=-r;i<=r;i++){const yy=y+i;if(yy>=0&&yy<n)q+=img[yy*n+x]*k[i+r];}a[y*n+x]=q;}
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){let q=0;for(let i=-r;i<=r;i++){const xx=x+i;if(xx>=0&&xx<n)q+=a[y*n+xx]*k[i+r];}b[y*n+x]=q;}
  return b;
 }
 // Zona medida: filas y columnas con alguna cuenta (la franja en cero queda fuera), menos 2 px de borde.
 function zona(img,n){
  let f0=-1,f1=-1,c0=-1,c1=-1;
  for(let y=0;y<n;y++){let q=0;for(let x=0;x<n;x++)q+=img[y*n+x];if(q>0){if(f0<0)f0=y;f1=y;}}
  for(let x=0;x<n;x++){let q=0;for(let y=0;y<n;y++)q+=img[y*n+x];if(q>0){if(c0<0)c0=x;c1=x;}}
  const v=new Uint8Array(n*n);if(f0<0)return v;
  for(let y=f0+2;y<f1-1;y++)for(let x=c0+2;x<c1-1;x++)v[y*n+x]=1;
  return v;
 }
 // Corrimiento (dy, dx), con decimales, tal que a(y, x) se parece a b(y - dy, x - dx).
 function registro(a,b,va,vb,n){
  const W=2*R+1,E=new Float64Array(W*W).fill(Infinity);
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
   let sa=0,sb=0,saa=0,sbb=0,sab=0,c=0;
   for(let y=R;y<n-R;y++){const fa=y*n,fb=(y-dy)*n-dx;for(let x=R;x<n-R;x++){if(va[fa+x]&&vb[fb+x]){const p=a[fa+x],q=b[fb+x];sa+=p;sb+=q;saa+=p*p;sbb+=q*q;sab+=p*q;c++;}}}
   if(c<2000||sa<=0||sb<=0)continue;
   E[(dy+R)*W+dx+R]=(saa/(sa*sa)-2*sab/(sa*sb)+sbb/(sb*sb))*c;
  }
  let m=0;for(let i=1;i<E.length;i++)if(E[i]<E[m])m=i;
  const iy=Math.floor(m/W),ix=m%W,sub=(e0,e1,e2)=>{const den=e0-2*e1+e2;return Number.isFinite(den)&&den>0?.5*(e0-e2)/den:0;};
  const fy=iy>0&&iy<W-1?sub(E[(iy-1)*W+ix],E[m],E[(iy+1)*W+ix]):0,fx=ix>0&&ix<W-1?sub(E[iy*W+ix-1],E[m],E[iy*W+ix+1]):0;
  return [iy-R+fy,ix-R+fx];
 }
 const mediana=a=>{const b=Array.from(a).sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
 function medianaMovil(x,ancho){const m=ancho>>1,o=new Float64Array(x.length);for(let i=0;i<x.length;i++)o[i]=mediana(x.slice(Math.max(0,i-m),i+m+1));return o;}
 function umbral(x){const a=Array.from(x,Math.abs),md=mediana(a),mad=mediana(a.map(v=>Math.abs(v-md)));return Math.max(UMBRAL_MIN,md+6*1.4826*mad);}

 /* s: adquisicion leida por Lab95.spect. cuadros: por cada frame del DICOM {cabezal, paso, ventana}.
    avance(fraccion): aviso de progreso. Devuelve los saltos encontrados y los corrimientos por vista. */
 async function estimar(s,cuadros,avance){
  const n=s.n,p=n*n,H=2,T=Math.max(...cuadros.map(c=>c.paso));
  // Imagen de fotopico por (cabezal, paso) y direccion del detector en el plano del paciente.
  const im=[],u=[];
  for(let h=0;h<H;h++){im.push([]);u.push([]);for(let t=0;t<T;t++){im[h].push(null);u[h].push(null);}}
  s.views.forEach(v=>{const c=cuadros[v.source];if(v.window!==1||v.slot!==1||c.cabezal>H)return;im[c.cabezal-1][c.paso-1]=s.data.subarray(v.source*p,(v.source+1)*p);u[c.cabezal-1][c.paso-1]=[v.ux,v.uy];});
  for(let h=0;h<H;h++)for(let t=0;t<T;t++)if(!im[h][t])throw Error('Faltan vistas: se necesitan dos cabezales con el mismo número de pasos.');
  const S=im.map(f=>f.map(g=>suavizar(g,n))),V=im.map(f=>f.map(g=>zona(g,n)));
  const dy=[new Float64Array(T),new Float64Array(T)],dx=[new Float64Array(T),new Float64Array(T)];
  let hecho=0;const total=H*(T-1);
  for(let t=1;t<T;t++){
   for(let h=0;h<H;h++){const r=registro(S[h][t],S[h][t-1],V[h][t],V[h][t-1],n);dy[h][t]=r[0];dx[h][t]=r[1];hecho++;}
   if(avance){avance(hecho/total);await new Promise(r=>setTimeout(r,0));}
  }
  const ry=dy.map(d=>{const m=medianaMovil(d,7);return d.map((v,i)=>i?v-m[i]:0);}),rx=dx.map(d=>{const m=medianaMovil(d,7);return d.map((v,i)=>i?v-m[i]:0);});
  const axial=new Float64Array(T),lat=new Float64Array(T);
  for(let t=0;t<T;t++){axial[t]=(ry[0][t]+ry[1][t])/2;lat[t]=Math.hypot(rx[0][t],rx[1][t]);}
  const ua=umbral(axial),ul=umbral(lat);
  // Tamano de cada salto a lo largo de la camilla: el registro entre dos vistas vecinas lo ubica
  // pero, con pocas cuentas, lo mide con medio pixel de error. Se afina comparando el perfil a lo
  // largo de la camilla de varios pasos antes y despues del salto (los dos cabezales juntos): ese
  // perfil casi no cambia con el angulo y junta muchas mas cuentas.
  const perfil=(t0,t1)=>{const q=new Float64Array(n);for(let h=0;h<H;h++)for(let t=t0;t<t1;t++){const g=im[h][t];for(let y=0;y<n;y++){let s=0;for(let x=0;x<n;x++)s+=g[y*n+x];q[y]+=s;}}let s=0;for(let y=0;y<n;y++)s+=q[y];for(let y=0;y<n;y++)q[y]/=s||1;return q;};
  const candidatos=[];for(let t=1;t<T;t++)if(Math.abs(axial[t])>ua)candidatos.push(t);
  const afinar=t=>{
   const prev=candidatos.filter(c=>c<t).pop()||0,sig=candidatos.find(c=>c>t)||T,a0=Math.max(prev,t-5),b1=Math.min(sig,t+5);
   if(t-a0<2||b1-t<2)return axial[t];
   const A=perfil(t,b1),B=perfil(a0,t),E=[];
   for(let d=-R;d<=R;d++){let s=0,c=0;for(let y=R+2;y<n-R-2;y++){const q=A[y]-B[y-d];s+=q*q;c++;}E.push(s/c);}
   let m=0;for(let i=1;i<E.length;i++)if(E[i]<E[m])m=i;
   const den=m>0&&m<E.length-1?E[m-1]-2*E[m]+E[m+1]:0;return m-R+(den>0?.5*(E[m-1]-E[m+1])/den:0);
  };
  const ax=new Int32Array(T),latV=[new Int32Array(T),new Int32Array(T)],saltos=[];let acum=0,ad=[0,0];
  for(let t=1;t<T;t++){
   if(Math.abs(axial[t])>ua){const fino=afinar(t),m=Math.round(fino);if(m){acum+=m;saltos.push({tipo:'camilla',paso:t+1,pixeles:m,medido:axial[t],afinado:fino});}}
   ax[t]=acum;
   if(lat[t]>ul){
    const vx=rx[0][t]*u[0][t][0]+rx[1][t]*u[1][t][0],vy=rx[0][t]*u[0][t][1]+rx[1][t]*u[1][t][1],mod=Math.hypot(vx,vy),m=Math.round(mod);
    if(m){ad=[ad[0]+vx/mod*m,ad[1]+vy/mod*m];saltos.push({tipo:'lado',paso:t+1,pixeles:m,medido:lat[t]});}
   }
   for(let h=0;h<H;h++)latV[h][t]=Math.round(ad[0]*u[h][t][0]+ad[1]*u[h][t][1]);
  }
  return {pasos:T,saltos,axial:ax,lateral:latV,umbrales:{camilla:ua,lado:ul}};
 }
 // Devuelve una copia de la adquisicion con cada cuadro devuelto a su lugar. Lo que entra por el
 // borde queda en cero: es «sin dato», igual que la franja sin medicion.
 function aplicar(s,cuadros,est){
  const n=s.n,p=n*n,data=new Float32Array(s.data.length);let movidos=0;
  for(let f=0;f<s.frames;f++){
   const c=cuadros[f],dy=c.cabezal<=2?est.axial[c.paso-1]:0,dx=c.cabezal<=2?est.lateral[c.cabezal-1][c.paso-1]:0,o=f*p;
   if(!dy&&!dx){data.set(s.data.subarray(o,o+p),o);continue;}
   movidos++;
   for(let y=0;y<n;y++){const ys=y+dy;if(ys<0||ys>=n)continue;for(let x=0;x<n;x++){const xs=x+dx;if(xs>=0&&xs<n)data[o+y*n+x]=s.data[o+ys*n+xs];}}
  }
  return {s:{...s,data},movidos};
 }
 return {estimar,aplicar};
})();
window.Correccion=Correccion;

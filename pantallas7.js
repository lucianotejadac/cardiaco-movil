/* Caso 7: pantallas finales generadas con los ejes que dejo el estudiante en las dos fases.
   Replican la disposicion de las pantallas que guardo el equipo, con los resultados de la
   aplicacion: «Splash» y «QPS» sin y con atenuacion (estres y reposo) y «QGS» de cada fase. En las
   de atenuacion se marca la falla de mascara que el equipo informo en el reposo. Los rotulos
   de las pantallas van como en el programa del equipo; cada pantalla dice arriba que la genero la
   aplicacion y que no es del equipo. No lleva datos de identidad. */
'use strict';
const Pantallas7=(()=>{
 const $=id=>document.getElementById(id),W=1600,H=900,NEGRO_X=1270,PANEL_X=1280;
 const VERDE='#00ff00',AMARILLO='#ffee00',ROJO='#c80000';
 const TIPOS=[['splash_noac','Splash · sin atenuación'],['splash','Splash · con atenuación'],['qps_noac','QPS · sin atenuación'],['qps','QPS · con atenuación'],['qgs_estres','QGS · estrés'],['qgs_reposo','QGS · reposo']];
 const p={hechas:false,lienzos:{},actual:'qps_noac',ultimo:null,datos:null};
 const f2=x=>Number(x).toFixed(2),f0=x=>String(Math.round(x));
 const nuevo=(w=W,h=H)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

 /* ---------- piezas comunes ---------- */
 function fondo(ctx,titulo){
  ctx.fillStyle='#b4c3dc';ctx.fillRect(0,0,W,H);ctx.fillStyle='#000';ctx.fillRect(0,58,NEGRO_X,H-58);
  ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#000';ctx.font='bold 17px system-ui,sans-serif';ctx.fillText(titulo,10,24);
  ctx.fillStyle=ROJO;ctx.font='14px system-ui,sans-serif';ctx.fillText('Generada en el simulador con tus ejes y la receta del equipo · no es una pantalla del equipo · sin datos de identidad',10,47);
 }
 // Recuadro del panel derecho: filas [rotulo, valor, rojo?]. Devuelve la y siguiente.
 function recuadro(ctx,y,filas){
  const h=12+filas.length*19;ctx.fillStyle='#dde5f0';ctx.fillRect(PANEL_X+4,y,W-PANEL_X-10,h);ctx.strokeStyle='#8fa0bb';ctx.strokeRect(PANEL_X+4.5,y+.5,W-PANEL_X-11,h-1);
  ctx.font='14px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';
  filas.forEach(([r,v,rojo],i)=>{const yy=y+15+i*19;ctx.fillStyle='#000';ctx.fillText(r,PANEL_X+14,yy);ctx.font='bold 14px system-ui,sans-serif';ctx.fillStyle=rojo?ROJO:'#000';ctx.fillText(v,PANEL_X+104,yy);ctx.font='14px system-ui,sans-serif';});
  return y+h+8;
 }
 function texto(ctx,t,x,y,color=VERDE,tam=15,al='left'){ctx.fillStyle=color;ctx.font=`${tam}px system-ui,sans-serif`;ctx.textAlign=al;ctx.textBaseline='alphabetic';ctx.fillText(t,x,y);}
 function posiciones(){const q=[[17,0,0]];[1,6,5,4,3,2].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/3;q.push([s,.875*Math.cos(a),.875*Math.sin(a)],[s+6,.625*Math.cos(a),.625*Math.sin(a)]);});[13,16,15,14].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/2;q.push([s,.375*Math.cos(a),.375*Math.sin(a)]);});return q;}
 function rejillaPolar(ctx,x0,y0,lado){
  const R=lado/2,cx=x0+R,cy=y0+R;ctx.strokeStyle='#00e5e5';ctx.lineWidth=1;
  for(const f of [.25,.5,.75,1]){ctx.beginPath();ctx.arc(cx,cy,R*f-.5,0,2*Math.PI);ctx.stroke();}
  for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.beginPath();ctx.moveTo(cx+.5*R*Math.cos(a),cy+.5*R*Math.sin(a));ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));ctx.stroke();}
  for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2;ctx.beginPath();ctx.moveTo(cx+.25*R*Math.cos(a),cy+.25*R*Math.sin(a));ctx.lineTo(cx+.5*R*Math.cos(a),cy+.5*R*Math.sin(a));ctx.stroke();}
 }
 // Mapa de reversibilidad: bajo el limite normal en estres y no en reposo (blanco sobre negro).
 function reversibilidad(ctx,x0,y0,lado,S,Rp){
  const X=S.act.X,N=S.N,zs=S.act.zona,zr=Rp.act.zona,rev=new Uint8Array(N*N),num=new Float64Array(18),den=new Float64Array(18);
  for(let o=0;o<N*N;o++){if(X.rho[o]>=1)continue;rev[o]=zs&&zs[o]&&!(zr&&zr[o])?1:0;den[X.seg[o]]+=X.area[o];if(rev[o])num[X.seg[o]]+=X.area[o];}
  const im=ctx.createImageData(lado,lado),R=lado/2;
  for(let j=0;j<lado;j++)for(let i=0;i<lado;i++){const q=(j*lado+i)*4;im.data[q+3]=255;if(Math.hypot(i+.5-R,j+.5-R)>=R-1)continue;const o=Math.min(N-1,Math.round((j+.5)/lado*N-.5))*N+Math.min(N-1,Math.round((i+.5)/lado*N-.5));const v=rev[o]?255:6;im.data[q]=v;im.data[q+1]=rev[o]?255:28;im.data[q+2]=rev[o]?255:26;}
  ctx.putImageData(im,x0,y0);rejillaPolar(ctx,x0,y0,lado);
  const pct={};for(let s=1;s<=17;s++)pct[s]=100*num[s]/(den[s]||1);
  ctx.fillStyle=VERDE;ctx.font=`${Math.round(lado/24)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';for(const [s,px,py] of posiciones())ctx.fillText(f0(pct[s]),x0+R+px*R,y0+R+py*R);
  let a=0,t=0;for(let o=0;o<N*N;o++)if(X.rho[o]<1){t+=X.area[o];if(rev[o])a+=X.area[o];}return 100*a/(t||1);
 }
 // Diana de 17 segmentos con los puntajes, como las del equipo (Str, Rst, Rev).
 function diana(ctx,x0,y0,lado,punt,rotulo){
  const R=lado/2-2,c=[x0+lado/2,y0+lado/2],zona=s=>[5,6,11,12,16].includes(s)?'#7ec4aa':[3,4,9,10,15].includes(s)?'#7ea0de':'#b0a896';ctx.strokeStyle='#000';ctx.lineWidth=1;
  const sector=(r0,r1,a0,a1,s)=>{ctx.beginPath();ctx.arc(c[0],c[1],R*r1,a0,a1);ctx.arc(c[0],c[1],R*r0,a1,a0,true);ctx.closePath();ctx.fillStyle=zona(s);ctx.fill();ctx.stroke();};
  [5,4,3,2,1,6].forEach((s,k)=>{sector(.75,1,k*Math.PI/3,(k+1)*Math.PI/3,s);sector(.5,.75,k*Math.PI/3,(k+1)*Math.PI/3,s+6);});[16,15,14,13].forEach((s,k)=>sector(.25,.5,-Math.PI/4+k*Math.PI/2,Math.PI/4+k*Math.PI/2,s));
  ctx.beginPath();ctx.arc(c[0],c[1],R*.25,0,2*Math.PI);ctx.fillStyle=zona(17);ctx.fill();ctx.stroke();
  ctx.font=`${Math.round(lado/11)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [s,px,py] of posiciones()){const v=punt[s]||0;ctx.fillStyle=v?'#d00000':'#000';ctx.fillText(String(v),c[0]+px*R,c[1]+py*R);}
  ctx.fillStyle='#000';ctx.font='13px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(rotulo,x0+2,y0+lado+14);
 }
 const suma=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
 function globales(S,Rp){
  const ps=S.act.puntajes||{},pr=Rp.act.puntajes||{},rev={};for(let s=1;s<=17;s++)rev[s]=Math.max(0,(ps[s]||0)-(pr[s]||0));
  const sss=suma(ps),srs=suma(pr),sds=suma(rev),pc=x=>f0(100*x/68);
  return {rev,sss,srs,sds,filas:[['Results','tus ejes · simulador',true],['TID',f2(S.act.volumen/Rp.act.volumen)],['SSS',`${sss}     SRS  ${srs}     SDS  ${sds}`],['SS%',`${pc(sss)}     SR%  ${pc(srs)}     SD%  ${pc(sds)}`]]};
 }
 const filasQps=(F,nombre)=>{const a=F.act,ac=!!F.receta.ac,o=F.obj||{};return [['Dataset',`${nombre==='Estrés'?'Stress':'Rest'} [Recon - ${ac?'AC':'NoAC'} ]`],...(o.aviso?[['Equipo',o.aviso,true]]:[]),['Recipe',`OSEM ${F.receta.it}×${F.receta.sub}, ${F.receta.fwhm} mm${ac?', AC':''}${F.receta.dispersion?', SC':''}`],['Volume',`${f0(a.volumen)}ml`],['Wall',`${f0(a.pared)}ml, ${f0(a.cuentas)}k`],['Defect',`${f0(a.defecto)}ml`],['Extent',`${f0(a.extension)}%`,a.extension>=5],['TPD',`${f0(a.tpd)}%`,a.tpd>=5],['Shape',`${f2(a.forma)} [SI],  ${f2(a.excentricidad)} [Ecc]`]];};
 function panelQps(ctx,S,Rp){
  const g=globales(S,Rp);let y=66;y=recuadro(ctx,y,g.filas);y=recuadro(ctx,y,filasQps(S,'Estrés'));y=recuadro(ctx,y,filasQps(Rp,'Reposo'));
  const l=98;diana(ctx,PANEL_X+8,y+4,l,S.act.puntajes||{},'Str');diana(ctx,PANEL_X+8+l+6,y+4,l,Rp.act.puntajes||{},'Rst');diana(ctx,PANEL_X+8+2*(l+6),y+4,l,g.rev,'Rev');
  // Falla de mascara que informo el equipo (reposo con atenuacion): recuadro rojo con lo que hay que saber.
  const o=[S,Rp].map(F=>F.obj).find(x=>x&&x.aviso);
  if(o&&[S,Rp].some(F=>F.receta.ac)){let yy=y+l+30;const w=W-PANEL_X-10,lineas=[`El equipo marcó «${o.aviso}»`,'en el reposo con atenuación: su máscara',`incluyó actividad intestinal. Informó ${o.volumen} ml`,'de volumen, frente a 52 ml sin atenuación.','Los números del reposo con atenuación y','el TID quedan inflados: interpreta con las','imágenes sin atenuación, como el informe.'];
   ctx.fillStyle='#ffe3e0';ctx.fillRect(PANEL_X+4,yy,w,14+lineas.length*18);ctx.strokeStyle=ROJO;ctx.lineWidth=2;ctx.strokeRect(PANEL_X+5,yy+1,w-2,12+lineas.length*18);ctx.lineWidth=1;
   lineas.forEach((s,i)=>texto(ctx,s,PANEL_X+12,yy+20+i*18,i?'#000':ROJO,i?13:14));}
  return g;
 }

 /* ---------- las cuatro pantallas ---------- */
 function pantallaQps(S,Rp){
  const ac=!!S.receta.ac,k=ac?'AC':'NoAC',c=nuevo(),ctx=c.getContext('2d');fondo(ctx,`QGS+QPS: QPS · ${ac?'con':'sin'} atenuación · Stress [Recon - ${k}] / Rest [Recon - ${k}]`);
  const w=520,h=S.cortes.height*w/S.cortes.width;
  texto(ctx,'Stress',14,82,VERDE,17);ctx.drawImage(S.cortes,12,90,w,h);texto(ctx,'Rest',14,90+h+30,VERDE,17);ctx.drawImage(Rp.cortes,12,98+h+22,w,h);
  const L=320;texto(ctx,'Stress Extent (%)',570+L/2,84,VERDE,17,'center');ctx.drawImage(S.polar,570,92,L,L);
  texto(ctx,'Rest Extent (%)',920+L/2,84,VERDE,17,'center');ctx.drawImage(Rp.polar,920,92,L,L);
  texto(ctx,'Reversibility Extent (%)',745+L/2,458,VERDE,17,'center');const rev=reversibilidad(ctx,745,466,L,S,Rp);
  texto(ctx,`Reversibilidad: ${f0(rev)} % del ventrículo`,745+L/2,812,AMARILLO,15,'center');
  panelQps(ctx,S,Rp);return c;
 }
 function pantallaSplash(S,Rp){
  const ac=!!S.receta.ac,k=ac?'AC':'NoAC',c=nuevo(),ctx=c.getContext('2d');fondo(ctx,`Splash ${ac?'AC':'NO AC'} · Stress [Recon - ${k}] / Rest [Recon - ${k}]`);
  const lado=84,x0=12,fila=(img,desde,n,y,rot)=>{ctx.drawImage(img,desde*lado,0,n*lado,lado,x0,y,n*lado,lado);texto(ctx,rot,x0+2,y-3,VERDE,13);for(let k=0;k<n;k++)texto(ctx,String(desde+k+1),x0+k*lado+lado-4,y+13,VERDE,11,'right');};
  let y=80;const paso=lado+19;
  for(const [F,n] of [[S,'Stress'],[Rp,'Rest']]){fila(F.filas.corto,0,14,y,`${n} [Recon - ${k}] · SAX, del ápex a la base`);y+=paso;fila(F.filas.corto,14,14,y,`${n} [Recon - ${k}] · SAX`);y+=paso;}
  for(const [F,n] of [[S,'Stress'],[Rp,'Rest']]){fila(F.filas.vertical,0,14,y,`${n} [Recon - ${k}] · VLA, del septum a la pared lateral`);y+=paso;}
  for(const [F,n] of [[S,'Stress'],[Rp,'Rest']]){fila(F.filas.horizontal,0,14,y,`${n} [Recon - ${k}] · HLA, de la pared anterior a la inferior`);y+=paso;}
  panelQps(ctx,S,Rp);return c;
 }
 function pantallaQgs(G,nombre){
  const c=nuevo(),ctx=c.getContext('2d'),r=G.r,e=G.equipo,serie=nombre==='Estrés'?'Stress-Gated [Recon]':'Rest-Gated [Recon]';fondo(ctx,`QGS · ${serie}`);
  const wc=450,hc=G.cortes.height*wc/G.cortes.width;ctx.drawImage(G.cortes,12,74,wc,hc);
  ctx.drawImage(G.ventriculo,40,110+hc,380,380);texto(ctx,'ED',230,110+hc+400,AMARILLO,16,'center');
  const L=300,xs=[500,860],ys=[92,478];[['ed','ED Perfusion (%)'],['es','ES Perfusion (%)'],['mov','Motion (0-10mm)'],['eng','Thickening (%)']].forEach(([k,t],i)=>{const x=xs[i%2],y=ys[i>>1];texto(ctx,t,x+L/2,y-8,VERDE,17,'center');ctx.drawImage(G.mapas[k],x,y,L,L);});
  texto(ctx,'ED',500+L/2,ys[1]+L+24,AMARILLO,16,'center');texto(ctx,'ES',860+L/2,ys[1]+L+24,AMARILLO,16,'center');
  let y=66;y=recuadro(ctx,y,[['Dataset',serie],['Recipe','OSEM 4×4, 8.4 mm, 8 intervals'],['EDV',`${r.edv}ml [${r.ed}]`],['ESV',`${r.esv}ml [${r.es}]`],['SV',`${r.sv}ml`],['EF',`${r.ef}%`],['Shape',`${f2(r.si_ed)} [SI ED],  ${f2(r.si_es)} [SI ES]`],['Ecc',f2(r.ecc)]]);
  ctx.fillStyle='#dde5f0';ctx.fillRect(PANEL_X+4,y,W-PANEL_X-10,170);ctx.strokeStyle='#8fa0bb';ctx.strokeRect(PANEL_X+4.5,y+.5,W-PANEL_X-11,169);texto(ctx,'LV Volume [ml] and Filling [ml/s]',PANEL_X+12,y+18,'#000',13);
  ctx.drawImage(G.curva,PANEL_X+8,y+24,W-PANEL_X-18,(W-PANEL_X-18)*G.curva.height/G.curva.width);y+=178;
  recuadro(ctx,y,[['PER',`${f2(r.per)} EDV/s`],['PFR',`${f2(r.pfr)} EDV/s`],['PFR2',`${f2(r.pfr2)} EDV/s`],['MFR/3',`${f2(r.mfr3)} EDV/s`],['TTPF',`${f0(r.ttpf)}ms`],['BPM',`${e.bpm} (R-R=${e.rr}ms)`]]);
  return c;
 }

 /* ---------- generacion e interfaz ---------- */
 // fases: [{fase,nombre,mapa:{...datos de Qps.abrirCaso7},gat:{marco,centro},cargarGat}]
 async function generar(opciones){
  opciones=opciones||p.ultimo;if(!opciones)return;p.ultimo=opciones;const aviso=$('pantEstado'),t0=performance.now();
  aviso.className='estado';aviso.textContent='Generando las pantallas con tus ejes…';$('pantRegenerar').disabled=true;$('a7MapaDesdePantallas').disabled=true;
  try{
   const qps={},noac={},qgs={};
   for(const F of opciones.fases){
    Progreso.abrir('Pantallas finales',null);Progreso.avance(null,`Mapas polares del ${F.nombre.toLowerCase()}, con y sin atenuación, con tu eje…`);await new Promise(r=>setTimeout(r,30));
    try{await Qps.abrirCaso7({...F.mapa,fase:F.fase,tipo:'ac'});qps[F.fase]=Qps.instantanea();await Qps.abrirCaso7({...F.mapaNoAC,fase:F.fase,tipo:'noac'});noac[F.fase]=Qps.instantanea();}finally{Progreso.cerrar();}
    if(!await F.cargarGat())throw Error('No se pudo recuperar el gatillado del '+F.nombre.toLowerCase()+'.');
    Progreso.abrir('Pantallas finales',null);Progreso.avance(null,`Mapa QGS del ${F.nombre.toLowerCase()} con tu eje…`);await new Promise(r=>setTimeout(r,30));
    try{await Gatillado7.abrir(F.gat);Gatillado7.parar();qgs[F.fase]=Gatillado7.instantanea();}finally{Progreso.cerrar();}
   }
   Progreso.abrir('Pantallas finales',null);Progreso.avance(null,'Armando las pantallas…');await new Promise(r=>setTimeout(r,30));
   try{p.lienzos={splash_noac:pantallaSplash(noac.estres,noac.reposo),splash:pantallaSplash(qps.estres,qps.reposo),qps_noac:pantallaQps(noac.estres,noac.reposo),qps:pantallaQps(qps.estres,qps.reposo),qgs_estres:pantallaQgs(qgs.estres,'Estrés'),qgs_reposo:pantallaQgs(qgs.reposo,'Reposo')};}finally{Progreso.cerrar();}
   p.datos={qps,noac,qgs};p.hechas=true;menu();mostrar(p.actual);
   aviso.className='estado ok';aviso.textContent=`Seis pantallas generadas con tus ejes en ${(performance.now()-t0)/1000>=10?Math.round((performance.now()-t0)/1000):((performance.now()-t0)/1000).toFixed(1).replace('.',',')} s. Compáralas con las que guardó el equipo; en el mapa polar y en el mapa QGS puedes ver el resultado del equipo.`;
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudieron generar las pantallas: '+(err.message||err);console.error(err);}
  finally{$('pantRegenerar').disabled=false;$('a7MapaDesdePantallas').disabled=false;}
 }
 function menu(){const m=$('pantMenu');m.replaceChildren(...TIPOS.map(([k,t])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.dataset.pant=k;b.setAttribute('aria-pressed',String(k===p.actual));b.addEventListener('click',()=>mostrar(k));return b;}));}
 const MASCARA=' Ojo con el reposo con atenuación: el equipo marcó «Mask Failure: QC=4.47». Su máscara incluyó actividad intestinal y el volumen del reposo quedó en 87 ml, frente a 52 ml sin atenuación. Por eso el TID con atenuación sale cerca de 0,5 y aparecen defectos en la base del reposo. La referencia reproduce esa falla, así que tus números del reposo con atenuación también salen inflados.';
 const NOTAS={splash_noac:'Toca la pantalla para verla ampliada. Cortes sin atenuación de las dos fases con tus ejes: 28 ejes cortos del ápex a la base, 14 largos verticales y 14 largos horizontales por fase. Estas son las imágenes con que se interpretó el estudio.',
  splash:'Toca la pantalla para verla ampliada. Cortes con atenuación de las dos fases con tus ejes: 28 ejes cortos del ápex a la base, 14 largos verticales y 14 largos horizontales por fase. Cada fase va en su propia escala de color, como en el equipo.'+MASCARA,
  qps_noac:'Toca la pantalla para verla ampliada. Mapas polares sin atenuación de las dos fases, con tu eje y la receta del equipo. En negro, bajo el límite normal. La reversibilidad es lo que está bajo el límite en estrés y no en reposo. El equipo guardó esta misma pantalla: compárala.',
  qps:'Toca la pantalla para verla ampliada. Mapas polares con atenuación de las dos fases, con tu eje y la receta del equipo. En negro, bajo el límite normal. La reversibilidad es lo que está bajo el límite en estrés y no en reposo. A la derecha, los números y los puntajes por segmento.'+MASCARA,
  qgs_estres:'Toca la pantalla para verla ampliada. Gatillado del estrés con tu eje: cortes en fin de diástole y de sístole, ventrículo en fin de diástole, los cuatro mapas de QGS, curva de volumen y llenado.',
  qgs_reposo:'Toca la pantalla para verla ampliada. Gatillado del reposo con tu eje: cortes en fin de diástole y de sístole, ventrículo en fin de diástole, los cuatro mapas de QGS, curva de volumen y llenado.'};
 function mostrar(k){
  if(!p.lienzos[k])return;p.actual=k;const src=p.lienzos[k],c=$('pantLienzo');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);
  // Terminos dibujados en la pantalla, para «Saber más».
  const T0='Results TID SSS SRS SDS SS% Dataset Recipe OSEM Volume Wall Defect Extent TPD Shape SI Ecc ml k mm Str Rst Rev',T1=k.endsWith('noac')?' NoAC Stress Rest Recon':' AC SC Stress Rest Recon Mask Failure QC';
  c.dataset.terminos=k.startsWith('splash')?'Splash SAX VLA HLA ápex base septum pared lateral anterior inferior '+T0+T1:k.startsWith('qps')?'QPS Extent Reversibility reversibilidad ANT INF SEPT ÁPEX eje corto largo horizontal largo vertical superficie '+T0+T1:'QGS Gated Dataset Recipe OSEM EDV ESV SV EF Shape SI ED ES Ecc LV Volume Filling PER PFR PFR2 MFR/3 TTPF BPM R-R EDV/s ms ml Perfusion Motion Thickening BASE ANT SEPT INF ÁPEX intervalos fin de diástole fin de sístole';
  $('pantTitulo').textContent=TIPOS.find(t=>t[0]===k)[1];$('pantNota').textContent=NOTAS[k];$('pantMascara').hidden=!(k==='splash'||k==='qps');document.querySelectorAll('#pantMenu [data-pant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pant===k)));
 }
 function descargar(){const c=p.lienzos[p.actual];if(!c)return;c.toBlob(b=>{if(!b)return;const a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=`caso7_${p.actual}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);},'image/png');}
 // Tocar la pantalla la abre ampliada, a todo el ancho de la tablet.
 function ampliar(){
  const c=p.lienzos[p.actual];if(!c)return;let d=$('dPantallaGrande');
  if(!d){d=document.createElement('dialog');d.id='dPantallaGrande';d.className='grande';const b=document.createElement('button');b.type='button';b.className='boton otro';b.textContent='Cerrar';b.addEventListener('click',()=>d.close());const im=document.createElement('img');im.alt='Pantalla final ampliada.';im.addEventListener('click',()=>d.close());d.append(b,im);document.body.append(d);}
  d.querySelector('img').src=c.toDataURL('image/png');d.showModal();
 }
 // «Volver a generar» lo maneja el recorrido (caso7.js): primero asegura las reconstrucciones sin atenuacion.
 function iniciar(){$('pantDescargar').addEventListener('click',descargar);$('pantLienzo').addEventListener('click',ampliar);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
 function olvidar(){p.hechas=false;p.lienzos={};p.ultimo=null;p.datos=null;}
 return {generar,mostrar,olvidar,hechas:()=>p.hechas,estado:p};
})();
window.Pantallas7=Pantallas7;

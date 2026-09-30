/* Nucleo de calculo del mapa polar y de las medidas tipo QPS. Sin interfaz: solo numeros.
   Es el algoritmo obtenido por ingenieria inversa de los resultados del equipo en el caso de
   referencia (ver la bitacora). Pasos:
   1. superficie media del miocardio: maximo de cuentas sobre rayos desde el centro;
   2. elipsoide de revolucion con el eje IMPUESTO (el de quien reorienta): se ajustan centro y semiejes;
   3. perfiles de cuentas normales al elipsoide, del apex a la base;
   4. pared: maximo del perfil y ancho a media altura a cada lado; bordes a una fraccion de ese ancho;
   5. mapa polar: valor = maximo del perfil; radio = largo de arco sobre el elipsoide;
   6. medidas: volumen, pared, cuentas, forma, excentricidad, extension, TPD, puntajes.
   Volumen: Float32Array de nx*ny*nz, indice (z*ny+y)*nx+x. Marco: a hacia el apex, u hacia la pared
   lateral (derecha del eje corto), v hacia la pared inferior (abajo). Azimut del mapa: 0 lateral,
   90 inferior, 180 septal, 270 anterior. */
'use strict';
const QpsNucleo=(()=>{
 const NT=96,NF=120,TMAX=165,LARGO=14,PASO=.25,NS=Math.round(LARGO/PASO)+1;
 const ANILLOS=[.20,.48,.72],GIRO_SECTORES=-6,PERCENTIL_100=98.9,MARGEN_CUENTAS=-.05,HOLGURA=3;
 const NOMBRES=['basal anterior','basal anteroseptal','basal inferoseptal','basal inferior','basal inferolateral','basal anterolateral','medio anterior','medio anteroseptal','medio inferoseptal','medio inferior','medio inferolateral','medio anterolateral','apical anterior','apical septal','apical inferior','apical lateral','ápex'];
 const rad=g=>g*Math.PI/180,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cruz=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norma=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};

 function muestra(V,d,x,y,z){
  if(x<0||y<0||z<0||x>d.nx-1||y>d.ny-1||z>d.nz-1)return 0;
  const x0=Math.min(d.nx-2,Math.floor(x)),y0=Math.min(d.ny-2,Math.floor(y)),z0=Math.min(d.nz-2,Math.floor(z)),fx=x-x0,fy=y-y0,fz=z-z0,p=d.nx*d.ny,o=z0*p+y0*d.nx+x0;
  const c00=V[o]*(1-fx)+V[o+1]*fx,c10=V[o+d.nx]*(1-fx)+V[o+d.nx+1]*fx,c01=V[o+p]*(1-fx)+V[o+p+1]*fx,c11=V[o+p+d.nx]*(1-fx)+V[o+p+d.nx+1]*fx;
  return (c00*(1-fy)+c10*fy)*(1-fz)+(c01*(1-fy)+c11*fy)*fz;
 }
 // Gira el eje respecto del marco de referencia: dAz en el plano del eje largo horizontal (hacia
 // la pared lateral), dEl en el vertical (hacia la pared inferior).
 function girar(m,dAz,dEl){
  const a=rad(dAz),b=rad(dEl),e=norma([0,1,2].map(i=>Math.cos(a)*Math.cos(b)*m.a[i]+Math.sin(a)*Math.cos(b)*m.u[i]+Math.sin(b)*m.v[i]));
  const k=dot(m.v,e),v=norma([0,1,2].map(i=>m.v[i]-k*e[i])),u=norma(cruz(e,v));return {a:e,u,v};
 }
 // Minimos cuadrados con perdida robusta, por Gauss-Newton amortiguado y jacobiano numerico.
 function ajustar(res,q0,lo,hi,vueltas=25){
  let q=q0.map((v,i)=>Math.min(hi[i],Math.max(lo[i],v))),lam=1e-2;const n=q.length,F=.1;
  const costo=r=>{let s=0;for(let i=0;i<r.length;i++){const z=(r[i]/F)**2;s+=2*F*F*(Math.sqrt(1+z)-1);}return s;};
  let r=res(q),c=costo(r);
  for(let it=0;it<vueltas;it++){
   const J=[];for(let k=0;k<n;k++){const h=1e-3*Math.max(1,Math.abs(q[k])),q2=q.slice();q2[k]+=h;const r2=res(q2),col=new Float64Array(r.length);for(let i=0;i<r.length;i++)col[i]=(r2[i]-r[i])/h;J.push(col);}
   const w=new Float64Array(r.length);for(let i=0;i<r.length;i++)w[i]=1/Math.sqrt(1+(r[i]/F)**2);
   const A=Array.from({length:n},()=>new Float64Array(n)),g=new Float64Array(n);
   for(let a=0;a<n;a++){for(let b=a;b<n;b++){let s=0;for(let i=0;i<r.length;i++)s+=w[i]*J[a][i]*J[b][i];A[a][b]=A[b][a]=s;}let s=0;for(let i=0;i<r.length;i++)s+=w[i]*J[a][i]*r[i];g[a]=s;}
   let mejoro=false;
   for(let intento=0;intento<8&&!mejoro;intento++){
    const M=A.map((f,i)=>Array.from(f,(v,j)=>v+(i===j?lam*(v+1e-9):0))),d=resolver(M,Array.from(g,v=>-v));if(!d){lam*=10;continue;}
    const q2=q.map((v,i)=>Math.min(hi[i],Math.max(lo[i],v+d[i]))),r2=res(q2),c2=costo(r2);
    if(c2<c){q=q2;r=r2;mejoro=Math.abs(c-c2)>=0;if(c-c2<1e-10*c){c=c2;it=vueltas;}c=c2;lam=Math.max(1e-6,lam/3);mejoro=true;}else lam*=4;
   }
   if(!mejoro)break;
  }
  return q;
 }
 function resolver(M,b){
  const n=b.length,a=M.map((f,i)=>[...f,b[i]]);
  for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(a[k][i])>Math.abs(a[p][i]))p=k;if(Math.abs(a[p][i])<1e-14)return null;[a[i],a[p]]=[a[p],a[i]];
   for(let k=i+1;k<n;k++){const f=a[k][i]/a[i][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}}
  const x=new Array(n);for(let i=n-1;i>=0;i--){let s=a[i][n];for(let j=i+1;j<n;j++)s-=a[i][j]*x[j];x[i]=s/a[i][i];}return x;
 }
 function elipsoideConEje(V,d,O0,m,libre=5){
  let O=O0.slice(),par=null;const rr=[];for(let r=1;r<16;r+=.25)rr.push(r);
  const lo=[O0[0]-libre,O0[1]-libre,O0[2]-libre-2,8,4],hi=[O0[0]+libre,O0[1]+libre,O0[2]+libre+3,18,10];
  for(let vuelta=0;vuelta<3;vuelta++){
   const X=[],w=[];let wmax=0;
   for(let it=0;it<24;it++){const t=rad(8+it*(115-8)/23);for(let f=0;f<360;f+=10){const c=Math.cos(rad(f)),s=Math.sin(rad(f)),dir=[0,1,2].map(i=>Math.sin(t)*(c*m.u[i]+s*m.v[i])+Math.cos(t)*m.a[i]);
     let im=0,vm=-1;for(let k=0;k<rr.length;k++){const v=muestra(V,d,O[0]+rr[k]*dir[0],O[1]+rr[k]*dir[1],O[2]+rr[k]*dir[2]);if(v>vm){vm=v;im=k;}}
     if(im>0&&im<rr.length-1&&vm>0){X.push([O[0]+rr[im]*dir[0],O[1]+rr[im]*dir[1],O[2]+rr[im]*dir[2]]);w.push(vm);if(vm>wmax)wmax=vm;}}}
   const P=[],W=[];for(let i=0;i<X.length;i++)if(w[i]/wmax>.35){P.push(X[i]);W.push(Math.sqrt(w[i]/wmax));}
   if(P.length<40)throw Error('No se encontró la pared del ventrículo con este eje.');
   const res=q=>{const r=new Float64Array(P.length);for(let i=0;i<P.length;i++){const dx=[P[i][0]-q[0],P[i][1]-q[1],P[i][2]-q[2]],t=dot(dx,m.a),r2=Math.max(0,dot(dx,dx)-t*t);r[i]=(Math.sqrt((t/q[3])**2+r2/(q[4]*q[4]))-1)*W[i];}return r;};
   par=ajustar(res,par||[O[0],O[1],O[2],12,7],lo,hi);O=par.slice(0,3);
  }
  return {O,a:par[3],b:par[4],eje:m.a,u:m.u,v:m.v};
 }
 function perfiles(V,d,E){
  const ts=new Float64Array(NT),fs=new Float64Array(NF),s=new Float64Array(NS),prof=new Float32Array(NT*NF*NS),pts=new Float32Array(NT*NF*3),nor=new Float32Array(NT*NF*3);
  for(let i=0;i<NT;i++)ts[i]=(i+.5)/NT*rad(TMAX);for(let j=0;j<NF;j++)fs[j]=rad((j+.5)*360/NF);for(let k=0;k<NS;k++)s[k]=-LARGO/2+k*PASO;
  for(let i=0;i<NT;i++){const st=Math.sin(ts[i]),ct=Math.cos(ts[i]);for(let j=0;j<NF;j++){
   const c=Math.cos(fs[j]),sn=Math.sin(fs[j]),o=(i*NF+j)*3,n=[0,0,0];let l=0;
   for(let q=0;q<3;q++){const r=c*E.u[q]+sn*E.v[q];pts[o+q]=E.O[q]+E.b*st*r+E.a*ct*E.eje[q];n[q]=st/E.b*r+ct/E.a*E.eje[q];l+=n[q]*n[q];}
   l=Math.sqrt(l);for(let q=0;q<3;q++){n[q]/=l;nor[o+q]=n[q];}
   const op=(i*NF+j)*NS;for(let k=0;k<NS;k++)prof[op+k]=muestra(V,d,pts[o]+s[k]*n[0],pts[o+1]+s[k]*n[1],pts[o+2]+s[k]*n[2]);
  }}
  return {t:ts,f:fs,s,prof,pts,nor};
 }
 function mediana(a){const b=Array.from(a).filter(Number.isFinite).sort((x,y)=>x-y);return b.length?(b.length%2?b[b.length>>1]:(b[(b.length>>1)-1]+b[b.length>>1])/2):NaN;}
 function pared(P,ventana=5){
  const n=NT*NF,mid=new Float32Array(n),pico=new Float32Array(n),si=new Float32Array(n).fill(NaN),so=new Float32Array(n).fill(NaN);
  for(let q=0;q<n;q++){const o=q*NS;let k=-1,vm=-1;for(let i=0;i<NS;i++)if(Math.abs(P.s[i])<=ventana&&P.prof[o+i]>vm){vm=P.prof[o+i];k=i;}
   pico[q]=vm;mid[q]=P.s[k];const h=vm/2;let ki=k;while(ki>0&&P.prof[o+ki]>h)ki--;let ko=k;while(ko<NS-1&&P.prof[o+ko]>h)ko++;
   if(P.prof[o+ki]<=h)si[q]=(k-ki)*PASO/1.1774;if(P.prof[o+ko]<=h)so[q]=(ko-k)*PASO/1.1774;}
  const tope=(NS>>1)*PASO/1.1774;let mi=mediana(si),mo=mediana(so);if(!Number.isFinite(mi))mi=tope;if(!Number.isFinite(mo))mo=tope;
  for(let q=0;q<n;q++){if(!Number.isFinite(si[q]))si[q]=mi;if(!Number.isFinite(so[q]))so[q]=mo;}
  return {mid,pico,sin:si,sout:so};
 }
 function suavizar(M,vueltas=2){
  let a=Float32Array.from(M);
  for(let v=0;v<vueltas;v++){const b=new Float32Array(a.length);for(let i=0;i<NT;i++){const i0=Math.max(0,i-1),i1=Math.min(NT-1,i+1);for(let j=0;j<NF;j++){const j0=(j+NF-1)%NF,j1=(j+1)%NF;b[i*NF+j]=(a[i0*NF+j]+a[i1*NF+j]+a[i*NF+j0]+a[i*NF+j1]+4*a[i*NF+j])/8;}}a=b;}
  return a;
 }
 const anillosHasta=(P,tmax)=>{let n=0;while(n<NT&&P.t[n]<=rad(tmax))n++;return n;};
 // Superficie (nsel anillos x NF puntos x 3): puntos del elipsoide desplazados sobre la normal.
 function superficie(P,desp,nsel){const S=new Float32Array(nsel*NF*3);for(let q=0;q<nsel*NF;q++)for(let c=0;c<3;c++)S[q*3+c]=P.pts[q*3+c]+desp[q]*P.nor[q*3+c];return S;}
 function volumenMalla(S,nsel){
  const p=(i,j)=>{const o=(i*NF+((j+NF)%NF))*3;return [S[o],S[o+1],S[o+2]];},tet=(a,b,c)=>dot(a,cruz(b,c))/6,cen=i=>{const c=[0,0,0];for(let j=0;j<NF;j++){const q=p(i,j);c[0]+=q[0];c[1]+=q[1];c[2]+=q[2];}return c.map(v=>v/NF);};
  const apex=cen(0),base=cen(nsel-1);let vol=0;
  for(let j=0;j<NF;j++){vol+=tet(apex,p(0,j+1),p(0,j))+tet(base,p(nsel-1,j),p(nsel-1,j+1));for(let i=0;i<nsel-1;i++)vol+=tet(p(i,j),p(i,j+1),p(i+1,j+1))+tet(p(i,j),p(i+1,j+1),p(i+1,j));}
  return Math.abs(vol);
 }
 function bilineal(M,it,jf){ // M: NT x NF; it fraccionario (acotado), jf fraccionario (ciclico)
  const i=Math.min(NT-1,Math.max(0,it)),i0=Math.min(NT-2,Math.floor(i)),fi=i-i0,j=((jf%NF)+NF)%NF,j0=Math.floor(j),fj=j-j0,j1=(j0+1)%NF;
  return (M[i0*NF+j0]*(1-fj)+M[i0*NF+j1]*fj)*(1-fi)+(M[(i0+1)*NF+j0]*(1-fj)+M[(i0+1)*NF+j1]*fj)*fi;
 }
 // Suma de los voxeles que toca la pared, con muestreo denso.
 function cuentas(V,d,E,P,S,tmax,fe,fp){
  const nt=260,nf=400,toca=new Uint8Array(V.length),pp=d.nx*d.ny;
  for(let i=0;i<nt;i++){const t=(i+.5)/nt*rad(tmax),st=Math.sin(t),ct=Math.cos(t),it=(t-P.t[0])/(P.t[1]-P.t[0]);for(let j=0;j<nf;j++){
   const f=(j+.5)/nf*2*Math.PI,c=Math.cos(f),sn=Math.sin(f),jf=f/(2*Math.PI)*NF-.5,p=[0,0,0],n=[0,0,0];let l=0;
   for(let q=0;q<3;q++){const r=c*E.u[q]+sn*E.v[q];p[q]=E.O[q]+E.b*st*r+E.a*ct*E.eje[q];n[q]=st/E.b*r+ct/E.a*E.eje[q];l+=n[q]*n[q];}l=Math.sqrt(l);
   const mid=bilineal(S.mid,it,jf),si=bilineal(S.si,it,jf),so=bilineal(S.so,it,jf),s0=mid-fe*si-MARGEN_CUENTAS,s1=mid+fp*so+MARGEN_CUENTAS;
   for(let k=0;k<40;k++){const s=s0+k/39*(s1-s0),x=Math.round(p[0]+s*n[0]/l),y=Math.round(p[1]+s*n[1]/l),z=Math.round(p[2]+s*n[2]/l);if(x>=0&&y>=0&&z>=0&&x<d.nx&&y<d.ny&&z<d.nz)toca[z*pp+y*d.nx+x]=1;}
  }}
  let s=0;for(let i=0;i<V.length;i++)if(toca[i])s+=V[i];return s;
 }
 // Largo de arco sobre el elipsoide, normalizado: tabla t -> fraccion.
 function arco(E,tmax,n=2000){const t=new Float64Array(n),g=new Float64Array(n);let ant=0;for(let i=0;i<n;i++){t[i]=i/(n-1)*rad(tmax);const ds=Math.hypot(E.b*Math.cos(t[i]),E.a*Math.sin(t[i]));if(i)g[i]=g[i-1]+(ds+ant)/2*(t[i]-t[i-1]);ant=ds;}const f=g[n-1];for(let i=0;i<n;i++)g[i]/=f;return {t,g};}
 function interp(x,xs,ys){if(x<=xs[0])return ys[0];const n=xs.length;if(x>=xs[n-1])return ys[n-1];let a=0,b=n-1;while(b-a>1){const m=(a+b)>>1;if(xs[m]<=x)a=m;else b=m;}return ys[a]+(ys[b]-ys[a])*(x-xs[a])/(xs[b]-xs[a]);}
 // Mapa (NT x NF) al disco N x N. Devuelve tambien radio, angulo (grados) y elevacion de cada pixel.
 function disco(M,P,E,tmax,N){
  const T=arco(E,tmax),A=new Float32Array(N*N),rho=new Float32Array(N*N),ang=new Float32Array(N*N),tt=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const X=(x+.5)/N*2-1,Y=(y+.5)/N*2-1,r=Math.hypot(X,Y),f=(Math.atan2(Y,X)+2*Math.PI)%(2*Math.PI),o=y*N+x,t=interp(Math.min(1,r),T.g,T.t);
   rho[o]=r;ang[o]=f*180/Math.PI;tt[o]=t;A[o]=bilineal(M,(t-P.t[0])/(P.t[1]-P.t[0]),f/(2*Math.PI)*NF-.5);}
  return {A,rho,ang,tt,N};
 }
 const T6=[5,4,3,2,1,6],T4=[16,15,14,13];
 function segmentos(D){
  const s=new Uint8Array(D.rho.length);
  for(let o=0;o<s.length;o++){const r=D.rho[o];if(r>=1)continue;const a=D.ang[o];
   s[o]=r<ANILLOS[0]?17:r<ANILLOS[1]?T4[Math.floor((((a+45)%360)+360)%360/90)]:(T6[Math.floor((((a-GIRO_SECTORES)%360)+360)%360/60)]+(r<ANILLOS[2]?6:0));}
  return s;
 }
 function percentil(a,p){const b=Float32Array.from(a).sort();return b[Math.min(b.length-1,Math.max(0,Math.floor(p/100*(b.length-1))))];}
 function desenfocar(a,N,sigma){ // gaussiano separable con borde reflejado
  const r=Math.ceil(3*sigma),k=[];let s=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));k.push(v);s+=v;}const ref=i=>i<0?-i-1:i>=N?2*N-i-1:i;
  const b=new Float32Array(N*N),c=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=0;for(let i=-r;i<=r;i++)v+=a[y*N+ref(x+i)]*k[i+r];b[y*N+x]=v/s;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=0;for(let i=-r;i<=r;i++)v+=b[ref(y+i)*N+x]*k[i+r];c[y*N+x]=v/s;}
  return c;
 }

 /* Una evaluacion completa. cal: {base, fe, fp} (grados y fracciones de sigma). Devuelve medidas
    sin ajustar, mapas en el disco y superficies. */
 function evaluar(V,d,marco,O0,cal,sp,N=192){
  const E=elipsoideConEje(V,d,O0,marco),P=perfiles(V,d,E),W=pared(P),S={mid:suavizar(W.mid),si:suavizar(W.sin),so:suavizar(W.sout)};
  return medir(V,d,E,P,W,S,cal,sp,N);
 }
 function limiteBasal(P,W){
  const an=new Float64Array(NT);let mx=0;for(let i=0;i<NT;i++){let s=0;for(let j=0;j<NF;j++){const v=W.pico[i*NF+j];s+=v;if(P.t[i]<rad(120)&&v>mx)mx=v;}an[i]=s/NF;}
  for(let i=1;i<NT;i++)if(P.t[i]>rad(95)&&an[i]<.425*mx){const f=(an[i-1]-.425*mx)/(an[i-1]-an[i]);return (P.t[i-1]+f*(P.t[i]-P.t[i-1]))*180/Math.PI;}
  return TMAX;
 }
 function medir(V,d,E,P,W,S,cal,sp,N){
  const nsel=anillosHasta(P,cal.base),n=NT*NF,dm=S.mid,de=new Float32Array(n),dp=new Float32Array(n),gr=new Float32Array(n);
  for(let q=0;q<n;q++){de[q]=S.mid[q]-cal.fe*S.si[q];dp[q]=S.mid[q]+cal.fp*S.so[q];gr[q]=cal.fe*S.si[q]+cal.fp*S.so[q];}
  const Sm=superficie(P,dm,nsel),Se=superficie(P,de,nsel),Sp=superficie(P,dp,nsel),ml=sp**3/1000,cav=volumenMalla(Se,nsel)*ml,par=volumenMalla(Sp,nsel)*ml-cav;
  // forma: mayor diametro medio del borde interno / largo de la superficie media sobre el eje
  let tmin=Infinity,tmax=-Infinity,dmax=0;
  for(let q=0;q<nsel*NF;q++){const t=(Sm[q*3]-E.O[0])*E.eje[0]+(Sm[q*3+1]-E.O[1])*E.eje[1]+(Sm[q*3+2]-E.O[2])*E.eje[2];if(t<tmin)tmin=t;if(t>tmax)tmax=t;}
  for(let i=0;i<nsel;i++){let s=0;for(let j=0;j<NF/2;j++){const a=(i*NF+j)*3,b=(i*NF+j+NF/2)*3;s+=Math.hypot(Se[a]-Se[b],Se[a+1]-Se[b+1],Se[a+2]-Se[b+2]);}s/=NF/2;if(s>dmax)dmax=s;}
  const sel=new Float32Array(nsel*NF);for(let q=0;q<sel.length;q++)sel[q]=W.pico[q];const ref=percentil(sel,PERCENTIL_100);
  const D=disco(W.pico,P,E,cal.base,N),G=disco(gr,P,E,cal.base,N),area=new Float32Array(N*N),vol=new Float32Array(N*N);
  for(let o=0;o<N*N;o++){D.A[o]=100*D.A[o]/ref;if(D.rho[o]<1){area[o]=E.b*Math.sin(D.tt[o])/Math.max(D.rho[o],1e-3);vol[o]=area[o]*G.A[o];}}
  return {E,P,W,S,nsel,Sm,Se,Sp,cal,sp,N,A:D.A,rho:D.rho,ang:D.ang,tt:D.tt,area,vol,seg:segmentos(D),valor100:ref,
   medidas:{volumen:cav,pared:par,cuentas:cuentas(V,d,E,P,S,cal.base,cal.fe,cal.fp)/1000,forma:dmax/(tmax-tmin),excentricidad:Math.sqrt(1-(E.b/E.a)**2),largo:(tmax-tmin)*sp,semiejeLargo:E.a*sp,semiejeCorto:E.b*sp}};
 }
 // Calibracion en la condicion de referencia: bordes que dan el volumen y la pared del equipo; si
 // hay cuentas del equipo, la base es la que ademas da sus cuentas.
 // previa: calibracion ya hecha y guardada ({base, fe, fp}); si viene, no se busca de nuevo.
 function calibrar(V,d,marco,O0,sp,obj,N=192,previa=null){
  const E=elipsoideConEje(V,d,O0,marco),P=perfiles(V,d,E),W=pared(P),S={mid:suavizar(W.mid),si:suavizar(W.sin),so:suavizar(W.sout)},ml=sp**3/1000;
  if(previa&&Number.isFinite(previa.base)&&Number.isFinite(previa.fe)&&Number.isFinite(previa.fp))return {E,P,W,S,cal:{base:previa.base,fe:previa.fe,fp:previa.fp},calibrado:!!obj};
  if(!obj)return {E,P,W,S,cal:{base:limiteBasal(P,W),fe:.45,fp:.56},calibrado:false};
  const vols=(base,fe,fp)=>{const nsel=anillosHasta(P,base),n=NT*NF,de=new Float32Array(n),dp=new Float32Array(n);for(let q=0;q<n;q++){de[q]=S.mid[q]-fe*S.si[q];dp[q]=S.mid[q]+fp*S.so[q];}const c=volumenMalla(superficie(P,de,nsel),nsel)*ml;return [c,volumenMalla(superficie(P,dp,nsel),nsel)*ml-c];};
  const biseccion=(f,a,b)=>{let fa=f(a),fb=f(b);if(fa*fb>0)return null;for(let i=0;i<40;i++){const m=(a+b)/2,fm=f(m);if(fa*fm<=0){b=m;fb=fm;}else{a=m;fa=fm;}}return (a+b)/2;};
  const factores=base=>{const fe=biseccion(x=>vols(base,x,.5)[0]-obj.volumen,.05,1.5);if(fe===null)return null;const fp=biseccion(x=>vols(base,fe,x)[1]-obj.pared,.02,2);return fp===null?null:{base,fe,fp};};
  let mejor=null;
  if(obj.base)mejor=factores(obj.base);
  else for(let base=124;base<=150;base++){const c=factores(base);if(!c)continue;const e=Math.abs(cuentas(V,d,E,P,S,base,c.fe,c.fp)/1000-obj.cuentas);if(!mejor||e<mejor.e)mejor={...c,e};}
  if(!mejor)throw Error('No se pudo calibrar: con ninguna base se llega al volumen y la pared del equipo.');
  return {E,P,W,S,cal:{base:mejor.base,fe:mejor.fe,fp:mejor.fp},calibrado:true};
 }
 /* Zona anormal de referencia cuando no se tiene el mapa del equipo: dentro de los segmentos que
    el equipo puntuo, los puntos mas bajos respecto de lo mejor de su anillo, hasta completar la
    extension que informo (peso por volumen de pared). */
 /* previa: zona conocida en otro mapa del mismo paciente (Uint8Array np x np, misma orientacion
    del disco); sus puntos entran primero. Dentro de lo demas entran antes los segmentos con mas
    puntaje del equipo. */
 function zonaPorPuntajes(R,puntajes,objetivo,previa=null,np=0){
  const N=R.N,M=N*N,anillo=new Uint8Array(M),ref=new Float64Array(40),cand=new Uint8Array(M);let total=0;
  for(let o=0;o<M;o++){anillo[o]=Math.min(39,Math.floor(R.rho[o]*40));if(R.rho[o]<1){total+=R.vol[o];if(puntajes[R.seg[o]])cand[o]=1;}}
  for(let k=0;k<40;k++){const v=[];for(let o=0;o<M;o++)if(anillo[o]===k&&R.rho[o]<1)v.push(R.A[o]);ref[k]=v.length?percentil(v,85):0;}
  const rs=new Float64Array(40);for(let k=0;k<40;k++){let s=0;for(let i=-2;i<=2;i++)s+=ref[Math.min(39,Math.max(0,k+i))];rs[k]=s/5;}
  const q=new Float32Array(M);for(let o=0;o<M;o++)q[o]=R.A[o]/Math.max(rs[anillo[o]],1e-6);const razon=desenfocar(q,N,2*N/256);
  const clave=new Float32Array(M);for(let o=0;o<M;o++){let k=razon[o]-.02*(puntajes[R.seg[o]]||0);if(previa){const x=o%N,y=(o-x)/N,px=Math.min(np-1,Math.floor((x+.5)/N*np)),py=Math.min(np-1,Math.floor((y+.5)/N*np));if(previa[py*np+px])k-=.3;}clave[o]=k;}
  const ext=T=>{let s=0;for(let o=0;o<M;o++)if(cand[o]&&clave[o]<T)s+=R.vol[o];return 100*s/total;};
  let a=-1,b=3;if(ext(b)<objetivo)a=b;else for(let i=0;i<50;i++){const m=(a+b)/2;if(ext(m)<objetivo)a=m;else b=m;}
  const z=new Uint8Array(M);for(let o=0;o<M;o++)if(cand[o]&&clave[o]<b)z[o]=1;return {zona:z,umbral:100*b};
 }
 /* Limite normal de este paciente: campo suave desde el borde de la zona, forzado a quedar sobre el
    valor dentro de la zona y con holgura bajo el valor fuera. */
 function limiteDesdeZona(R,z){
  const N=R.N,M=N*N,bx=[],by=[],bv=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const o=y*N+x;if(R.rho[o]>=1)continue;let borde=false;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=N||Y>=N)continue;if(z[Y*N+X]!==z[o]){borde=true;break;}}if(borde){bx.push(x);by.push(y);bv.push(R.A[o]);}}
  const L=new Float32Array(M),dist=new Float32Array(M);
  // Sin zona (estudio normal, extension 0 en el equipo): el limite no puede seguir cada pixel con la holgura minima,
  // porque un giro de medio grado ya lo cruza. Va bajo el mapa suavizado, con 5 puntos mas de holgura, que crece hacia la base.
  if(!bx.length){const As=desenfocar(R.A,N,3*N/256);for(let o=0;o<M;o++)L[o]=R.rho[o]<1?Math.min(R.A[o],As[o])-(HOLGURA+5+(R.rho[o]>.75?(R.rho[o]-.75)/.25*9:0)):-1e9;return L;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let m=Infinity,k=0;for(let i=0;i<bx.length;i++){const q=(bx[i]-x)**2+(by[i]-y)**2;if(q<m){m=q;k=i;}}L[y*N+x]=bv[k];dist[y*N+x]=Math.sqrt(m);}
  const Ls=desenfocar(L,N,3*N/256),h=6*N/256;
  for(let o=0;o<M;o++){if(R.rho[o]>=1){Ls[o]=-1e9;continue;}// hacia la base las cuentas caen rapido y cambian mucho con el eje: ahi la holgura crece
   const hol=HOLGURA+(R.rho[o]>.75?(R.rho[o]-.75)/.25*9:0);Ls[o]=z[o]?Math.max(Ls[o],R.A[o]+1):Math.min(Ls[o],R.A[o]-(dist[o]>h?hol:1));}
  return Ls;
 }
 // El limite de la referencia llevado, lugar por lugar, a la geometria de otra evaluacion.
 function limiteEn(ref,L,X){
  const N=X.N,M=N*N,out=new Float32Array(M),Er=ref.E,T=arco(Er,ref.cal.base),tfin=rad(ref.cal.base);
  for(let o=0;o<M;o++){if(X.rho[o]>=1){out[o]=-1e9;continue;}
   const t=X.tt[o],f=rad(X.ang[o]),st=Math.sin(t),ct=Math.cos(t),c=Math.cos(f),s=Math.sin(f),it=(t-X.P.t[0])/(X.P.t[1]-X.P.t[0]),jf=f/(2*Math.PI)*NF-.5,mid=bilineal(X.S.mid,it,jf),p=[0,0,0],n=[0,0,0];let l=0;
   for(let q=0;q<3;q++){const r=c*X.E.u[q]+s*X.E.v[q];p[q]=X.E.O[q]+X.E.b*st*r+X.E.a*ct*X.E.eje[q];n[q]=st/X.E.b*r+ct/X.E.a*X.E.eje[q];l+=n[q]*n[q];}l=Math.sqrt(l);
   const d=[0,1,2].map(q=>p[q]+mid*n[q]/l-Er.O[q]),z=dot(d,Er.eje),ru=dot(d,Er.u),rv=dot(d,Er.v),tr=Math.atan2(Math.hypot(ru,rv)/Er.b,z/Er.a);
   if(tr>tfin){out[o]=-1e9;continue;}
   const fr=(Math.atan2(rv,ru)+2*Math.PI)%(2*Math.PI),rho=interp(tr,T.t,T.g),x=(rho*Math.cos(fr)+1)/2*ref.N-.5,y=(rho*Math.sin(fr)+1)/2*ref.N-.5;
   const x0=Math.min(ref.N-2,Math.max(0,Math.floor(x))),y0=Math.min(ref.N-2,Math.max(0,Math.floor(y))),fx=Math.min(1,Math.max(0,x-x0)),fy=Math.min(1,Math.max(0,y-y0)),g=(i,j)=>Math.max(L[j*ref.N+i],-200);
   out[o]=(g(x0,y0)*(1-fx)+g(x0+1,y0)*fx)*(1-fy)+(g(x0,y0+1)*(1-fx)+g(x0+1,y0+1)*fx)*fy;}
  return out;
 }
 // Extension (peso por volumen de pared), extension por area, porcentaje anormal y valor medio por segmento.
 function perfusion(X,L){
  const M=X.N*X.N,z=new Uint8Array(M),num=new Float64Array(18),den=new Float64Array(18),val=new Float64Array(18);let sv=0,tv=0,sa=0,ta=0;
  for(let o=0;o<M;o++){if(X.rho[o]>=1)continue;const an=X.A[o]<L[o];z[o]=an?1:0;tv+=X.vol[o];ta+=X.area[o];if(an){sv+=X.vol[o];sa+=X.area[o];}const s=X.seg[o];den[s]+=X.area[o];val[s]+=X.area[o]*X.A[o];if(an)num[s]+=X.area[o];}
  const pct={},medio={};for(let s=1;s<=17;s++){pct[s]=100*num[s]/(den[s]||1);medio[s]=val[s]/(den[s]||1);}
  return {zona:z,extension:100*sv/tv,extensionArea:100*sa/ta,porcentaje:pct,valor:medio};
 }
 const puntaje=(valor,ref)=>Math.min(4,Math.max(0,Math.ceil((1-valor/ref)*10-1e-9)));
 return {NT,NF,NOMBRES,ANILLOS,segmentos,superficie,volumenMalla,limiteBasal,girar,elipsoideConEje,perfiles,pared,suavizar,evaluar,medir,calibrar,zonaPorPuntajes,limiteDesdeZona,limiteEn,perfusion,puntaje,disco,arco,muestra,desenfocar,anillosHasta};
})();
if(typeof module!=='undefined')module.exports=QpsNucleo;else window.QpsNucleo=QpsNucleo;

// usage: THEME=green node shot.js snap 1.0 2.0 ... | THEME=green node shot.js render 26.5
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [,,mode,...ts]=process.argv;const th=process.env.THEME||'green';const out=process.env.OUT||'.';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+process.cwd()+'/index.html?theme='+th);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);await p.evaluate(()=>{fitAll();render(0)});
if(mode==='snap'){for(const t of ts){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`${out}/snap_${th}_${t}.jpg`,type:'jpeg',quality:70})}}
else{const fps=30,dur=+ts[0];const dir=`${out}/frames_${th}`;fs.mkdirSync(dir,{recursive:true});
 for(let i=0;i<Math.round(dur*fps);i++){await p.evaluate(t=>render(t),i/fps);await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:95})}}
await b.close()})();

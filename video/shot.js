const {chromium}=require('playwright');
(async()=>{const [,,mode,...ts]=process.argv;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+process.cwd()+'/index.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
if(mode==='snap'){for(const t of ts){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`../snap_${t}.jpg`,type:'jpeg',quality:70})}}
else{const fps=30,dur=+ts[0];require('fs').mkdirSync('../frames',{recursive:true});
 for(let i=0;i<Math.round(dur*fps);i++){await p.evaluate(t=>render(t),i/fps);await p.screenshot({path:`../frames/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:95})}}
await b.close()})();

const { chromium } = require(process.env.PWPATH);
const { spawn } = require('child_process');
(async()=>{
  const FPS=30;
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:2});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+process.env.V+'/reel.html');await p.waitForFunction(()=>window.__ready);
  const dur=await p.evaluate(()=>window.DURATION); const N=Math.round(dur*FPS);
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
    '-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p','-profile:v','high','-level','5.2',
    '-x264-params','aq-mode=3','-r',String(FPS),'-movflags','+faststart', process.env.OUT]);
  ff.stderr.on('data',d=>process.stderr.write(d));
  for(let i=0;i<N;i++){
    await p.evaluate(t=>render(t), i/FPS);
    const buf=await p.screenshot({type:'jpeg',quality:97});
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    if(i%100===0) console.log('frame',i,'/',N, new Date().toISOString());
  }
  ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close(); console.log('done');
})();

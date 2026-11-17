const $=id=>document.getElementById(id);
export function placeBubble(view,dialogue,frame){
 const el=$('dialogue');el.classList.toggle('hidden',!dialogue);if(!dialogue)return;
 $('dialogue-text').setAttribute('aria-label',dialogue.text);$('dialogue-visible').textContent=frame.text;$('dialogue-pending').textContent=frame.remaining;el.dataset.fullText=dialogue.text;el.classList.toggle('whisper',dialogue.mode==='whisper');
 const head=view.headScreen(dialogue.speaker);if(!head)return;const w=el.offsetWidth,h=el.offsetHeight;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),baseTop=clamp(head.y-h-25,8,view.height-h-15),baseLeft=clamp(head.x-w/2,8,view.width-w-8);
 const faces=view.faceRects().map(r=>({...r,left:r.left-8,right:r.right+8,top:Math.min(r.top,view.headScreen(r.id).y-4),bottom:r.bottom+4}));
 const xs=[head.x-w/2,head.x-w+35,head.x-35].map(x=>clamp(x,8,view.width-w-8));
 const ys=[baseTop,...faces.map(r=>r.top-h-12)].map(y=>clamp(y,8,view.height-h-15));
 const score=({left,top})=>faces.reduce((sum,r)=>sum+Math.max(0,Math.min(left+w,r.right)-Math.max(left,r.left))*Math.max(0,Math.min(top+h,r.bottom)-Math.max(top,r.top)),0);
 const candidates=ys.flatMap(top=>xs.map(left=>({left,top}))),travel=p=>(p.left-baseLeft)**2+(p.top-baseTop)**2;
 const {left,top}=candidates.sort((a,b)=>score(a)-score(b)||travel(a)-travel(b))[0];el.style.left=`${left}px`;el.style.top=`${top}px`;el.style.setProperty('--tail-x',`${clamp(head.x-left,18,w-18)}px`);
 el.dataset.speaker=dialogue.speaker;el.dataset.to=dialogue.to.join(',');el.dataset.mode=dialogue.mode;
}

'use strict';
(()=>{
 const api=window.FrontierCrowns;
 let equipped={},busy=false;
 const dialog=document.createElement('dialog');dialog.id='crownShop';
 dialog.innerHTML='<div class="eyebrow">FRONTIER / CROWN SHOP</div><h2>Make your kingdom yours.</h2><p id="shopBalance"></p><p class="hint">Permanent purchases saved in this browser on this website. Cosmetics give no combat advantage. War unlock is for hosting or starting new games; joining a friend is free.</p><div id="shopItems"></div><p id="shopStatus" role="status" aria-live="polite"></p><button id="closeCrownShop" class="primary">Done</button>';
 document.body.append(dialog);
 const status=document.getElementById('shopStatus');
 function sync(){
  try{
   const w=api.snapshot();equipped=w.equipped;
   document.getElementById('shopBalance').textContent=w.silver.toLocaleString()+' Silver Crowns · '+w.gold.toLocaleString()+' Gold Crowns';
   const list=document.getElementById('shopItems');list.replaceChildren();
   for(const kind of ['mode','banner','palette','castle']){
    const heading=document.createElement('h3');heading.textContent={mode:'Game mode',banner:'Banner designs',palette:'Army palettes',castle:'Castle skins'}[kind];list.append(heading);
    if(kind!=='mode'){
     const row=document.createElement('div');row.className='shop-row';const label=document.createElement('span');label.textContent='Original';
     const b=document.createElement('button');b.textContent=equipped[kind]?'Equip':'Equipped';b.disabled=busy||!equipped[kind];b.onclick=()=>act(()=>api.resetCosmetic(kind),'Original equipped.');row.append(label,b);list.append(row);
    }
    for(const [id,item]of Object.entries(api.items).filter(([,i])=>i.kind===kind)){
     const owned=w.owned.includes(id),active=equipped[kind]===id;
     const row=document.createElement('div');row.className='shop-row';
     const label=document.createElement('span');label.textContent=item.name+' · '+item.price+' Silver';
     const b=document.createElement('button');b.textContent=owned?(kind==='mode'?'Unlocked':active?'Equipped':'Equip'):'Buy';
     b.disabled=busy||(owned&&(active||kind==='mode'));
     b.onclick=()=>act(()=>api.transact(id,owned),owned?'Equipped.':'Purchased'+(kind==='mode'?'.':' and equipped.'));
     row.append(label,b);list.append(row);
    }
   }
   for(const id of ['gameMode','hostGameMode']){
    const select=document.getElementById(id),option=select?.querySelector('option[value="war"]');
    if(option){option.disabled=!w.owned.includes('war');option.textContent=w.owned.includes('war')?'War — claimed land stays yours':'War — unlock for 500 Silver Crowns';if(option.disabled&&select.value==='war')select.value='classic'}
   }
  }catch(e){status.textContent=e.message||'Browser storage is unavailable.'}
 }
 async function act(fn,message){if(busy)return;busy=true;sync();try{await fn();status.textContent=message}catch(e){status.textContent=e.message||'Purchase could not be saved. Try again.'}finally{busy=false;sync()}}
 function open(){sync();if(!dialog.open)dialog.showModal()}
 document.getElementById('closeCrownShop').onclick=()=>dialog.close();
 for(const id of ['introSettings','settingsButton']){
  const anchor=document.getElementById(id);if(!anchor)continue;
  const b=document.createElement('button');b.textContent='Crown Shop';b.onclick=open;anchor.insertAdjacentElement('afterend',b);
 }
 // Gate new matches without interfering with existing saves or joining a host.
 document.addEventListener('click',e=>{
  const id=e.target.closest?.('button')?.id,select=id==='start'?'gameMode':id==='hostRoom'?'hostGameMode':null;
  if(select&&document.getElementById(select)?.value==='war'&&!api.hasUnlock('war')){
   e.preventDefault();e.stopImmediatePropagation();open();status.textContent='Unlock War for 500 Silver Crowns to start this mode.';
  }
 },true);
 window.addEventListener('storage',e=>{if(e.key==='frontier-crowns-v1')sync()});
 window.FrontierShop={open,color:fallback=>api.items[equipped.palette]?.color||fallback,
 draw(ctx,e,p,z){
  if(e.side!==0)return;
  const banner=equipped.banner,skin=equipped.castle;
  ctx.save();
  if(e.type==='banner'&&banner){
   const x=p.x+z*.3,y=p.y-z*.8,w=z*.55,h=z*.36;
   ctx.fillStyle='#e8d6a1';ctx.fillRect(x,y,w,h);ctx.fillStyle='#294c62';
   if(banner==='banner-cross'){ctx.fillRect(x+w*.36,y,w*.2,h);ctx.fillRect(x,y+h*.36,w,h*.2)}
   else{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.5,y+h*.55);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h*.3);ctx.lineTo(x+w*.5,y+h*.85);ctx.lineTo(x,y+h*.3);ctx.fill()}
   ctx.fillStyle='#d4c7a3';ctx.fillRect(x-z*.05,y,z*.05,z);
  }
  if(e.type==='castle'&&skin){
   ctx.strokeStyle=skin==='castle-royal'?'#f1d578':'#c0d0dd';ctx.lineWidth=Math.max(1,z*.08);
   ctx.strokeRect(p.x-z*.68,p.y-z*.68,z*1.36,z*1.36);
   ctx.fillStyle=ctx.strokeStyle;
   if(skin==='castle-royal'){ctx.beginPath();ctx.moveTo(p.x-z*.38,p.y-z*.82);ctx.lineTo(p.x-z*.42,p.y-z*1.2);ctx.lineTo(p.x-z*.13,p.y-z*.98);ctx.lineTo(p.x,p.y-z*1.35);ctx.lineTo(p.x+z*.13,p.y-z*.98);ctx.lineTo(p.x+z*.42,p.y-z*1.2);ctx.lineTo(p.x+z*.38,p.y-z*.82);ctx.fill()}
   else for(const dx of [-.8,.55]){ctx.fillRect(p.x+z*dx,p.y-z*.95,z*.25,z*.5);ctx.fillRect(p.x+z*dx,p.y+z*.45,z*.25,z*.35)}
  }
  ctx.restore();
 }};
 sync();
})();

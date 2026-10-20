// The verified reading surface belongs to the page, not a failed WebGL request.
// A retry or real page teardown retires it; graphics failure leaves readable cards.
export function createC02ContentSession({win=globalThis}={}){
 let disposed=false,generation=0,controller=null,content=null;
 const retire=()=>{controller?.abort();controller=null;content?.dispose();content=null;};
 const onHide=event=>{if(!event.persisted)dispose();};
 function dispose(){if(disposed)return;disposed=true;generation++;retire();win.removeEventListener('pagehide',onHide);}
 win.addEventListener('pagehide',onHide);
 return {
  begin(){retire();if(disposed)return null;const token=++generation;controller=new AbortController();return {signal:controller.signal,current:()=>!disposed&&token===generation&&!controller?.signal.aborted};},
  adopt(ticket,handle){if(!ticket?.current()){handle?.dispose();return false;}content=handle;return true;},
  update(){if(!disposed)content?.update();},dispose
 };
}

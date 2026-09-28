// Pointer events support both iPad swipes and mouse drags without intercepting HUD buttons.
export function createCameraControls(canvas,onChange=()=>{}){
 let pointer=null,lastX=0,lastY=0,yaw=0,tilt=0,dragged=false,startX=0,startY=0;
 const notify=()=>onChange(Math.abs(yaw)>.01||Math.abs(tilt)>.01);
 const down=e=>{if(pointer!==null||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;pointer=e.pointerId;lastX=startX=e.clientX;lastY=startY=e.clientY;dragged=false;canvas.setPointerCapture?.(pointer);};
 const move=e=>{if(e.pointerId!==pointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;if(!dragged&&Math.hypot(e.clientX-startX,e.clientY-startY)<4)return;dragged=true;yaw-=dx*.006;yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));tilt=Math.max(-.26,Math.min(.65,tilt+dy*.004));e.preventDefault?.();notify();};
 const up=e=>{if(e.pointerId!==pointer)return;if(canvas.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);pointer=null;};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
 return {get yaw(){return yaw;},get tilt(){return tilt;},get active(){return Math.abs(yaw)>.01||Math.abs(tilt)>.01;},reset(){yaw=tilt=0;pointer=null;notify();}};
}

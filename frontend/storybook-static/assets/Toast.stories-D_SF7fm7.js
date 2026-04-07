import{j as y}from"./jsx-runtime-DOprRnkm.js";import{r as d}from"./iframe-UwHWAuAG.js";import"./preload-helper-Dp1pzeXC.js";let re={data:""},oe=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||re},ae=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,se=/\/\*[^]*?\*\/|  +/g,B=/\n+/g,w=(e,t)=>{let r="",a="",n="";for(let s in e){let o=e[s];s[0]=="@"?s[1]=="i"?r=s+" "+o+";":a+=s[1]=="f"?w(o,s):s+"{"+w(o,s[1]=="k"?"":t)+"}":typeof o=="object"?a+=w(o,t?t.replace(/([^,])+/g,i=>s.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,l=>/&/.test(l)?l.replace(/&/g,i):i?i+" "+l:l)):s):o!=null&&(s=/^--/.test(s)?s:s.replace(/[A-Z]/g,"-$&").toLowerCase(),n+=w.p?w.p(s,o):s+":"+o+";")}return r+(t&&n?t+"{"+n+"}":n)+a},v={},Q=e=>{if(typeof e=="object"){let t="";for(let r in e)t+=r+Q(e[r]);return t}return e},ne=(e,t,r,a,n)=>{let s=Q(e),o=v[s]||(v[s]=(l=>{let u=0,p=11;for(;u<l.length;)p=101*p+l.charCodeAt(u++)>>>0;return"go"+p})(s));if(!v[o]){let l=s!==e?e:(u=>{let p,c,f=[{}];for(;p=ae.exec(u.replace(se,""));)p[4]?f.shift():p[3]?(c=p[3].replace(B," ").trim(),f.unshift(f[0][c]=f[0][c]||{})):f[0][p[1]]=p[2].replace(B," ").trim();return f[0]})(e);v[o]=w(n?{["@keyframes "+o]:l}:l,r?"":"."+o)}let i=r&&v.g?v.g:null;return r&&(v.g=v[o]),((l,u,p,c)=>{c?u.data=u.data.replace(c,l):u.data.indexOf(l)===-1&&(u.data=p?l+u.data:u.data+l)})(v[o],t,a,i),o},ie=(e,t,r)=>e.reduce((a,n,s)=>{let o=t[s];if(o&&o.call){let i=o(r),l=i&&i.props&&i.props.className||/^go/.test(i)&&i;o=l?"."+l:i&&typeof i=="object"?i.props?"":w(i,""):i===!1?"":i}return a+n+(o??"")},"");function O(e){let t=this||{},r=e.call?e(t.p):e;return ne(r.unshift?r.raw?ie(r,[].slice.call(arguments,1),t.p):r.reduce((a,n)=>Object.assign(a,n&&n.call?n(t.p):n),{}):r,oe(t.target),t.g,t.o,t.k)}let V,_,z;O.bind({g:1});let x=O.bind({k:1});function le(e,t,r,a){w.p=t,V=e,_=r,z=a}function k(e,t){let r=this||{};return function(){let a=arguments;function n(s,o){let i=Object.assign({},s),l=i.className||n.className;r.p=Object.assign({theme:_&&_()},i),r.o=/ *go\d+/.test(l),i.className=O.apply(r,a)+(l?" "+l:"");let u=e;return e[0]&&(u=i.as||e,delete i.as),z&&u[0]&&z(i),V(u,i)}return t?t(n):n}}var de=e=>typeof e=="function",I=(e,t)=>de(e)?e(t):e,ce=(()=>{let e=0;return()=>(++e).toString()})(),W=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ue=20,F="default",G=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(o=>o.id===t.toast.id?{...o,...t.toast}:o)};case 2:let{toast:a}=t;return G(e,{type:e.toasts.find(o=>o.id===a.id)?1:0,toast:a});case 3:let{toastId:n}=t;return{...e,toasts:e.toasts.map(o=>o.id===n||n===void 0?{...o,dismissed:!0,visible:!1}:o)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(o=>o.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let s=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(o=>({...o,pauseDuration:o.pauseDuration+s}))}}},S=[],J={toasts:[],pausedAt:void 0,settings:{toastLimit:ue}},b={},X=(e,t=F)=>{b[t]=G(b[t]||J,e),S.forEach(([r,a])=>{r===t&&a(b[t])})},ee=e=>Object.keys(b).forEach(t=>X(e,t)),pe=e=>Object.keys(b).find(t=>b[t].toasts.some(r=>r.id===e)),D=(e=F)=>t=>{X(t,e)},me={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},fe=(e={},t=F)=>{let[r,a]=d.useState(b[t]||J),n=d.useRef(b[t]);d.useEffect(()=>(n.current!==b[t]&&a(b[t]),S.push([t,a]),()=>{let o=S.findIndex(([i])=>i===t);o>-1&&S.splice(o,1)}),[t]);let s=r.toasts.map(o=>{var i,l,u;return{...e,...e[o.type],...o,removeDelay:o.removeDelay||((i=e[o.type])==null?void 0:i.removeDelay)||(e==null?void 0:e.removeDelay),duration:o.duration||((l=e[o.type])==null?void 0:l.duration)||(e==null?void 0:e.duration)||me[o.type],style:{...e.style,...(u=e[o.type])==null?void 0:u.style,...o.style}}});return{...r,toasts:s}},ge=(e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(r==null?void 0:r.id)||ce()}),E=e=>(t,r)=>{let a=ge(t,e,r);return D(a.toasterId||pe(a.id))({type:2,toast:a}),a.id},m=(e,t)=>E("blank")(e,t);m.error=E("error");m.success=E("success");m.loading=E("loading");m.custom=E("custom");m.dismiss=(e,t)=>{let r={type:3,toastId:e};t?D(t)(r):ee(r)};m.dismissAll=e=>m.dismiss(void 0,e);m.remove=(e,t)=>{let r={type:4,toastId:e};t?D(t)(r):ee(r)};m.removeAll=e=>m.remove(void 0,e);m.promise=(e,t,r)=>{let a=m.loading(t.loading,{...r,...r==null?void 0:r.loading});return typeof e=="function"&&(e=e()),e.then(n=>{let s=t.success?I(t.success,n):void 0;return s?m.success(s,{id:a,...r,...r==null?void 0:r.success}):m.dismiss(a),n}).catch(n=>{let s=t.error?I(t.error,n):void 0;s?m.error(s,{id:a,...r,...r==null?void 0:r.error}):m.dismiss(a)}),e};var he=1e3,ye=(e,t="default")=>{let{toasts:r,pausedAt:a}=fe(e,t),n=d.useRef(new Map).current,s=d.useCallback((c,f=he)=>{if(n.has(c))return;let g=setTimeout(()=>{n.delete(c),o({type:4,toastId:c})},f);n.set(c,g)},[]);d.useEffect(()=>{if(a)return;let c=Date.now(),f=r.map(g=>{if(g.duration===1/0)return;let C=(g.duration||0)+g.pauseDuration-(c-g.createdAt);if(C<0){g.visible&&m.dismiss(g.id);return}return setTimeout(()=>m.dismiss(g.id,t),C)});return()=>{f.forEach(g=>g&&clearTimeout(g))}},[r,a,t]);let o=d.useCallback(D(t),[t]),i=d.useCallback(()=>{o({type:5,time:Date.now()})},[o]),l=d.useCallback((c,f)=>{o({type:1,toast:{id:c,height:f}})},[o]),u=d.useCallback(()=>{a&&o({type:6,time:Date.now()})},[a,o]),p=d.useCallback((c,f)=>{let{reverseOrder:g=!1,gutter:C=8,defaultPosition:L}=f||{},R=r.filter(h=>(h.position||L)===(c.position||L)&&h.height),te=R.findIndex(h=>h.id===c.id),M=R.filter((h,A)=>A<te&&h.visible).length;return R.filter(h=>h.visible).slice(...g?[M+1]:[0,M]).reduce((h,A)=>h+(A.height||0)+C,0)},[r]);return d.useEffect(()=>{r.forEach(c=>{if(c.dismissed)s(c.id,c.removeDelay);else{let f=n.get(c.id);f&&(clearTimeout(f),n.delete(c.id))}})},[r,s]),{toasts:r,handlers:{updateHeight:l,startPause:i,endPause:u,calculateOffset:p}}},be=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,ve=x`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,xe=x`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,we=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${be} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ve} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${xe} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,ke=x`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Ee=k("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${ke} 1s linear infinite;
`,Ce=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,je=x`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Te=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ce} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${je} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,$e=k("div")`
  position: absolute;
`,Se=k("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Ie=x`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Oe=k("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Ie} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,De=({toast:e})=>{let{icon:t,type:r,iconTheme:a}=e;return t!==void 0?typeof t=="string"?d.createElement(Oe,null,t):t:r==="blank"?null:d.createElement(Se,null,d.createElement(Ee,{...a}),r!=="loading"&&d.createElement($e,null,r==="error"?d.createElement(we,{...a}):d.createElement(Te,{...a})))},Ne=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Re=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ae="0%{opacity:0;} 100%{opacity:1;}",Pe="0%{opacity:1;} 100%{opacity:0;}",_e=k("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,ze=k("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Fe=(e,t)=>{let r=e.includes("top")?1:-1,[a,n]=W()?[Ae,Pe]:[Ne(r),Re(r)];return{animation:t?`${x(a)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${x(n)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Le=d.memo(({toast:e,position:t,style:r,children:a})=>{let n=e.height?Fe(e.position||t||"top-center",e.visible):{opacity:0},s=d.createElement(De,{toast:e}),o=d.createElement(ze,{...e.ariaProps},I(e.message,e));return d.createElement(_e,{className:e.className,style:{...n,...r,...e.style}},typeof a=="function"?a({icon:s,message:o}):d.createElement(d.Fragment,null,s,o))});le(d.createElement);var Me=({id:e,className:t,style:r,onHeightUpdate:a,children:n})=>{let s=d.useCallback(o=>{if(o){let i=()=>{let l=o.getBoundingClientRect().height;a(e,l)};i(),new MutationObserver(i).observe(o,{subtree:!0,childList:!0,characterData:!0})}},[e,a]);return d.createElement("div",{ref:s,className:t,style:r},n)},Be=(e,t)=>{let r=e.includes("top"),a=r?{top:0}:{bottom:0},n=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:W()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(r?1:-1)}px)`,...a,...n}},He=O`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,j=16,Ue=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:a,children:n,toasterId:s,containerStyle:o,containerClassName:i})=>{let{toasts:l,handlers:u}=ye(r,s);return d.createElement("div",{"data-rht-toaster":s||"",style:{position:"fixed",zIndex:9999,top:j,left:j,right:j,bottom:j,pointerEvents:"none",...o},className:i,onMouseEnter:u.startPause,onMouseLeave:u.endPause},l.map(p=>{let c=p.position||t,f=u.calculateOffset(p,{reverseOrder:e,gutter:a,defaultPosition:t}),g=Be(c,f);return d.createElement(Me,{id:p.id,key:p.id,onHeightUpdate:u.updateHeight,className:p.visible?He:"",style:g},p.type==="custom"?I(p.message,p):n?n(p):d.createElement(Le,{toast:p,position:c}))}))};const N=()=>y.jsx(Ue,{position:"bottom-right",toastOptions:{duration:5e3,style:{background:"#333",color:"#fff"},success:{duration:5e3,iconTheme:{primary:"green",secondary:"black"}},error:{duration:1/0}}}),P={success:e=>m.success(e),error:e=>m.error(e,{duration:1/0}),info:e=>m(e)};N.__docgenInfo={description:"",methods:[],displayName:"ToastContainer"};const Ke={title:"Components/Toast",component:N,parameters:{layout:"fullscreen"},tags:["autodocs"]},T={render:()=>y.jsxs("div",{style:{padding:"2rem"},children:[y.jsx("p",{style:{marginBottom:"1rem"},children:"Toast container is automatically positioned at bottom-right."}),y.jsx(N,{})]})},$={render:()=>{const e=()=>P.success("Operation completed successfully!"),t=()=>P.error("Something went wrong. Please try again."),r=()=>P.info("This is an informational message.");return y.jsxs("div",{style:{padding:"2rem"},children:[y.jsxs("div",{style:{display:"flex",gap:"1rem",marginBottom:"1rem"},children:[y.jsx("button",{onClick:e,style:{padding:"0.5rem 1rem",background:"green",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"},children:"Show Success"}),y.jsx("button",{onClick:t,style:{padding:"0.5rem 1rem",background:"red",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"},children:"Show Error"}),y.jsx("button",{onClick:r,style:{padding:"0.5rem 1rem",background:"gray",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"},children:"Show Info"})]}),y.jsx(N,{})]})}};var H,U,Y;T.parameters={...T.parameters,docs:{...(H=T.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: '2rem'
  }}>
      <p style={{
      marginBottom: '1rem'
    }}>Toast container is automatically positioned at bottom-right.</p>
      <ToastContainer />
    </div>
}`,...(Y=(U=T.parameters)==null?void 0:U.docs)==null?void 0:Y.source}}};var Z,q,K;$.parameters={...$.parameters,docs:{...(Z=$.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  render: () => {
    const handleSuccess = () => showToast.success('Operation completed successfully!');
    const handleError = () => showToast.error('Something went wrong. Please try again.');
    const handleInfo = () => showToast.info('This is an informational message.');
    return <div style={{
      padding: '2rem'
    }}>
        <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
          <button onClick={handleSuccess} style={{
          padding: '0.5rem 1rem',
          background: 'green',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
            Show Success
          </button>
          <button onClick={handleError} style={{
          padding: '0.5rem 1rem',
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
            Show Error
          </button>
          <button onClick={handleInfo} style={{
          padding: '0.5rem 1rem',
          background: 'gray',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
            Show Info
          </button>
        </div>
        <ToastContainer />
      </div>;
  }
}`,...(K=(q=$.parameters)==null?void 0:q.docs)==null?void 0:K.source}}};const Qe=["Container","Demo"];export{T as Container,$ as Demo,Qe as __namedExportsOrder,Ke as default};

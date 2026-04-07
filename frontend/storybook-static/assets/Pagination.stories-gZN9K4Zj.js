import{j as e}from"./jsx-runtime-DOprRnkm.js";import{c as D}from"./createLucideIcon-S3Bw4Ri8.js";import{r as E}from"./iframe-UwHWAuAG.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=D("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=D("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]),u=({currentPage:a,totalPages:r,onPageChange:s,isDisabled:o=!1})=>{if(r<=1)return null;const h=Array.from({length:r},(t,R)=>R+1);let n=h;if(r>5){const t=Math.max(0,Math.min(r-5,a-3));n=h.slice(t,t+5)}return e.jsxs("div",{className:"flex items-center justify-center gap-2 mt-6",children:[e.jsx("button",{onClick:()=>s(a-1),disabled:a===1||o,className:"p-2 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100 transition-colors","aria-label":"Vorige pagina",children:e.jsx(V,{className:"w-5 h-5"})}),n[0]>1&&e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>s(1),disabled:o,className:"w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors",children:"1"}),n[0]>2&&e.jsx("span",{className:"text-gray-400",children:"..."})]}),n.map(t=>e.jsx("button",{onClick:()=>s(t),disabled:o,className:`w-10 h-10 rounded-md transition-all ${a===t?"bg-blue-600 text-white border-blue-600 font-bold shadow-sm":"border border-gray-300 hover:bg-gray-50 active:bg-gray-100"}`,children:t},t)),n[n.length-1]<r&&e.jsxs(e.Fragment,{children:[n[n.length-1]<r-1&&e.jsx("span",{className:"text-gray-400",children:"..."}),e.jsx("button",{onClick:()=>s(r),disabled:o,className:"w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors",children:r})]}),e.jsx("button",{onClick:()=>s(a+1),disabled:a===r||o,className:"p-2 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100 transition-colors","aria-label":"Volgende pagina",children:e.jsx(O,{className:"w-5 h-5"})})]})};u.__docgenInfo={description:"",methods:[],displayName:"Pagination",props:{currentPage:{required:!0,tsType:{name:"number"},description:""},totalPages:{required:!0,tsType:{name:"number"},description:""},onPageChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(page: number) => void",signature:{arguments:[{type:{name:"number"},name:"page"}],return:{name:"void"}}},description:""},isDisabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const H={title:"Components/Pagination",component:u,parameters:{layout:"centered"},tags:["autodocs"]},g={args:{currentPage:1,totalPages:10,onPageChange:()=>{}}},i={args:{currentPage:5,totalPages:10,onPageChange:()=>{}}},c={args:{currentPage:10,totalPages:10,onPageChange:()=>{}}},d={args:{currentPage:2,totalPages:3,onPageChange:()=>{}}},l={args:{currentPage:3,totalPages:10,onPageChange:()=>{},isDisabled:!0}},m={render:()=>{const[a,r]=E.useState(1);return e.jsxs("div",{style:{width:"100%",minWidth:"400px"},children:[e.jsx(u,{currentPage:a,totalPages:10,onPageChange:r}),e.jsxs("p",{style:{textAlign:"center",marginTop:"1rem",color:"#666"},children:["Current page: ",a]})]})}},p={render:()=>{const[a,r]=E.useState(1);return e.jsxs("div",{style:{width:"100%",minWidth:"400px"},children:[e.jsx(u,{currentPage:a,totalPages:50,onPageChange:r}),e.jsxs("p",{style:{textAlign:"center",marginTop:"1rem",color:"#666"},children:["Current page: ",a]})]})}};var P,b,y;g.parameters={...g.parameters,docs:{...(P=g.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: () => {}
  }
}`,...(y=(b=g.parameters)==null?void 0:b.docs)==null?void 0:y.source}}};var x,v,C;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: () => {}
  }
}`,...(C=(v=i.parameters)==null?void 0:v.docs)==null?void 0:C.source}}};var f,j,w;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    currentPage: 10,
    totalPages: 10,
    onPageChange: () => {}
  }
}`,...(w=(j=c.parameters)==null?void 0:j.docs)==null?void 0:w.source}}};var N,S,T;d.parameters={...d.parameters,docs:{...(N=d.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    currentPage: 2,
    totalPages: 3,
    onPageChange: () => {}
  }
}`,...(T=(S=d.parameters)==null?void 0:S.docs)==null?void 0:T.source}}};var k,M,q;l.parameters={...l.parameters,docs:{...(k=l.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    currentPage: 3,
    totalPages: 10,
    onPageChange: () => {},
    isDisabled: true
  }
}`,...(q=(M=l.parameters)==null?void 0:M.docs)==null?void 0:q.source}}};var A,L,_;m.parameters={...m.parameters,docs:{...(A=m.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => {
    const [page, setPage] = useState(1);
    return <div style={{
      width: '100%',
      minWidth: '400px'
    }}>
        <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />
        <p style={{
        textAlign: 'center',
        marginTop: '1rem',
        color: '#666'
      }}>Current page: {page}</p>
      </div>;
  }
}`,...(_=(L=m.parameters)==null?void 0:L.docs)==null?void 0:_.source}}};var F,I,W;p.parameters={...p.parameters,docs:{...(F=p.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => {
    const [page, setPage] = useState(1);
    return <div style={{
      width: '100%',
      minWidth: '400px'
    }}>
        <Pagination currentPage={page} totalPages={50} onPageChange={setPage} />
        <p style={{
        textAlign: 'center',
        marginTop: '1rem',
        color: '#666'
      }}>Current page: {page}</p>
      </div>;
  }
}`,...(W=(I=p.parameters)==null?void 0:I.docs)==null?void 0:W.source}}};const J=["Default","MiddlePage","LastPage","FewPages","Disabled","Interactive","ManyPages"];export{g as Default,l as Disabled,d as FewPages,m as Interactive,c as LastPage,p as ManyPages,i as MiddlePage,J as __namedExportsOrder,H as default};

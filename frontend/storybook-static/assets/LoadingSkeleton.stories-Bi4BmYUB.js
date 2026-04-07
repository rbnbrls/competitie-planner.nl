import{j as e}from"./jsx-runtime-DOprRnkm.js";import{a as _}from"./utils-BEhiKRD9.js";import"./iframe-UwHWAuAG.js";import"./preload-helper-Dp1pzeXC.js";function s({className:t,...m}){return e.jsx("div",{className:_("animate-pulse rounded-md bg-gray-200",t),...m})}function d({rows:t=5}){return e.jsxs("div",{className:"space-y-4 w-full",children:[e.jsx(s,{className:"h-10 w-full"}),e.jsx("div",{className:"space-y-2",children:Array.from({length:t}).map((m,b)=>e.jsx(s,{className:"h-12 w-full"},b))})]})}s.__docgenInfo={description:"",methods:[],displayName:"Skeleton"};d.__docgenInfo={description:"",methods:[],displayName:"LoadingSkeleton",props:{rows:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"5",computed:!1}}}};const I={title:"Components/LoadingSkeleton",component:d,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{rows:{control:"number",description:"Number of skeleton rows"}}},r={args:{rows:3}},a={args:{rows:1}},o={args:{rows:5}},l={render:()=>e.jsxs("div",{style:{width:"300px"},children:[e.jsx(d,{}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"1rem",marginTop:"1rem"},children:[e.jsx(s,{className:"h-12 w-12 rounded-full"}),e.jsx("div",{style:{flex:1},children:e.jsx(d,{rows:2})})]})]})},n={render:()=>e.jsxs("div",{style:{width:"300px"},children:[e.jsx(s,{className:"h-48 w-full rounded-xl mb-4"}),e.jsx(s,{className:"h-6 w-full mb-2"}),e.jsx(s,{className:"h-4 w-3/4 mb-2"}),e.jsxs("div",{style:{display:"flex",gap:"0.5rem",marginTop:"1rem"},children:[e.jsx(s,{className:"h-8 w-20 rounded"}),e.jsx(s,{className:"h-8 w-20 rounded"})]})]})};var i,c,p;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    rows: 3
  }
}`,...(p=(c=r.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};var u,x,g;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    rows: 1
  }
}`,...(g=(x=a.parameters)==null?void 0:x.docs)==null?void 0:g.source}}};var w,h,f;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    rows: 5
  }
}`,...(f=(h=o.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};var y,v,j;l.parameters={...l.parameters,docs:{...(y=l.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '300px'
  }}>
      <LoadingSkeleton />
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '1rem'
    }}>
        <Skeleton className="h-12 w-12 rounded-full" />
        <div style={{
        flex: 1
      }}>
          <LoadingSkeleton rows={2} />
        </div>
      </div>
    </div>
}`,...(j=(v=l.parameters)==null?void 0:v.docs)==null?void 0:j.source}}};var N,S,k;n.parameters={...n.parameters,docs:{...(N=n.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '300px'
  }}>
      <Skeleton className="h-48 w-full rounded-xl mb-4" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div style={{
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem'
    }}>
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
}`,...(k=(S=n.parameters)==null?void 0:S.docs)==null?void 0:k.source}}};const C=["Default","SingleRow","FiveRows","WithHeader","CardExample"];export{n as CardExample,r as Default,o as FiveRows,a as SingleRow,l as WithHeader,C as __namedExportsOrder,I as default};

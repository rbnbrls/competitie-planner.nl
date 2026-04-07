import{j as e}from"./jsx-runtime-DOprRnkm.js";import{r as O}from"./iframe-UwHWAuAG.js";import{a as z}from"./utils-BEhiKRD9.js";import"./preload-helper-Dp1pzeXC.js";const r=O.forwardRef(({className:p,type:M,label:m,error:a,helperText:h,icon:u,...b},U)=>e.jsxs("div",{className:"w-full",children:[m&&e.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:[m,b.required&&e.jsx("span",{className:"text-red-500 ml-1 font-bold",children:"*"})]}),e.jsxs("div",{className:"relative",children:[u&&e.jsx("div",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",children:u}),e.jsx("input",{type:M,className:z("flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",u&&"pl-10",a?"border-red-500 focus-visible:ring-red-500":"border-gray-300",p),ref:U,...b})]}),a&&e.jsx("p",{className:"mt-1 text-xs text-red-600 font-medium",children:a}),h&&!a&&e.jsx("p",{className:"mt-1 text-xs text-gray-500",children:h})]}));r.displayName="Input";r.__docgenInfo={description:"",methods:[],displayName:"Input",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"string"},description:""},helperText:{required:!1,tsType:{name:"string"},description:""},icon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};const Q={title:"Components/Input",component:r,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{type:{control:"select",options:["text","password","email","number","tel","search"],description:"The input type"},placeholder:{control:"text",description:"Placeholder text"},disabled:{control:"boolean",description:"Disables the input"},required:{control:"boolean",description:"Shows required indicator"}}},s={args:{placeholder:"Enter text..."}},t={args:{label:"Email Address",placeholder:"Enter your email",type:"email"}},l={args:{label:"Password",type:"password",helperText:"Must be at least 8 characters"}},o={args:{label:"Email",type:"email",value:"invalid-email",error:"Please enter a valid email address"}},i={args:{label:"Username",placeholder:"Enter username",required:!0}},n={args:{label:"Disabled Input",placeholder:"Cannot edit",disabled:!0,value:"Read-only value"}},d={args:{label:"Search",placeholder:"Search..."},render:p=>e.jsx(r,{...p,icon:e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"11",cy:"11",r:"8"}),e.jsx("path",{d:"m21 21-4.3-4.3"})]})})},c={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem",width:"300px"},children:[e.jsx(r,{label:"Default",placeholder:"Normal input"}),e.jsx(r,{label:"With Label",placeholder:"With label"}),e.jsx(r,{label:"Required",placeholder:"Required field",required:!0}),e.jsx(r,{label:"Error State",error:"This field is required"}),e.jsx(r,{label:"Helper Text",helperText:"This is helper text",placeholder:"Helper text"}),e.jsx(r,{label:"Disabled",disabled:!0,placeholder:"Disabled input"})]})};var x,g,f;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text...'
  }
}`,...(f=(g=s.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var y,v,w;t.parameters={...t.parameters,docs:{...(y=t.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email'
  }
}`,...(w=(v=t.parameters)==null?void 0:v.docs)==null?void 0:w.source}}};var j,q,T;l.parameters={...l.parameters,docs:{...(j=l.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters'
  }
}`,...(T=(q=l.parameters)==null?void 0:q.docs)==null?void 0:T.source}}};var E,S,I;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address'
  }
}`,...(I=(S=o.parameters)==null?void 0:S.docs)==null?void 0:I.source}}};var D,N,R;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    required: true
  }
}`,...(R=(N=i.parameters)==null?void 0:N.docs)==null?void 0:R.source}}};var W,k,L;n.parameters={...n.parameters,docs:{...(W=n.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    value: 'Read-only value'
  }
}`,...(L=(k=n.parameters)==null?void 0:k.docs)==null?void 0:L.source}}};var H,C,P;d.parameters={...d.parameters,docs:{...(H=d.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    label: 'Search',
    placeholder: 'Search...'
  },
  render: args => <Input {...args} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>} />
}`,...(P=(C=d.parameters)==null?void 0:C.docs)==null?void 0:P.source}}};var A,_,B;c.parameters={...c.parameters,docs:{...(A=c.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '300px'
  }}>
      <Input label="Default" placeholder="Normal input" />
      <Input label="With Label" placeholder="With label" />
      <Input label="Required" placeholder="Required field" required />
      <Input label="Error State" error="This field is required" />
      <Input label="Helper Text" helperText="This is helper text" placeholder="Helper text" />
      <Input label="Disabled" disabled placeholder="Disabled input" />
    </div>
}`,...(B=(_=c.parameters)==null?void 0:_.docs)==null?void 0:B.source}}};const V=["Default","WithLabel","WithHelperText","WithError","Required","Disabled","WithIcon","AllStates"];export{c as AllStates,s as Default,n as Disabled,i as Required,o as WithError,l as WithHelperText,d as WithIcon,t as WithLabel,V as __namedExportsOrder,Q as default};

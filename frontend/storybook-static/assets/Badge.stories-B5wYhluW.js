import{j as r}from"./jsx-runtime-DOprRnkm.js";import{c as F}from"./index-C08JwjkN.js";import{a as G}from"./utils-BEhiKRD9.js";import"./iframe-UwHWAuAG.js";import"./preload-helper-Dp1pzeXC.js";const H=F("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border ring-offset-background",{variants:{variant:{default:"border-transparent bg-gray-100 text-gray-800",primary:"border-transparent bg-blue-100 text-blue-800",secondary:"border-transparent bg-indigo-100 text-indigo-800",success:"border-transparent bg-green-100 text-green-800",warning:"border-transparent bg-yellow-100 text-yellow-800",danger:"border-transparent bg-red-100 text-red-800",outline:"text-gray-700 bg-white border-gray-300"}},defaultVariants:{variant:"default"}});function a({className:R,variant:q,...z}){return r.jsx("div",{className:G(H({variant:q}),R),...z})}a.__docgenInfo={description:"",methods:[],displayName:"Badge",composes:["VariantProps"]};const U={title:"Components/Badge",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","primary","secondary","success","warning","danger","outline"],description:"The visual style variant of the badge"}}},e={args:{children:"Default",variant:"default"}},n={args:{children:"Primary",variant:"primary"}},s={args:{children:"Secondary",variant:"secondary"}},t={args:{children:"Success",variant:"success"}},i={args:{children:"Warning",variant:"warning"}},c={args:{children:"Danger",variant:"danger"}},d={args:{children:"Outline",variant:"outline"}},o={render:()=>r.jsxs("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:[r.jsx(a,{variant:"default",children:"Default"}),r.jsx(a,{variant:"primary",children:"Primary"}),r.jsx(a,{variant:"secondary",children:"Secondary"}),r.jsx(a,{variant:"success",children:"Success"}),r.jsx(a,{variant:"warning",children:"Warning"}),r.jsx(a,{variant:"danger",children:"Danger"}),r.jsx(a,{variant:"outline",children:"Outline"})]})},g={render:()=>r.jsxs("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:[r.jsx(a,{variant:"success",children:"Active"}),r.jsx(a,{variant:"warning",children:"Pending"}),r.jsx(a,{variant:"danger",children:"Cancelled"}),r.jsx(a,{variant:"default",children:"Draft"})]})};var l,u,p;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    children: 'Default',
    variant: 'default'
  }
}`,...(p=(u=e.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var m,v,f;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: 'Primary',
    variant: 'primary'
  }
}`,...(f=(v=n.parameters)==null?void 0:v.docs)==null?void 0:f.source}}};var y,x,h;s.parameters={...s.parameters,docs:{...(y=s.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    children: 'Secondary',
    variant: 'secondary'
  }
}`,...(h=(x=s.parameters)==null?void 0:x.docs)==null?void 0:h.source}}};var B,S,b;t.parameters={...t.parameters,docs:{...(B=t.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    children: 'Success',
    variant: 'success'
  }
}`,...(b=(S=t.parameters)==null?void 0:S.docs)==null?void 0:b.source}}};var j,w,D;i.parameters={...i.parameters,docs:{...(j=i.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    children: 'Warning',
    variant: 'warning'
  }
}`,...(D=(w=i.parameters)==null?void 0:w.docs)==null?void 0:D.source}}};var W,P,O;c.parameters={...c.parameters,docs:{...(W=c.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    children: 'Danger',
    variant: 'danger'
  }
}`,...(O=(P=c.parameters)==null?void 0:P.docs)==null?void 0:O.source}}};var V,A,_;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    children: 'Outline',
    variant: 'outline'
  }
}`,...(_=(A=d.parameters)==null?void 0:A.docs)==null?void 0:_.source}}};var C,E,N;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
}`,...(N=(E=o.parameters)==null?void 0:E.docs)==null?void 0:N.source}}};var T,k,I;g.parameters={...g.parameters,docs:{...(T=g.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  }}>
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="danger">Cancelled</Badge>
      <Badge variant="default">Draft</Badge>
    </div>
}`,...(I=(k=g.parameters)==null?void 0:k.docs)==null?void 0:I.source}}};const X=["Default","Primary","Secondary","Success","Warning","Danger","Outline","AllVariants","StatusBadges"];export{o as AllVariants,c as Danger,e as Default,d as Outline,n as Primary,s as Secondary,g as StatusBadges,t as Success,i as Warning,X as __namedExportsOrder,U as default};

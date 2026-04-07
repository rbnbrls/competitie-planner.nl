import{j as e}from"./jsx-runtime-DOprRnkm.js";import{r as I}from"./iframe-UwHWAuAG.js";import{a as M}from"./utils-BEhiKRD9.js";import{c as P}from"./createLucideIcon-S3Bw4Ri8.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=P("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]),l=I.forwardRef(({className:_,label:c,error:a,helperText:d,options:b,children:L,...m},B)=>e.jsxs("div",{className:"w-full relative group",children:[c&&e.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600",children:[c,m.required&&e.jsx("span",{className:"text-red-500 ml-1 font-bold",children:"*"})]}),e.jsxs("div",{className:"relative",children:[e.jsx("select",{className:M("flex w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",a?"border-red-500 focus-visible:ring-red-500":"border-gray-300 hover:border-gray-400",_),ref:B,...m,children:b?b.map(u=>e.jsx("option",{value:u.value,children:u.label},u.value)):L}),e.jsx("div",{className:"absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 group-hover:text-gray-500 transition-colors",children:e.jsx(z,{className:"h-4 w-4"})})]}),a&&e.jsx("p",{className:"mt-1 text-xs text-red-600 font-medium",children:a}),d&&!a&&e.jsx("p",{className:"mt-1 text-xs text-gray-500",children:d})]}));l.displayName="Select";l.__docgenInfo={description:"",methods:[],displayName:"Select",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"string"},description:""},helperText:{required:!1,tsType:{name:"string"},description:""},options:{required:!1,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ value: string | number; label: string }",signature:{properties:[{key:"value",value:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}],required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"{ value: string | number; label: string }[]"},description:""}}};const U={title:"Components/Select",component:l,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{disabled:{control:"boolean",description:"Disables the select"},required:{control:"boolean",description:"Shows required indicator"}}},r={args:{options:[{value:"option1",label:"Option 1"},{value:"option2",label:"Option 2"},{value:"option3",label:"Option 3"}]}},o={args:{label:"Select Option",options:[{value:"option1",label:"Option 1"},{value:"option2",label:"Option 2"},{value:"option3",label:"Option 3"}]}},t={args:{label:"Category",helperText:"Choose a category",options:[{value:"sports",label:"Sports"},{value:"music",label:"Music"},{value:"art",label:"Art"}]}},n={args:{label:"Selection",error:"Please select an option",options:[{value:"option1",label:"Option 1"},{value:"option2",label:"Option 2"}]}},s={args:{label:"Required Select",required:!0,options:[{value:"",label:"Select..."},{value:"a",label:"Option A"},{value:"b",label:"Option B"}]}},i={args:{label:"Disabled Select",disabled:!0,options:[{value:"option1",label:"Option 1"},{value:"option2",label:"Option 2"}]}},p={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem",width:"300px"},children:[e.jsx(l,{label:"Default",options:[{value:"1",label:"Option"}]}),e.jsx(l,{label:"Required",required:!0,options:[{value:"1",label:"Option"}]}),e.jsx(l,{label:"Error",error:"Error message",options:[{value:"1",label:"Option"}]}),e.jsx(l,{label:"Helper",helperText:"Helper text",options:[{value:"1",label:"Option"}]}),e.jsx(l,{label:"Disabled",disabled:!0,options:[{value:"1",label:"Option"}]})]})};var v,g,x;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    options: [{
      value: 'option1',
      label: 'Option 1'
    }, {
      value: 'option2',
      label: 'Option 2'
    }, {
      value: 'option3',
      label: 'Option 3'
    }]
  }
}`,...(x=(g=r.parameters)==null?void 0:g.docs)==null?void 0:x.source}}};var f,h,O;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    label: 'Select Option',
    options: [{
      value: 'option1',
      label: 'Option 1'
    }, {
      value: 'option2',
      label: 'Option 2'
    }, {
      value: 'option3',
      label: 'Option 3'
    }]
  }
}`,...(O=(h=o.parameters)==null?void 0:h.docs)==null?void 0:O.source}}};var y,S,q;t.parameters={...t.parameters,docs:{...(y=t.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    label: 'Category',
    helperText: 'Choose a category',
    options: [{
      value: 'sports',
      label: 'Sports'
    }, {
      value: 'music',
      label: 'Music'
    }, {
      value: 'art',
      label: 'Art'
    }]
  }
}`,...(q=(S=t.parameters)==null?void 0:S.docs)==null?void 0:q.source}}};var j,w,D;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    label: 'Selection',
    error: 'Please select an option',
    options: [{
      value: 'option1',
      label: 'Option 1'
    }, {
      value: 'option2',
      label: 'Option 2'
    }]
  }
}`,...(D=(w=n.parameters)==null?void 0:w.docs)==null?void 0:D.source}}};var N,T,E;s.parameters={...s.parameters,docs:{...(N=s.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    label: 'Required Select',
    required: true,
    options: [{
      value: '',
      label: 'Select...'
    }, {
      value: 'a',
      label: 'Option A'
    }, {
      value: 'b',
      label: 'Option B'
    }]
  }
}`,...(E=(T=s.parameters)==null?void 0:T.docs)==null?void 0:E.source}}};var R,A,C;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    label: 'Disabled Select',
    disabled: true,
    options: [{
      value: 'option1',
      label: 'Option 1'
    }, {
      value: 'option2',
      label: 'Option 2'
    }]
  }
}`,...(C=(A=i.parameters)==null?void 0:A.docs)==null?void 0:C.source}}};var H,W,k;p.parameters={...p.parameters,docs:{...(H=p.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '300px'
  }}>
      <Select label="Default" options={[{
      value: '1',
      label: 'Option'
    }]} />
      <Select label="Required" required options={[{
      value: '1',
      label: 'Option'
    }]} />
      <Select label="Error" error="Error message" options={[{
      value: '1',
      label: 'Option'
    }]} />
      <Select label="Helper" helperText="Helper text" options={[{
      value: '1',
      label: 'Option'
    }]} />
      <Select label="Disabled" disabled options={[{
      value: '1',
      label: 'Option'
    }]} />
    </div>
}`,...(k=(W=p.parameters)==null?void 0:W.docs)==null?void 0:k.source}}};const V=["Default","WithLabel","WithHelperText","WithError","Required","Disabled","AllStates"];export{p as AllStates,r as Default,i as Disabled,s as Required,n as WithError,t as WithHelperText,o as WithLabel,V as __namedExportsOrder,U as default};

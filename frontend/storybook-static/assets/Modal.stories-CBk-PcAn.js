import{j as e}from"./jsx-runtime-DOprRnkm.js";import{r as p}from"./iframe-UwHWAuAG.js";import{a as X}from"./utils-BEhiKRD9.js";import{c as F}from"./createLucideIcon-S3Bw4Ri8.js";import{B as o}from"./Button-wXV8jNNi.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C08JwjkN.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=F("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),D={xs:"max-w-xs",sm:"max-w-sm",md:"max-w-md",lg:"max-w-lg",xl:"max-w-xl","2xl":"max-w-2xl","3xl":"max-w-3xl","4xl":"max-w-4xl","5xl":"max-w-5xl"},r=({isOpen:t,onClose:s,title:n,description:x,children:R,footer:h,maxWidth:q="md",showCloseButton:f=!0})=>(p.useEffect(()=>{const g=U=>{U.key==="Escape"&&s()};return t&&(document.addEventListener("keydown",g),document.body.style.overflow="hidden"),()=>{document.removeEventListener("keydown",g),document.body.style.overflow="unset"}},[t,s]),t?e.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:px-0",children:[e.jsx("div",{className:"fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in",onClick:s}),e.jsxs("div",{className:X("relative bg-white rounded-xl shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",D[q],"w-full mx-auto"),children:[(n||f)&&e.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b",children:[e.jsxs("div",{children:[n&&e.jsx("h3",{className:"text-lg font-bold text-gray-900 leading-none",children:n}),x&&e.jsx("p",{className:"mt-1 text-sm text-gray-500",children:x})]}),f&&e.jsx("button",{onClick:s,className:"p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",children:e.jsx(A,{className:"h-5 w-5"})})]}),e.jsx("div",{className:"px-6 py-4 max-h-[70vh] overflow-y-auto",children:R}),h&&e.jsx("div",{className:"px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 flex-wrap",children:h})]})]}):null);r.__docgenInfo={description:"",methods:[],displayName:"Modal",props:{isOpen:{required:!0,tsType:{name:"boolean"},description:""},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},title:{required:!1,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"string"},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},footer:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},maxWidth:{required:!1,tsType:{name:"union",raw:'"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"',elements:[{name:"literal",value:'"xs"'},{name:"literal",value:'"sm"'},{name:"literal",value:'"md"'},{name:"literal",value:'"lg"'},{name:"literal",value:'"xl"'},{name:"literal",value:'"2xl"'},{name:"literal",value:'"3xl"'},{name:"literal",value:'"4xl"'},{name:"literal",value:'"5xl"'}]},description:"",defaultValue:{value:'"md"',computed:!1}},showCloseButton:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}}};const K={title:"Components/Modal",component:r,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{maxWidth:{control:"select",options:["xs","sm","md","lg","xl","2xl","3xl","4xl","5xl"],description:"Maximum width of the modal"},showCloseButton:{control:"boolean",description:"Show close button in header"}}},u=t=>{const[s,n]=p.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Modal"}),e.jsx(r,{...t,isOpen:s,onClose:()=>n(!1),children:t.children})]})},a={render:t=>u(t),args:{title:"Modal Title",description:"This is a modal description",children:e.jsx("p",{children:"Modal content goes here."}),maxWidth:"md",showCloseButton:!0}},i={render:t=>{const[s,n]=p.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Modal"}),e.jsx(r,{...t,isOpen:s,onClose:()=>n(!1),footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"secondary",onClick:()=>n(!1),children:"Cancel"}),e.jsx(o,{onClick:()=>n(!1),children:"Confirm"})]}),children:e.jsx("p",{children:"Are you sure you want to proceed with this action?"})})]})},args:{title:"Confirmation",description:"Please confirm your action",children:e.jsx("p",{children:"This action cannot be undone."})}},l={render:t=>u(t),args:{title:"Small Modal",maxWidth:"sm",children:e.jsx("p",{children:"This is a small modal with limited width."})}},d={render:t=>u(t),args:{title:"Large Modal",maxWidth:"lg",children:e.jsxs("div",{children:[e.jsx("p",{children:"This is a large modal with more content space."}),e.jsx("p",{children:"Useful for complex forms or detailed information."})]})}},c={render:t=>u(t),args:{title:"Modal Without Close Button",showCloseButton:!1,children:e.jsx("p",{children:"Close button is hidden. Use Escape or backdrop to close."}),footer:e.jsx(o,{onClick:()=>{},children:"Close"})}},m={render:()=>{const[t,s]=p.useState(null);return e.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[e.jsx(o,{size:"sm",onClick:()=>s("xs"),children:"XS"}),e.jsx(o,{size:"sm",onClick:()=>s("sm"),children:"SM"}),e.jsx(o,{size:"sm",onClick:()=>s("md"),children:"MD"}),e.jsx(o,{size:"sm",onClick:()=>s("lg"),children:"LG"}),e.jsx(o,{size:"sm",onClick:()=>s("xl"),children:"XL"}),t&&e.jsx(r,{isOpen:!0,onClose:()=>s(null),title:`Size: ${t.toUpperCase()}`,maxWidth:t,children:e.jsxs("p",{children:["Modal width: ",t]})})]})}};var y,C,w;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: args => ModalWithState(args),
  args: {
    title: 'Modal Title',
    description: 'This is a modal description',
    children: <p>Modal content goes here.</p>,
    maxWidth: 'md',
    showCloseButton: true
  }
}`,...(w=(C=a.parameters)==null?void 0:C.docs)==null?void 0:w.source}}};var S,j,v;i.parameters={...i.parameters,docs:{...(S=i.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: args => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} footer={<>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>}>
          <p>Are you sure you want to proceed with this action?</p>
        </Modal>
      </>;
  },
  args: {
    title: 'Confirmation',
    description: 'Please confirm your action',
    children: <p>This action cannot be undone.</p>
  }
}`,...(v=(j=i.parameters)==null?void 0:j.docs)==null?void 0:v.source}}};var M,k,z;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: args => ModalWithState(args),
  args: {
    title: 'Small Modal',
    maxWidth: 'sm',
    children: <p>This is a small modal with limited width.</p>
  }
}`,...(z=(k=l.parameters)==null?void 0:k.docs)==null?void 0:z.source}}};var b,B,O;d.parameters={...d.parameters,docs:{...(b=d.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: args => ModalWithState(args),
  args: {
    title: 'Large Modal',
    maxWidth: 'lg',
    children: <div>
        <p>This is a large modal with more content space.</p>
        <p>Useful for complex forms or detailed information.</p>
      </div>
  }
}`,...(O=(B=d.parameters)==null?void 0:B.docs)==null?void 0:O.source}}};var W,T,N;c.parameters={...c.parameters,docs:{...(W=c.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: args => ModalWithState(args),
  args: {
    title: 'Modal Without Close Button',
    showCloseButton: false,
    children: <p>Close button is hidden. Use Escape or backdrop to close.</p>,
    footer: <Button onClick={() => {}}>Close</Button>
  }
}`,...(N=(T=c.parameters)==null?void 0:T.docs)==null?void 0:N.source}}};var L,E,I;m.parameters={...m.parameters,docs:{...(L=m.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => {
    const [openSize, setOpenSize] = useState<string | null>(null);
    return <div style={{
      display: 'flex',
      gap: '0.5rem'
    }}>
        <Button size="sm" onClick={() => setOpenSize('xs')}>XS</Button>
        <Button size="sm" onClick={() => setOpenSize('sm')}>SM</Button>
        <Button size="sm" onClick={() => setOpenSize('md')}>MD</Button>
        <Button size="sm" onClick={() => setOpenSize('lg')}>LG</Button>
        <Button size="sm" onClick={() => setOpenSize('xl')}>XL</Button>
        {openSize && <Modal isOpen={true} onClose={() => setOpenSize(null)} title={\`Size: \${openSize.toUpperCase()}\`} maxWidth={openSize as any}>
            <p>Modal width: {openSize}</p>
          </Modal>}
      </div>;
  }
}`,...(I=(E=m.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};const Q=["Default","WithFooter","Small","Large","WithoutCloseButton","AllSizes"];export{m as AllSizes,a as Default,d as Large,l as Small,i as WithFooter,c as WithoutCloseButton,Q as __namedExportsOrder,K as default};

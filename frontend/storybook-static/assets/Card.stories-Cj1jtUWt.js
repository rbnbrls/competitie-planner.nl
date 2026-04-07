import{j as e}from"./jsx-runtime-DOprRnkm.js";import{r as d}from"./iframe-UwHWAuAG.js";import{a as o}from"./utils-BEhiKRD9.js";import{B as f}from"./Button-wXV8jNNi.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C08JwjkN.js";import"./createLucideIcon-S3Bw4Ri8.js";const t=d.forwardRef(({className:r,...a},n)=>e.jsx("div",{ref:n,className:o("rounded-xl border bg-white text-gray-900 shadow-sm transition-all hover:shadow-md",r),...a}));t.displayName="Card";const s=d.forwardRef(({className:r,...a},n)=>e.jsx("div",{ref:n,className:o("flex flex-col space-y-1.5 p-6 border-b border-gray-100",r),...a}));s.displayName="CardHeader";const i=d.forwardRef(({className:r,...a},n)=>e.jsx("h3",{ref:n,className:o("text-xl font-bold leading-none tracking-tight",r),...a}));i.displayName="CardTitle";const c=d.forwardRef(({className:r,...a},n)=>e.jsx("p",{ref:n,className:o("text-sm text-gray-500",r),...a}));c.displayName="CardDescription";const l=d.forwardRef(({className:r,...a},n)=>e.jsx("div",{ref:n,className:o("p-6 pt-6",r),...a}));l.displayName="CardContent";const p=d.forwardRef(({className:r,...a},n)=>e.jsx("div",{ref:n,className:o("flex items-center p-6 pt-0 border-t border-gray-50 bg-gray-50/50 rounded-b-xl",r),...a}));p.displayName="CardFooter";t.__docgenInfo={description:"",methods:[],displayName:"Card"};s.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};p.__docgenInfo={description:"",methods:[],displayName:"CardFooter"};i.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};c.__docgenInfo={description:"",methods:[],displayName:"CardDescription"};l.__docgenInfo={description:"",methods:[],displayName:"CardContent"};const L={title:"Components/Card",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{children:{control:"text",description:"Card content"}}},C={args:{children:"Basic card content"}},m={render:()=>e.jsxs(t,{children:[e.jsxs(s,{children:[e.jsx(i,{children:"Card Title"}),e.jsx(c,{children:"This is a description of the card content."})]}),e.jsx(l,{children:e.jsx("p",{children:"Card content goes here. You can add any elements inside."})})]})},h={render:()=>e.jsxs(t,{children:[e.jsxs(s,{children:[e.jsx(i,{children:"Interactive Card"}),e.jsx(c,{children:"Card with footer actions"})]}),e.jsx(l,{children:e.jsx("p",{children:"This card has actions in the footer."})}),e.jsxs(p,{children:[e.jsx(f,{variant:"secondary",children:"Cancel"}),e.jsx(f,{children:"Confirm"})]})]})},x={render:()=>e.jsxs(t,{children:[e.jsxs(s,{children:[e.jsx(i,{children:"Competition Planner"}),e.jsx(c,{children:"Plan your competitions easily"})]}),e.jsx(l,{children:e.jsx("p",{children:"Create and manage your sports competitions with ease. Invite teams, schedule matches, and track results all in one place."})}),e.jsxs(p,{children:[e.jsx(f,{variant:"outline",children:"Learn More"}),e.jsx(f,{children:"Get Started"})]})]})},u={render:()=>e.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[e.jsx(t,{children:"Default Card"}),e.jsxs(t,{style:{maxWidth:"300px"},children:[e.jsxs(s,{children:[e.jsx(i,{children:"With Header"}),e.jsx(c,{children:"Description text"})]}),e.jsx(l,{children:"Content section"}),e.jsx(p,{children:"Footer section"})]})]})};var j,y,g;C.parameters={...C.parameters,docs:{...(j=C.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    children: 'Basic card content'
  }
}`,...(g=(y=C.parameters)==null?void 0:y.docs)==null?void 0:g.source}}};var N,T,D;m.parameters={...m.parameters,docs:{...(N=m.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a description of the card content.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. You can add any elements inside.</p>
      </CardContent>
    </Card>
}`,...(D=(T=m.parameters)==null?void 0:T.docs)==null?void 0:D.source}}};var v,w,H;h.parameters={...h.parameters,docs:{...(v=h.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => <Card>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Card with footer actions</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has actions in the footer.</p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
}`,...(H=(w=h.parameters)==null?void 0:w.docs)==null?void 0:H.source}}};var _,F,B;x.parameters={...x.parameters,docs:{...(_=x.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => <Card>
      <CardHeader>
        <CardTitle>Competition Planner</CardTitle>
        <CardDescription>Plan your competitions easily</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Create and manage your sports competitions with ease. Invite teams, schedule matches, and track results all in one place.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Learn More</Button>
        <Button>Get Started</Button>
      </CardFooter>
    </Card>
}`,...(B=(F=x.parameters)==null?void 0:F.docs)==null?void 0:B.source}}};var b,I,W;u.parameters={...u.parameters,docs:{...(b=u.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  }}>
      <Card>Default Card</Card>
      <Card style={{
      maxWidth: '300px'
    }}>
        <CardHeader>
          <CardTitle>With Header</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
        <CardContent>Content section</CardContent>
        <CardFooter>Footer section</CardFooter>
      </Card>
    </div>
}`,...(W=(I=u.parameters)==null?void 0:I.docs)==null?void 0:W.source}}};const M=["Default","WithHeader","WithFooter","CompleteCard","AllVariants"];export{u as AllVariants,x as CompleteCard,C as Default,h as WithFooter,m as WithHeader,M as __namedExportsOrder,L as default};

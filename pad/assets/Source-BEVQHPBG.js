import{_ as g,u as f,m as n,q as m,R as p,S,c as u,a as r,t as l,C as c,D as h,E as b,g as d,b as _,I as D,o as i}from"./index-B3JbaKwC.js";import{a as R}from"./n3-compare-DKsde9n1.js";const v={name:"Source",setup(){return{store:f()}},mounted(){this.getResource()},watch:{resource_iri(t){this.getResource()}},computed:{...n(_,["graph_iri","resource_iri"]),...n(D,["prefixes_flat"])},data(){return{debug:!1,originalData:{},resourceSource:""}},methods:{async getResource(){console.log("get resource");const t=await this.store.getResource(this.resource_iri);this.originalData=(await m(t)).store,this.resourceSource=await p(this.originalData.match(),{format:"text/turtle",prefixes:this.prefixes_flat})},async updateResource(){const t=await S(this.resourceSource),e=R(this.originalData,t);this.store.deleteInsertData({insertArray:e.add,deleteArray:e.del,graphIri:this.graph_iri})}}},w={class:"form-group"},x=r("label",{for:"sourceInput",class:""},"Turtle",-1),y={key:1};function k(t,e,C,T,s,a){return i(),u("div",null,[r("strong",null,"Sources of "+l(t.resource_iri),1),c(" ("),r("a",{onClick:e[0]||(e[0]=(...o)=>a.getResource&&a.getResource(...o))},"refresh"),c(") "),r("form",null,[r("div",w,[x,h(r("textarea",{id:"sourceInput",class:"form-control","onUpdate:modelValue":e[1]||(e[1]=o=>s.resourceSource=o),rows:"15"},null,512),[[b,s.resourceSource]])]),r("button",{type:"button",class:"btn btn-outline-primary mb-0",onClick:e[2]||(e[2]=o=>a.updateResource())},"Submit")]),s.debug==!1?(i(),u("a",{key:0,onClick:e[3]||(e[3]=o=>s.debug=!0)},"(show debug)")):d("",!0),s.debug?(i(),u("div",y,[r("a",{onClick:e[4]||(e[4]=o=>s.debug=!1)},"(hide debug)"),r("pre",null,l(t.originalSource)+" ",1)])):d("",!0)])}const q=g(v,[["render",k]]);export{q as default};

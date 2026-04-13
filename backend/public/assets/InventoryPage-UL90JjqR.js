import{r as n,ah as g,a2 as z,z as o,j as e,g as k,ai as re,N as b,k as F,n as P,E as le,aj as A,Q as ne,ak as E,M as ie,L as W,al as M,G as oe,a7 as de,aa as ce}from"./index-BPJlMmjo.js";function xe(){const[m,y]=n.useState([]),[c,T]=n.useState(null),[U,S]=n.useState(!0),[q,x]=n.useState(!1),[O,u]=n.useState(!1),[i,K]=n.useState(null),[C,Q]=n.useState([]),[G,H]=n.useState([]),[B,V]=n.useState([]),[X,v]=n.useState(null),[j,f]=n.useState({costPrice:0,wholesalePrice:0}),[t,p]=n.useState({productId:"",productName:"",packaging:"",quantity:100,mrp:0,mfgDate:new Date().toISOString().split("T")[0],expiryDate:""}),[d,N]=n.useState({paperSize:"A4",labelsPerRow:3,labelHeight:80}),D=n.useRef(!1);n.useEffect(()=>{D.current||(D.current=!0,w())},[]);const w=async()=>{var a,s,l;try{S(!0);const[r,h,I,R]=await Promise.all([g.getAllBatches(),g.getStats(),z.getBulkPricing().catch(()=>({data:{data:[]}})),z.getPackaging().catch(()=>({data:{data:[]}}))]);y(((a=r.data.data)==null?void 0:a.batches)||[]),T(h.data.data);const ae=[{skuId:"awla-powder",skuName:"Awla Powder",mrp:150},{skuId:"awla-candy",skuName:"Awla Candy",mrp:60}];Q(((s=I.data.data)==null?void 0:s.length)>0?I.data.data:ae);const te=[{id:"pkg-350",size:"350gm",weightInGrams:350,isActive:!0},{id:"pkg-500",size:"500gm",weightInGrams:500,isActive:!0},{id:"pkg-1000",size:"1kg",weightInGrams:1e3,isActive:!0}];H(((l=R.data.data)==null?void 0:l.length)>0?R.data.data.filter(se=>se.isActive):te)}catch(r){console.error("Load inventory data error:",r),o.error("Failed to load inventory data")}finally{S(!1)}},L=async()=>{try{const a=await A.getAll();V(a.data.data||[])}catch(a){console.log("Could not load wholesale SKUs:",a)}};n.useEffect(()=>{L()},[]);const $=a=>{const s=C.find(l=>l.skuId===a);p({...t,productId:a,productName:(s==null?void 0:s.skuName)||"",mrp:(s==null?void 0:s.mrp)||0})},J=async()=>{var a,s;if(!t.productId||!t.packaging||t.quantity<=0){o.error("Please fill all required fields");return}try{const l=await g.createBatch(t);o.success("Batch created successfully!"),y([l.data.data,...m]),x(!1),p({productId:"",productName:"",packaging:"",quantity:100,mrp:0,mfgDate:new Date().toISOString().split("T")[0],expiryDate:""}),w()}catch(l){o.error(((s=(a=l.response)==null?void 0:a.data)==null?void 0:s.message)||"Failed to create batch")}},Y=async a=>{if(confirm("Are you sure you want to delete this batch?"))try{await g.deleteBatch(a),o.success("Batch deleted"),y(m.filter(s=>s.id!==a)),w()}catch{o.error("Failed to delete batch")}},Z=async()=>{if(i)try{const a=await g.downloadLabels(i.id,d.paperSize,d.labelsPerRow,d.labelHeight),s=new Blob([a.data],{type:"application/pdf"}),l=window.URL.createObjectURL(s),r=document.createElement("a");r.href=l,r.download=`Labels-${i.batchNumber}.pdf`,document.body.appendChild(r),r.click(),document.body.removeChild(r),window.URL.revokeObjectURL(l),o.success("Labels downloaded!"),u(!1)}catch{o.error("Failed to download labels")}},_=async()=>{try{const a=await g.downloadReport(),s=new Blob([a.data],{type:"application/pdf"}),l=window.URL.createObjectURL(s),r=document.createElement("a");r.href=l,r.download=`Inventory-Report-${new Date().toISOString().split("T")[0]}.pdf`,document.body.appendChild(r),r.click(),document.body.removeChild(r),window.URL.revokeObjectURL(l),o.success("Report downloaded!")}catch{o.error("Failed to download report")}},ee=a=>{switch(a){case"ACTIVE":return e.jsxs("span",{className:"status-badge status-success",children:[e.jsx(ce,{})," Active"]});case"DEPLETED":return e.jsxs("span",{className:"status-badge status-secondary",children:[e.jsx(F,{})," Depleted"]});case"EXPIRED":return e.jsxs("span",{className:"status-badge status-error",children:[e.jsx(de,{})," Expired"]});default:return e.jsx("span",{className:"status-badge",children:a})}};return U?e.jsx("div",{className:"loading-container",children:e.jsx("div",{className:"spinner"})}):e.jsxs("div",{children:[e.jsxs("header",{className:"page-header",children:[e.jsxs("div",{children:[e.jsxs("h1",{children:[e.jsx(k,{})," Inventory Management"]}),e.jsx("p",{children:"Manage product batches, generate labels, and track stock"})]}),e.jsxs("div",{style:{display:"flex",gap:"12px",flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn btn-secondary",onClick:_,children:[e.jsx(re,{})," Download Report"]}),e.jsxs("button",{className:"btn btn-gold",onClick:()=>x(!0),children:[e.jsx(b,{})," Create Batch"]})]})]}),c&&e.jsxs("div",{className:"stats-grid",style:{marginBottom:"24px"},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"var(--accent-gold)"},children:e.jsx(F,{})}),e.jsxs("div",{className:"stat-content",children:[e.jsx("span",{className:"stat-label",children:"Total Batches"}),e.jsx("span",{className:"stat-value",children:c.totalBatches})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"var(--primary-green)"},children:e.jsx(k,{})}),e.jsxs("div",{className:"stat-content",children:[e.jsx("span",{className:"stat-label",children:"Active Stock"}),e.jsx("span",{className:"stat-value",children:c.activeQuantity.toLocaleString()})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"#2196f3"},children:e.jsx(P,{})}),e.jsxs("div",{className:"stat-content",children:[e.jsx("span",{className:"stat-label",children:"Inventory Value"}),e.jsxs("span",{className:"stat-value",children:["₹",c.totalValue.toLocaleString()]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"#9c27b0"},children:e.jsx(le,{})}),e.jsxs("div",{className:"stat-content",children:[e.jsx("span",{className:"stat-label",children:"Products"}),e.jsx("span",{className:"stat-value",children:c.productBreakdown.length})]})]})]}),c&&c.productBreakdown.length>0&&e.jsxs("div",{className:"card",style:{marginBottom:"24px"},children:[e.jsx("h3",{style:{marginBottom:"16px"},children:"Stock by Product"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:"16px"},children:c.productBreakdown.map((a,s)=>e.jsxs("div",{style:{padding:"16px",background:"var(--bg-secondary)",borderRadius:"8px",border:"1px solid var(--border-light)"},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:"4px"},children:a.productName}),e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginBottom:"8px"},children:a.packaging}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsxs("span",{style:{color:"var(--primary-green)",fontWeight:600},children:[a.quantity," units"]}),e.jsxs("span",{style:{color:"var(--text-secondary)"},children:["₹",a.value.toLocaleString()]})]})]},s))})]}),e.jsxs("div",{className:"card",style:{marginBottom:"24px"},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},children:e.jsxs("h3",{children:[e.jsx(P,{style:{marginRight:"8px"}}),"Wholesale Pricing"]})}),e.jsx("p",{style:{marginBottom:"16px",color:"var(--text-secondary)",fontSize:"14px"},children:"Manage cost and wholesale prices for bulk orders. Click Edit to modify pricing."}),B.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:"var(--text-secondary)"},children:[e.jsx(P,{size:48,style:{marginBottom:"16px",opacity:.5}}),e.jsx("p",{children:"No wholesale SKUs configured yet"})]}):e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Product"}),e.jsx("th",{children:"Cost Price"}),e.jsx("th",{children:"Wholesale Price"}),e.jsx("th",{children:"MRP"}),e.jsx("th",{children:"Margin"}),e.jsx("th",{children:"Profit/Unit"}),e.jsx("th",{children:"Min Qty"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:B.map(a=>{const s=a.wholesalePrice>0?((a.wholesalePrice-a.costPrice)/a.wholesalePrice*100).toFixed(1):"0",l=a.wholesalePrice-a.costPrice,r=X===a.skuId;return e.jsxs("tr",{children:[e.jsx("td",{style:{fontWeight:500},children:a.skuName}),e.jsx("td",{children:r?e.jsx("input",{type:"number",value:j.costPrice,onChange:h=>f({...j,costPrice:parseFloat(h.target.value)||0}),className:"form-input",style:{width:"80px",padding:"6px"}}):e.jsxs("span",{children:["₹",a.costPrice]})}),e.jsx("td",{children:r?e.jsx("input",{type:"number",value:j.wholesalePrice,onChange:h=>f({...j,wholesalePrice:parseFloat(h.target.value)||0}),className:"form-input",style:{width:"80px",padding:"6px"}}):e.jsxs("span",{style:{color:"var(--primary-green)",fontWeight:600},children:["₹",a.wholesalePrice]})}),e.jsxs("td",{children:["₹",a.mrp]}),e.jsx("td",{children:e.jsxs("span",{style:{color:parseFloat(s)>=20?"var(--primary-green)":"#f59e0b",fontWeight:500},children:[s,"%"]})}),e.jsx("td",{children:e.jsxs("span",{style:{color:l>0?"var(--primary-green)":"#ef4444",fontWeight:600},children:["₹",l]})}),e.jsx("td",{children:a.minQuantity||10}),e.jsx("td",{children:r?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-gold btn-sm",onClick:async()=>{try{await A.update(a.skuId,j),o.success("Pricing updated!"),L(),v(null)}catch{o.error("Failed to update pricing")}},children:"Save"}),e.jsx("button",{className:"btn btn-secondary btn-sm",onClick:()=>v(null),children:"Cancel"})]}):e.jsxs("button",{className:"btn btn-secondary btn-sm",onClick:()=>{v(a.skuId),f({costPrice:a.costPrice,wholesalePrice:a.wholesalePrice})},children:[e.jsx(ne,{})," Edit"]})})]},a.skuId)})})]})})]}),e.jsxs("div",{className:"card",children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},children:e.jsxs("h3",{children:["All Batches (",m.length,")"]})}),m.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:"var(--text-secondary)"},children:[e.jsx(k,{size:48,style:{marginBottom:"16px",opacity:.5}}),e.jsx("p",{children:"No batches created yet"}),e.jsxs("button",{className:"btn btn-gold",onClick:()=>x(!0),style:{marginTop:"16px"},children:[e.jsx(b,{})," Create First Batch"]})]}):e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Batch #"}),e.jsx("th",{children:"Product"}),e.jsx("th",{children:"Packaging"}),e.jsx("th",{children:"Quantity"}),e.jsx("th",{children:"MRP"}),e.jsx("th",{children:"MFG Date"}),e.jsx("th",{children:"Expiry"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:m.map(a=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{style:{fontSize:"12px",background:"var(--bg-secondary)",padding:"2px 6px",borderRadius:"4px"},children:a.batchNumber})}),e.jsx("td",{style:{fontWeight:500},children:a.productName}),e.jsx("td",{children:a.packaging}),e.jsx("td",{children:e.jsx("span",{style:{color:"var(--primary-green)",fontWeight:600},children:a.quantity})}),e.jsxs("td",{children:["₹",a.mrp]}),e.jsx("td",{children:a.mfgDate?new Date(a.mfgDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"-"}),e.jsx("td",{children:a.expiryDate?new Date(a.expiryDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"-"}),e.jsx("td",{children:ee(a.status)}),e.jsx("td",{children:e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-secondary btn-sm",onClick:()=>{K(a),u(!0)},title:"Print Labels",children:e.jsx(E,{})}),e.jsx("button",{className:"btn btn-secondary btn-sm",onClick:()=>Y(a.id),title:"Delete",style:{color:"var(--error)"},children:e.jsx(ie,{})})]})})]},a.id))})]})})]}),q&&e.jsx("div",{className:"modal-overlay",onClick:()=>x(!1),children:e.jsxs("div",{className:"modal",onClick:a=>a.stopPropagation(),style:{maxWidth:"500px"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h2",{children:[e.jsx(b,{})," Create New Batch"]}),e.jsx("button",{className:"modal-close",onClick:()=>x(!1),children:e.jsx(W,{})})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Product *"}),e.jsxs("select",{value:t.productId,onChange:a=>$(a.target.value),className:"form-select",children:[e.jsx("option",{value:"",children:"Select Product"}),C.map(a=>e.jsx("option",{value:a.skuId,children:a.skuName},a.skuId))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Packaging *"}),e.jsxs("select",{value:t.packaging,onChange:a=>p({...t,packaging:a.target.value}),className:"form-select",children:[e.jsx("option",{value:"",children:"Select Packaging"}),G.map(a=>e.jsx("option",{value:a.size,children:a.size},a.id))]})]}),e.jsxs("div",{className:"form-row",style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Quantity *"}),e.jsx("input",{type:"number",value:t.quantity,onChange:a=>p({...t,quantity:parseInt(a.target.value)||0}),className:"form-input",min:"1"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"MRP (₹) *"}),e.jsx("input",{type:"number",value:t.mrp,onChange:a=>p({...t,mrp:parseFloat(a.target.value)||0}),className:"form-input",step:"0.01"})]})]}),e.jsxs("div",{className:"form-row",style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{children:[e.jsx(M,{})," Manufacturing Date"]}),e.jsx("input",{type:"date",value:t.mfgDate,onChange:a=>p({...t,mfgDate:a.target.value}),className:"form-input"})]}),e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{children:[e.jsx(M,{})," Expiry Date"]}),e.jsx("input",{type:"date",value:t.expiryDate,onChange:a=>p({...t,expiryDate:a.target.value}),className:"form-input"})]})]}),t.productName&&t.packaging&&t.quantity>0&&e.jsxs("div",{style:{marginTop:"16px",padding:"16px",background:"var(--bg-secondary)",borderRadius:"8px",border:"1px solid var(--border-light)"},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:"8px"},children:"Batch Summary"}),e.jsxs("div",{style:{fontSize:"14px",color:"var(--text-secondary)"},children:[e.jsxs("div",{children:["Product: ",t.productName," - ",t.packaging]}),e.jsxs("div",{children:["Quantity: ",t.quantity," units"]}),e.jsxs("div",{children:["Total Value: ₹",(t.quantity*t.mrp).toLocaleString()]})]})]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-secondary",onClick:()=>x(!1),children:"Cancel"}),e.jsxs("button",{className:"btn btn-gold",onClick:J,children:[e.jsx(b,{})," Create Batch"]})]})]})}),O&&i&&e.jsx("div",{className:"modal-overlay",onClick:()=>u(!1),children:e.jsxs("div",{className:"modal",onClick:a=>a.stopPropagation(),style:{maxWidth:"500px"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h2",{children:[e.jsx(E,{})," Generate Labels"]}),e.jsx("button",{className:"modal-close",onClick:()=>u(!1),children:e.jsx(W,{})})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("div",{style:{padding:"16px",background:"var(--bg-secondary)",borderRadius:"8px",marginBottom:"20px"},children:[e.jsxs("div",{style:{fontWeight:600,marginBottom:"8px"},children:[i.productName," - ",i.packaging]}),e.jsxs("div",{style:{fontSize:"14px",color:"var(--text-secondary)"},children:[e.jsxs("div",{children:["Batch: ",i.batchNumber]}),e.jsxs("div",{children:["Quantity: ",i.quantity," labels to generate"]}),e.jsxs("div",{children:["MRP: ₹",i.mrp]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Paper Size"}),e.jsxs("select",{value:d.paperSize,onChange:a=>N({...d,paperSize:a.target.value}),className:"form-select",children:[e.jsx("option",{value:"A4",children:"A4 (210 × 297 mm)"}),e.jsx("option",{value:"A5",children:"A5 (148 × 210 mm)"}),e.jsx("option",{value:"Letter",children:"Letter (8.5 × 11 in)"})]})]}),e.jsxs("div",{className:"form-row",style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Labels per Row"}),e.jsxs("select",{value:d.labelsPerRow,onChange:a=>N({...d,labelsPerRow:parseInt(a.target.value)}),className:"form-select",children:[e.jsx("option",{value:2,children:"2 labels"}),e.jsx("option",{value:3,children:"3 labels"}),e.jsx("option",{value:4,children:"4 labels"}),e.jsx("option",{value:5,children:"5 labels"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Label Height (pt)"}),e.jsxs("select",{value:d.labelHeight,onChange:a=>N({...d,labelHeight:parseInt(a.target.value)}),className:"form-select",children:[e.jsx("option",{value:60,children:"Small (60pt)"}),e.jsx("option",{value:80,children:"Medium (80pt)"}),e.jsx("option",{value:100,children:"Large (100pt)"}),e.jsx("option",{value:120,children:"Extra Large (120pt)"})]})]})]}),e.jsxs("div",{style:{marginTop:"20px"},children:[e.jsx("label",{style:{marginBottom:"8px",display:"block"},children:"Label Preview"}),e.jsxs("div",{style:{border:"1px dashed #b0b0b0",borderRadius:"4px",padding:"10px 12px",background:"#fff",maxWidth:"160px"},children:[e.jsxs("div",{style:{fontSize:"10px",color:"#000",marginBottom:"6px"},children:[e.jsx("strong",{children:"Batch No.:"})," ",i.batchNumber]}),e.jsxs("div",{style:{fontSize:"10px",color:"#000"},children:[e.jsx("strong",{children:"Mfg Date:"})," ",i.mfgDate?new Date(i.mfgDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"N/A"]})]})]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-secondary",onClick:()=>u(!1),children:"Cancel"}),e.jsxs("button",{className:"btn btn-gold",onClick:Z,children:[e.jsx(oe,{})," Download PDF (",i.quantity," labels)"]})]})]})}),e.jsx("style",{children:`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid var(--border-light);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .btn-sm {
          padding: 6px 10px;
          font-size: 14px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal {
          background: var(--bg-primary);
          border-radius: 16px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-light);
        }
        .modal-header h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 18px;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 4px;
        }
        .modal-body {
          padding: 24px;
          overflow-y: auto;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-light);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
        }
        .form-input, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: var(--primary-green);
          box-shadow: 0 0 0 2px rgba(45, 80, 22, 0.1);
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th,
        .data-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-light);
        }
        .data-table th {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          background: var(--bg-secondary);
        }
        .data-table tbody tr:hover {
          background: var(--bg-secondary);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-success {
          background: rgba(76, 175, 80, 0.1);
          color: #4caf50;
        }
        .status-secondary {
          background: rgba(158, 158, 158, 0.1);
          color: #9e9e9e;
        }
        .status-error {
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .stat-card {
            padding: 16px;
          }
          .stat-value {
            font-size: 20px;
          }
        }
      `})]})}export{xe as default};

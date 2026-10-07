const fail=(status,message)=>Object.assign(new Error(message),{status});
const handle=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){const status=e.status||(e.code===11000?409:['ValidationError','CastError'].includes(e.name)?400:500);res.status(status).json({success:false,message:status===500?'Unable to complete the request. Please try again.':e.message});}};
function page(query){const page=Number(query.page||1),limit=Number(query.limit||20);if(!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>100)throw fail(400,'Use page >= 1 and limit between 1 and 100.');return {page,limit,skip:(page-1)*limit};}
async function list(Model,filter,req,res,sort={createdAt:-1},select,mapper=x=>x){const p=page(req.query);let q=Model.find(filter).sort(sort).skip(p.skip).limit(p.limit);if(select)q=q.select(select);const[rows,total]=await Promise.all([q.lean(),Model.countDocuments(filter)]);res.json({success:true,data:rows.map(mapper),pagination:{page:p.page,limit:p.limit,total,pages:Math.ceil(total/p.limit)}});}
const regex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const text=(req,english,hindi)=>req.query.lang==='hi'?(hindi||english):english;
const refId=value=>value&&value._id?value._id:value||null;
const defaultProfileImage=()=>{
  const base=(process.env.R2_PUBLIC_URL||'').replace(/\/$/,'');
  return base?`${base}/profiles/default-profile.png`:null;
};
const profile=(u,req)=>{
  const image=mediaUrl(u.profileImage,req)||defaultProfileImage();
  const address=u.address||{};
  const program=u.programId&&u.programId.programName?{id:u.programId._id,name:u.programId.programName,nameHindi:u.programId.programNameHindi||null,image:mediaUrl(u.programId.displayImage,req)}:null;
  const batch=u.batchId&&u.batchId.batchName?{id:u.batchId._id,name:u.batchId.batchName,nameHindi:u.batchId.batchNameHindi||null}:null;
  return {
    id:u._id,
    _id:u._id,
    fullName:u.fullName,
    email:u.email,
    phone:u.phone||'',
    image,
    role:u.role,
    type:u.type,
    isActive:u.isActive!==false,
    emailVerified:!!u.emailVerifiedAt,
    emailVerifiedAt:u.emailVerifiedAt||null,
    name:u.fullName,
    mobileNo:u.phone||'',
    pincode:address.pincode||'',
    houseNo:address.houseNo||'',
    locality:address.locality||'',
    colony:address.colony||'',
    city:address.city||'',
    address:{pincode:address.pincode||'',houseNo:address.houseNo||'',locality:address.locality||'',colony:address.colony||'',city:address.city||''},
    preferredLanguage:u.preferredLanguage||'en',
    notificationsEnabled:u.notificationsEnabled!==false,
    purchasedPlanId:u.purchasedPlanId||null,
    programId:refId(u.programId),
    batchId:refId(u.batchId),
    program,
    batch,
    planActivatedAt:u.planActivatedAt||null,
    planExpiryAt:u.planExpiryAt||null,
    createdAt:u.createdAt||null,
    updatedAt:u.updatedAt||null
  };
};
const active=()=>({isActive:{$ne:false}});
module.exports={fail,handle,page,list,regex,text,profile,mediaUrl,active};

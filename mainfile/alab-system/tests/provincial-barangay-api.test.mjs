import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { loadServerModule } from './helpers/load-server-module.mjs';
const require=createRequire(import.meta.url);
const {NextRequest,NextResponse}=require('next/server');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const request=(body)=>new NextRequest('http://localhost/api/provincial-bfp/barangay-alerts',body?{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{});
function route(authorized=true){
  const calls=[];
  const api=loadServerModule('app/api/provincial-bfp/barangay-alerts/route.ts',{
    'next/server':{NextRequest,NextResponse},
    '../../../../lib/provincial-bfp/auth':{requireProvincialBfp:async()=>authorized?{userId:id(99)}:NextResponse.json({error:'Unauthorized'},{status:401}),isProvincialAuthorizationResponse:v=>v instanceof NextResponse},
    '../../../../lib/intermunicipality/barangay-alerts':{
      listProvincialBarangayAlerts:async()=>{calls.push('list');return[];},
      acknowledgeProvincialBarangayAlert:async(...args)=>{calls.push(args);return {acknowledged:true};},
      assignBarangayIncidentAssistance:async(input)=>{calls.push(input);return[{id:id(50)}];},
    },
  });return{api,calls};
}
test('every barangay alert operation requires provincial authorization before data access',async()=>{
  const {api,calls}=route(false);
  for(const action of ['GET','PATCH','POST'])assert.equal((await api[action](request())).status,401);
  assert.deepEqual(calls,[]);
});
test('alert mutations validate identifiers, resources and snapshot; actor comes from authorization',async()=>{
  const {api,calls}=route();
  assert.equal((await api.GET(request())).headers.get('Cache-Control'),'private, no-store');
  assert.equal((await api.PATCH(request({alertId:'bad',incidentIds:[id(1)]}))).status,400);
  assert.equal((await api.PATCH(request({alertId:id(1),incidentIds:[id(2),id(3),id(4)]}))).status,200);
  assert.deepEqual(calls[1],[id(1),[id(2),id(3),id(4)],id(99)]);
  const command={alertId:id(1),fireReportId:id(2),recipientMunicipalityId:id(3),requestedFiretrucks:1,requestedPersonnel:0,actorUserId:id(4)};
  assert.equal((await api.POST(request({...command,requestedFiretrucks:'1'}))).status,400);
  assert.equal((await api.POST(request({...command,requestedFiretrucks:0}))).status,400);
  assert.equal((await api.POST(request(command))).status,201);
  assert.equal(calls.at(-1).actorUserId,id(99));
});

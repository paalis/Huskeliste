import test from 'node:test';
import assert from 'node:assert/strict';
import { openTaskStore } from '../src/storage.js';

class MemoryRequest { set onsuccess(fn){queueMicrotask(fn)} set onerror(_){} }
class MemoryDB {
  data=new Map();
  open(){const req=new MemoryRequest();req.result={createObjectStore(){},transaction:()=>({objectStore:()=>({getAll:()=>Object.assign(new MemoryRequest(),{result:[...this.data.values()]}),put:t=>{this.data.set(t.id,t);return Object.assign(new MemoryRequest(),{result:t.id})},delete:id=>{this.data.delete(id);return new MemoryRequest()},clear:()=>{this.data.clear();return new MemoryRequest()}})})};return req;}
}
test('lagrer, leser og sletter oppgaver',async()=>{const store=openTaskStore(new MemoryDB());const task={id:'1',title:'Test'};await store.put(task);assert.deepEqual(await store.all(),[task]);await store.remove('1');assert.deepEqual(await store.all(),[]);});

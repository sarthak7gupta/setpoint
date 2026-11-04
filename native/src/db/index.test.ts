import { beforeEach, expect, it, vi } from 'vitest'
import { freshSingles } from '../../../shared/engine/testHelpers'
import type { MatchRecord } from '../../../shared/records'
import { buildBackup } from '../../../shared/backup'
const disk=vi.hoisted(()=>new Map<string,string>())
const storage=vi.hoisted(()=>({ getItem:vi.fn(async (key:string)=>disk.get(key)??null), setItem:vi.fn(async (key:string,value:string)=>{disk.set(key,value)}), removeItem:vi.fn(async(key:string)=>{disk.delete(key)}) }))
vi.mock('@react-native-async-storage/async-storage',()=>({default:storage}))
function record(id:string):MatchRecord { const state=freshSingles();return {id,createdAt:1,updatedAt:1,state,config:state.config,metadata:state.metadata,playerNames:{p1:'A',p2:'B'}} }
beforeEach(()=>{vi.resetModules();disk.clear();vi.clearAllMocks()})
it('deletes a cold-store match without restoring it during hydration',async()=>{
  disk.set('setpoint.matches',JSON.stringify([record('m')]))
  const db=await import('./index')
  await db.deleteMatch('m')
  expect(await db.listMatches()).toEqual([])
  expect(JSON.parse(disk.get('setpoint.matches')!)).toEqual([])
})
it('preserves same-name profiles and serializes saves',async()=>{
  const db=await import('./index')
  const a=await db.upsertPlayer('Alex'),b=await db.upsertPlayer('Alex')
  expect(a.id).not.toBe(b.id)
  await Promise.all([db.saveMatch(record('a')),db.saveMatch(record('b'))])
  expect(await db.listMatches()).toHaveLength(2)
})
it('recovers an interrupted multi-record restore before exposing records',async()=>{
  const db=await import('./index')
  await db.saveMatch(record('old'))
  await db.getSettings()
  const backup=buildBackup({players:[],matches:[record('new')],settings:{theme:'usOpen'}})
  storage.setItem.mockImplementationOnce(async(key,value)=>{disk.set(key,value)}).mockRejectedValueOnce(new Error('disk full'))
  await expect(db.applyBackup(backup)).rejects.toThrow('disk full')
  expect(disk.has('setpoint.restore')).toBe(true)
  expect((await db.listMatches()).map(m=>m.id).sort()).toEqual(['new','old'])
  expect(disk.has('setpoint.restore')).toBe(false)
})

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileValues} from '../src/profiles.mjs';
test('profile creation trims names and preserves a descriptive title',()=>{
 const p=profileValues('  Wallace  ',' Project lead ');
 assert.equal(p.name,'Wallace');assert.equal(p.title,'Project lead');
 assert.ok(p.hue>=0&&p.hue<=360);
});
test('empty and oversized profile names are rejected',()=>{
 assert.throws(()=>profileValues('   '),/profile name/);
 assert.throws(()=>profileValues('x'.repeat(121)),/profile name/);
});

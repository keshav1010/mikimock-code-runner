const { test }=require('node:test');
const assert=require('node:assert/strict');
const { runFast }=require('../dist/fastRunExecutor.js');
const { submitFast }=require('../dist/fastSubmitExecutor.js');
const { executeCode, prepareExecutor, runCommand }=require('../dist/executor.js');
const enabled=process.env.RUN_DOCKER_TESTS==='1';
const config={functionName:'solve',params:[{name:'x',type:'int'}],returnType:'int'};
const code={java:'class Solution { public int solve(int x) { return x; } }',cpp:'class Solution { public: int solve(int x) { return x; } };',python:'class Solution:\n    def solve(self,x):\n        return x',javascript:'class Solution { solve(x) { return x; } }'};
test('real Docker: four language run/submit, wrong answer and cleanup', {skip:!enabled,timeout:120000}, async()=>{
    await prepareExecutor();
    for(const language of Object.keys(code)) {
        console.log('Docker fixture language:',language);
        const run=await runFast(language,code[language],config,'7'); assert.equal(run.success,true,JSON.stringify(run)); assert.equal(run.output,'7');
        const submit=await submitFast(language,code[language],config,[{testCaseNumber:1,input:'7',expectedOutput:'7'}]); assert.equal(submit.allPassed,true,JSON.stringify(submit));
        const wrong=await submitFast(language,code[language],config,[{testCaseNumber:1,input:'7',expectedOutput:'8'}]); assert.equal(wrong.allPassed,false);
    }
    assert.equal((await runCommand('docker',['ps','-aq','--filter','label=mikimock.runner.managed=true'],'',5000)).stdout.trim(),'');
});
test('real Docker: runtime timeout, compile error, output flood and sandbox identity', {skip:!enabled,timeout:60000}, async()=>{
    const timeout=await executeCode('python','while True: pass'); assert.equal(timeout.status,'TIME_LIMIT_EXCEEDED');
    const compile=await executeCode('java','invalid java'); assert.equal(compile.status,'COMPILE_ERROR');
    const flood=await executeCode('python','while True: print("x"*1000)'); assert.equal(flood.status,'EXECUTION_FAILED'); assert.equal(flood.error,'Output limit exceeded');
    const identity=await executeCode('python','import os\nprint(os.getuid())\ntry:\n open("/source/main.py","w")\nexcept OSError:\n print("readonly")');
    assert.equal(identity.success,true,JSON.stringify(identity)); assert.match(identity.output,/65534/); assert.match(identity.output,/readonly/);
    assert.equal((await runCommand('docker',['ps','-aq','--filter','label=mikimock.runner.managed=true'],'',5000)).stdout.trim(),'');
});
test('real Docker: memory and writable filesystem bounds, no external network', {skip:!enabled,timeout:30000}, async()=>{
    const memory=await executeCode('python','x=bytearray(1024*1024*1024)'); assert.equal(memory.success,false); assert.ok(['MEMORY_LIMIT_EXCEEDED','TIME_LIMIT_EXCEEDED'].includes(memory.status),JSON.stringify(memory));
    const filesystem=await executeCode('python','import os,socket\ntry:\n f=open("/app/fill","wb")\n for i in range(100): f.write(b"x"*1024*1024)\n f.flush()\nexcept OSError:\n print("disk-bounded")\ntry:\n socket.create_connection(("1.1.1.1",80),timeout=1)\nexcept OSError:\n print("network-blocked")');
    assert.equal(filesystem.success,true,JSON.stringify(filesystem)); assert.match(filesystem.output,/disk-bounded/); assert.match(filesystem.output,/network-blocked/);
    assert.equal((await runCommand('docker',['ps','-aq','--filter','label=mikimock.runner.managed=true'],'',5000)).stdout.trim(),'');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ExecutionQueue, BusyError } = require('../dist/executionQueue.js');
const { serverConfig } = require('../dist/config.js');
const { validateRequest } = require('../dist/requestValidation.js');
const { createApp } = require('../dist/app.js');
const { runCommand, dockerArguments } = require('../dist/executor.js');
const { NQueensChecker } = require('../dist/checkers/NQueensChecker.js');
const { TopKFrequentChecker } = require('../dist/checkers/TopkFrequentChecker.js');
const { parseRunnerOutput } = require('../dist/fastSubmitExecutor.js');
const { parseRunOutput } = require('../dist/fastRunExecutor.js');
const limits = {secret: 'test-only-secret',port:9090,concurrency:4,queueSize:32,queueTimeoutMs:30000,maxCodeBytes:100000,maxInputBytes:50000,maxTestCases:1000};
const body = () => ({language:'java',code:'class Solution { int solve(int x) { return x; } }',executionConfig:{functionName:'solve',params:[{name:'x',type:'int'}],returnType:'int'},input:'1'});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('missing and blank secret fail configuration without exposing values', () => {
    const old = process.env.RUNNER_SECRET;
    try {
        delete process.env.RUNNER_SECRET; assert.throws(serverConfig, /RUNNER_SECRET/);
        process.env.RUNNER_SECRET = ' '; assert.throws(serverConfig, /RUNNER_SECRET/);
    } finally { if (old === undefined) delete process.env.RUNNER_SECRET; else process.env.RUNNER_SECRET = old; }
});
test('queue bounds active work and rejects overflow', async () => {
    const queue = new ExecutionQueue(2, 3, 1000);
    let active=0, peak=0;
    const task = async () => { peak=Math.max(peak,++active); await delay(20); active--; };
    const jobs = Array.from({length:5}, () => queue.run(task));
    await assert.rejects(queue.run(task), BusyError);
    await Promise.all(jobs); assert.equal(peak,2); assert.equal(queue.stats().active,0);
});
test('50 simultaneous requests never exceed four active and 32 waiting', async () => {
    const queue=new ExecutionQueue(4,32,1000);
    let active=0,peak=0;
    const jobs=Array.from({length:50},()=>queue.run(async()=>{ peak=Math.max(peak,++active); await delay(5); active--; }));
    const results=await Promise.allSettled(jobs);
    assert.equal(peak,4); assert.equal(results.filter(x=>x.status==='rejected').length,14);
});
test('duplicate result events cannot inflate grading; null and invalid JSON output are safe',()=>{
    const config={functionName:'solve',params:[{name:'x',type:'int'}],returnType:'int',checkerType:'ANY_ORDER'};
    const cases=[{testCaseNumber:1,input:'1',expectedOutput:'[1]'},{testCaseNumber:2,input:'2',expectedOutput:'[2]'}];
    const duplicate=JSON.stringify({type:'RESULT',testCase:1,actual:'[1]'});
    const result=parseRunnerOutput('null\n'+duplicate+'\n'+duplicate,null,'SUCCESS',config,cases);
    assert.equal(result.passedTests,1); assert.equal(result.allPassed,false);
    const invalid=parseRunnerOutput(JSON.stringify({type:'RESULT',testCase:1,actual:'not-json'}),null,'SUCCESS',config,cases);
    assert.equal(invalid.passedTests,0);
    assert.equal(parseRunOutput('null\n{}',null,'SUCCESS','1').success,false);
});
test('queue wait, disconnect and shutdown reject queued jobs', async () => {
    const queue = new ExecutionQueue(1, 2, 10);
    const first = queue.run(() => delay(50));
    await assert.rejects(queue.run(async()=>{}), /expired/);
    const controller = new AbortController();
    const canceled=queue.run(async()=>{},controller.signal);
    controller.abort(); await assert.rejects(canceled,/disconnected/);
    const stopped=queue.run(async()=>{}); queue.stop(); await assert.rejects(stopped,/shutting down/);
    await first; await queue.idle(); assert.equal(queue.stats().queued,0);
});
test('valid run and submit retain field names; malformed and excessive data fail', () => {
    validateRequest(body(), false, limits);
    const submit={...body(),testCases:[{testCaseNumber:1,input:'1',expectedOutput:'1'}]};
    validateRequest(submit,true,limits);
    for (const invalid of [null,{}, {...body(),code:4},{...body(),executionConfig:null},{...body(),input:[]},{...body(),code:'x'.repeat(100001)}, {...body(),input:'['.repeat(40)+'0'+']'.repeat(40)}]) {
        assert.throws(()=>validateRequest(invalid,false,limits));
    }
    assert.throws(()=>validateRequest({...submit,testCases:[...submit.testCases,...submit.testCases]},true,limits));
});
test('HTTP auth precedes parsing; health, invalid JSON, oversized body use JSON envelopes', async () => {
    const server=createApp(limits,new ExecutionQueue(1,1,100)).listen(0,'127.0.0.1');
    await new Promise(resolve=>server.on('listening',resolve));
    const url=`http://127.0.0.1:${server.address().port}`;
    try {
        assert.equal((await fetch(url+'/health')).status,200);
        for (const secret of [undefined,'wrong']) {
            const headers={'Content-Type':'application/json'}; if(secret) headers['X-Runner-Secret']=secret;
            const res=await fetch(url+'/run',{method:'POST',headers,body:'bad json'});
            assert.equal(res.status,401); assert.equal((await res.json()).status,'UNAUTHORIZED');
        }
        const headers={'Content-Type':'application/json','X-Runner-Secret':limits.secret};
        assert.equal((await fetch(url+'/run',{method:'POST',headers,body:'bad json'})).status,400);
        assert.equal((await fetch(url+'/submit',{method:'POST',headers,body:JSON.stringify({code:'a'.repeat(210000)})})).status,413);
        assert.equal((await fetch(url+'/run',{method:'POST',headers,body:'{}'})).status,400);
    } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
test('output floods and hanging children are terminated and spawn failure is handled', async () => {
    const flood=await runCommand(process.execPath,['-e',"setInterval(()=>process.stdout.write('x'.repeat(8192)),1)"],'',2000);
    assert.equal(flood.outputExceeded,true); assert.ok(Buffer.byteLength(flood.stdout)<=20000);
    const hang=await runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],'',50); assert.equal(hang.killed,true);
    const missing=await runCommand('mikimock-nonexistent-command',[],'',100); assert.equal(missing.spawnFailed,true);
});
test('Docker args use fixed shell, nonroot, no network, readonly source and bounded writable space', () => {
    const args=dockerArguments({fileName:'Main.java',image:'eclipse-temurin:21-jdk',command:'fixed-command'},'/tmp/test','mikimock-job-test');
    for(const flag of ['--network','--memory','--cpus','--pids-limit','--user','--cap-drop','--read-only','--log-driver']) assert.ok(args.includes(flag));
    assert.ok(args.includes('65534:65534')); assert.ok(args.some(x=>x.includes('dst=/source,readonly')));
    assert.equal(args.at(-1),'cp /source/Main.java /app/Main.java && fixed-command');
});
test('NQueens empty/duplicate answers and top-k missing mandatory high frequency fail', () => {
    const checker=new NQueensChecker();
    assert.equal(checker.check({inputRaw:'4',expectedRaw:'[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',actualRaw:'[]'}),false);
    const top=new TopKFrequentChecker();
    assert.equal(top.check({inputRaw:'[[1,1,1,2,2,3,3],2]',expectedRaw:'[1,2]',actualRaw:'[2,3]'}),false);
    assert.equal(top.check({inputRaw:'[[1,1,1,2,2,3,3],2]',expectedRaw:'[1,2]',actualRaw:'[1,3]'}),true);
});

import * as fs from "fs";
import * as path from "path";
import * as _ from 'lodash';
import { AggregatedResult, Context, Reporter, ReporterOnStartOptions, Test, TestResult } from "@jest/reporters";
import { TestCaseResult } from "@jest/test-result";


function log(...args) {
    console.log('MetricReporter: ', ...args);
}
export default class MetricReporter {

    report(m: PerformanceMetric) {
        this.metrics.push(m);
    }
    constructor() {
        this.metrics = [];
    }
    metrics: PerformanceMetric[];

    // https://jasmine.github.io/api/edge/Reporter.html

    jasmineStarted(suiteInfo) {    }
    suiteStarted(result) {    }
    specStarted(result) {    }
    specDone(result) {    }
    suiteDone(result) {    }

    jasmineDone(result) {
        
        if (result.failedExpectations.length > 0) {
            log('Test failed. Not reporting performance metrics.');
            return;
        }
        const metrics: PerformanceMetric[] = this.metrics

        if (metrics.length == 0) {
            log('Nothing to report');
            return;
        }

        return processMetrics(metrics).then(x=>{
            var report:any = {};
            report.benchmarks = x;
            const envHead = 'REPORT_META_'
            const entries = Object.keys(process.env).filter(x=>x.startsWith(envHead)).map(key=> [key.substring(envHead.length), process.env[key]] )
            const meta = _.fromPairs(entries)
            report.meta = meta;
            const json = JSON.stringify(report);
            fs.writeFileSync(path.resolve(__dirname, '..', 'metric-report.json'), json)
        })
    }
}

export class PerformanceMetric {
    constructor(
        public name: string,
        public JSHeapUsedSize: number,
        public JSHeapTotalSize: number,
        public TaskDuration: number
    ) { }
}

async function processMetrics(ms:PerformanceMetric[]): Promise<any> {
    return ms.reduce((x,{name,JSHeapTotalSize, JSHeapUsedSize, TaskDuration})=>{
        x[name] = {}
        x[name].JSHeapTotalSize = {unit:"mb", value: Number.parseFloat((JSHeapTotalSize/(1024*1024)).toFixed(2))}
        x[name].JSHeapUsedSize = {unit:"mb", value: Number.parseFloat((JSHeapUsedSize/(1024*1024)).toFixed(2))}
        x[name].TaskDuration = {unit:"s", value:TaskDuration}
        return x
    },{});
}

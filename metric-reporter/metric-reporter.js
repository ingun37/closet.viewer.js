"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMetric = void 0;
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
function log(...args) {
    console.log('MetricReporter: ', ...args);
}
class MetricReporter {
    constructor() {
        this.metrics = [];
    }
    report(m) {
        this.metrics.push(m);
    }
    // https://jasmine.github.io/api/edge/Reporter.html
    jasmineStarted(suiteInfo) { }
    suiteStarted(result) { }
    specStarted(result) { }
    specDone(result) { }
    suiteDone(result) { }
    jasmineDone(result) {
        if (result.failedExpectations.length > 0) {
            log('Test failed. Not reporting performance metrics.');
            return;
        }
        const metrics = this.metrics;
        if (metrics.length == 0) {
            log('Nothing to report');
            return;
        }
        return processMetrics(metrics).then(x => {
            var report = {};
            report.benchmarks = x;
            const envHead = 'REPORT_META_';
            const entries = Object.keys(process.env).filter(x => x.startsWith(envHead)).map(key => [key.substring(envHead.length), process.env[key]]);
            const meta = _.fromPairs(entries);
            report.meta = meta;
            const json = JSON.stringify(report);
            fs.writeFileSync(path.resolve(__dirname, '..', 'metric-report.json'), json);
        });
    }
}
exports.default = MetricReporter;
class PerformanceMetric {
    constructor(name, JSHeapUsedSize, JSHeapTotalSize, TaskDuration) {
        this.name = name;
        this.JSHeapUsedSize = JSHeapUsedSize;
        this.JSHeapTotalSize = JSHeapTotalSize;
        this.TaskDuration = TaskDuration;
    }
}
exports.PerformanceMetric = PerformanceMetric;
function processMetrics(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return ms.reduce((x, { name, JSHeapTotalSize, JSHeapUsedSize, TaskDuration }) => {
            x[name] = {};
            x[name].JSHeapTotalSize = { unit: "mb", value: Number.parseFloat((JSHeapTotalSize / (1024 * 1024)).toFixed(2)) };
            x[name].JSHeapUsedSize = { unit: "mb", value: Number.parseFloat((JSHeapUsedSize / (1024 * 1024)).toFixed(2)) };
            x[name].TaskDuration = { unit: "s", value: TaskDuration };
            return x;
        }, {});
    });
}

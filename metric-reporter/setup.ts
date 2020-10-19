import * as fs from "fs";
import * as path from "path";
import { AggregatedResult, Context, Reporter, ReporterOnStartOptions, Test, TestResult } from "@jest/reporters";
import { GlobalConfig } from "@jest/types/build/Config";
import MetricReporter, { PerformanceMetric } from "./metric-reporter";
import jestConfig, { reporters } from "../jest.config";


const reporter = new MetricReporter();
(global as any).metricReporter = reporter;
jasmine.getEnv().addReporter(reporter);

declare namespace jasmine {
    function getEnv():any;
}
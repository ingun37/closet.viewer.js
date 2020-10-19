#!/bin/zsh
pushd $(dirname "$0")
npx tsc -m commonjs -t es2015 metric-reporter.ts setup.ts
popd
minerva
=======

[![Build Status](https://travis-ci.org/wsick/minerva.svg?branch=master)](https://travis-ci.org/wsick/minerva)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/wsick/Fayde?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Applying microservice architecture to the presentation layer.

Purpose
=======

After building [Fayde](http://github.com/bsick7/fayde) presentation engine, we reached a threshold of optimization.  Due to the structure, we could not unit test or performance test pieces of the engine.  Since the engine consisted of monolithic items, any browser profiling resulted in nothing insightful.  A sizeable chunk consisted of long functions causing browsers to bail when trying to compile interpreted code to native.

We expect a 10x (worst case) to 100x (best case) performance improvement.  We also expect a stable and configurable presentation layer due to the philosophy of unit testing.

A great side effect of a microservices pipeline architecture is the highly configurable nature.  Currently, presentation code is coupled to controls.  Instead, these pieces of functionality are injected by the defining entities.

Documentation
=======

* See [pipeline](docs/pipeline.md) notes for information on how pipelines work.
* See [engine](docs/engine.md) notes for information on how the presentation engine works.


Contributing
=======

### Prerequisites

```
$ npm install -g gulp
$ npm install -g bower
$ npm install -g fayde-unify
```

### Setup

```
$ git clone git@github.com:wsick/nullstone.git
$ cd nullstone
$ npm install
$ gulp reset # cleans bower libs, bower installs, then symlinks to test and stress bootstrappers
```

### Unit Tests

```
$ gulp test
```

### Stress Tests
Launches default browser with runnable stress tests.
```
$ gulp stress
```

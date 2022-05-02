nullstone
=========

[![Build Status](https://travis-ci.org/wsick/nullstone.svg?branch=master)](https://travis-ci.org/wsick/nullstone)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/wsick/Fayde?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Javascript application core library

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

/**
 * @license Copyright (c) 2012-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*global define, Reflect */

/*
 * xpcshell has a smaller stack on linux and windows (1MB vs 9MB on mac),
 * and the recursive nature of esprima can cause it to overflow pretty
 * quickly. So favor it built in Reflect parser:
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
 */
define(['./esprima', 'env'], function (esprima, env) {
    if (env.get() === 'xpconnect' && typeof Reflect !== 'undefined') {
        return Reflect;
    } else {
        return esprima;
    }
});

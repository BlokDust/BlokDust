# tween.ts

TypeScript version of http://github.com/sole/tween.js

Enables use as an AMD module in TypeScript:

`import Tween = require("./Tween");`

Uses browserify with a deamdify transformer to build tween.min.js which can be included in a page using a regular script tag:

`<script src="../build/tween.min.js"></script>`

(See examples)

## installation

`bower install tween.ts`

## notes

If you get this error when compiling:

`'this' cannot be referenced within module bodies`

Comment out this line at the top of Tween.ts:

`window.TWEEN = this;`

It's purely for the js examples, and not necessary for TypeScript apps.

http://typescript.codeplex.com/workitem/1951
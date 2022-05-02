/// <reference path="Expression.ts" />

module Fayde {
    export class DeferredValueExpression extends Expression {
        GetValue(propd: DependencyProperty): any {
            return undefined;
        }
        toString(): string { return "DeferredValueExpression"; }
    }
}
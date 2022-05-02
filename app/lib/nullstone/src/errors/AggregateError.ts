module nullstone {
    export class AggregateError {
        errors: any[];

        constructor (errors: any[]) {
            this.errors = errors.filter(e => !!e);
            Object.freeze(this);
        }

        get flat (): any[] {
            var flat: any[] = [];
            for (var i = 0, errs = this.errors; i < errs.length; i++) {
                var err = errs[i];
                if (err instanceof AggregateError) {
                    flat = flat.concat((<AggregateError>err).flat);
                } else {
                    flat.push(err);
                }
            }
            return flat;
        }
    }
}
module nullstone {
    export class Memoizer<T> {
        private $$creator: (key: string) => T;
        private $$cache: any = {};

        constructor (creator: (key: string) => T) {
            this.$$creator = creator;
        }

        memoize (key: string): T {
            var obj = this.$$cache[key];
            if (!obj)
                this.$$cache[key] = obj = this.$$creator(key);
            return obj;
        }
    }
}
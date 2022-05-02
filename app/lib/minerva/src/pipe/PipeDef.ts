module minerva.pipe {
    export interface ITapin {
        (data: IPipeData, ...contexts: any[]): boolean;
    }

    export class PipeDef<T extends ITapin, TData extends IPipeData> implements IPipeDef<TData> {
        private $$names: string[] = [];
        private $$tapins: T[] = [];

        addTapin (name: string, tapin: T): PipeDef<T, TData> {
            this.$$names.push(name);
            this.$$tapins.push(tapin);
            return this;
        }

        addTapinBefore (before: string, name: string, tapin: T): PipeDef<T, TData> {
            var names = this.$$names;
            var tapins = this.$$tapins;
            var index = !before ? -1 : names.indexOf(before);
            if (index === -1) {
                names.unshift(name);
                tapins.unshift(tapin);
            } else {
                names.splice(index, 0, name);
                tapins.splice(index, 0, tapin);
            }
            return this;
        }

        addTapinAfter (after: string, name: string, tapin: T): PipeDef<T, TData> {
            var names = this.$$names;
            var tapins = this.$$tapins;
            var index = !after ? -1 : names.indexOf(after);
            if (index === -1 || index === names.length - 1) {
                names.push(name);
                tapins.push(tapin);
            } else {
                names.splice(index + 1, 0, name);
                tapins.splice(index + 1, 0, tapin);
            }
            return this;
        }

        replaceTapin (name: string, tapin: T): PipeDef<T, TData> {
            var names = this.$$names;
            var tapins = this.$$tapins;
            var index = names.indexOf(name);
            if (index === -1)
                throw new Error("Could not replace pipe tap-in. No pipe tap-in named `" + name + "`.");
            tapins[index] = tapin;
            return this;
        }

        removeTapin (name: string): PipeDef<T, TData> {
            var names = this.$$names;
            var index = names.indexOf(name);
            if (index === -1)
                throw new Error("Could not replace pipe tap-in. No pipe tap-in named `" + name + "`.");
            names.splice(index, 1);
            this.$$tapins.splice(index, 1);
            return this;
        }

        run (data: TData, ...contexts: any[]): boolean {
            contexts.unshift(data);

            this.prepare.apply(this, contexts);

            var flag = true;
            for (var i = 0, tapins = this.$$tapins, len = tapins.length; i < len; i++) {
                if (!tapins[i].apply(this, contexts)) {
                    flag = false;
                    break;
                }
            }

            this.flush.apply(this, contexts);

            return flag;
        }

        prepare (data: TData, ...contexts: any[]) {
        }

        flush (data: TData, ...contexts: any[]) {
        }
    }
}
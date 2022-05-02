module nullstone {
    export class DirLoadError {
        constructor (public path: string, public error: any) {
            Object.freeze(this);
        }
    }
}
module nullstone {
    export class LibraryLoadError {
        constructor (public library: Library, public error: Error) {
            Object.freeze(this);
        }
    }
}
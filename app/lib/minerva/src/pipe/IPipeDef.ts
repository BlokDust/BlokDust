module minerva.pipe {
    export interface IPipeData {
    }
    export interface IPipeDef<TData extends IPipeData> {
        run(...contexts: any[]):boolean;
        prepare(data: TData);
        flush(data: TData);
    }
}
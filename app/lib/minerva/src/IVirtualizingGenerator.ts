module minerva {
    export interface IVirtualizingGenerator {
        current: core.Updater;
        generate(): boolean;
    }
}
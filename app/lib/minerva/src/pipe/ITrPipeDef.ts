module minerva.pipe {
    export interface IPipeInput {
    }
    export interface IPipeState {
    }
    export interface IPipeOutput {
    }
    export interface ITriPipeDef<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput> {
        run(input: TInput, state: TState, output: TOutput, ...contexts: any[]): boolean;
        createState(): TState;
        createOutput(): TOutput;
        prepare(input: TInput, state: TState, output: TOutput);
        flush(input: TInput, state: TState, output: TOutput);
    }
}
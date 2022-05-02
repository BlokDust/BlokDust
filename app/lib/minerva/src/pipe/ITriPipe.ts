module minerva.pipe {
    export class ITriPipe<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput> {
        def: ITriPipeDef<TInput, TState, TOutput>;
        state: TState;
        output: TOutput;
    }

    export function createTriPipe<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput>(pipedef: ITriPipeDef<TInput, TState, TOutput>): ITriPipe<TInput, TState, TOutput> {
        return <ITriPipe<TInput, TState, TOutput>> {
            def: pipedef,
            state: pipedef.createState(),
            output: pipedef.createOutput()
        };
    }
}
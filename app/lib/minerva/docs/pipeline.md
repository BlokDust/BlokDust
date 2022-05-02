## Pipe
* Composed of tapins
* A pipe has a set of methods to help configure the tapin workflow
    * `addTapin(name, tapin)`
    * `addTapinBefore(before, name, tapin)`
    * `addTapinAfter(after, name, tapin)`
    * `replaceTapin(name, tapin)`
    * `removeTapin(name)`
* A tri-pipe also contains methods to configure state and output
    * `createState()`
    * `createOutput()`

## Tapin
* A tapin is a function that takes data as a parameter
* A tapin is registered in the pipeline with a name
* A tapin must return `true`/`false`.  If `false` or nothing is returned, then pipeline will abort.
* A tapin may receive extra input parameters. Example: RenderPipe has `ctx` and `region` that are used for render pass context.

## TriTapin
* A tritapin is a function that takes input, state, output as parameters
* A tritapin will receive the following 3 input parameters.
    * `input`
        * Pipeline input
        * Read-only (should not be mutated)
        * Because immutable, input coming from another pipeline don't need to be copied 
    * `state`
        * Pipeline state parameters
        * Can be mutated by a tapin that is used in a latter tapin
        * Can also be used to reduce memory allocation/deallocation
    * `output`
        * Pipeline output
        * Write-only
        * For layout pipes, the `Updater` expects a certain set of outputs to be set upon pipeline completion
        * Can also be used to report layout errors

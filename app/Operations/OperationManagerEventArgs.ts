import IOperation = require("./IOperation");

class OperationEventArgs extends EventArgs {
    Operation: IOperation;

    constructor (operation?: IOperation) {
        super();
        if (operation) {
            Object.defineProperty(this, 'Operation', { value: operation, writable: false });
        }
    }
}

export = OperationEventArgs;
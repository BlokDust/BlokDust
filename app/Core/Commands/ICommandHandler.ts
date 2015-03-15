
interface ICommandHandler {
    Execute(parameters?: any): Promise<any>;
}

export = ICommandHandler;
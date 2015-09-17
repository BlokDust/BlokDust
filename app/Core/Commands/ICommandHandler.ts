export interface ICommandHandler {
    Execute(parameters?: any): Promise<any>;
}
import IModifiable = require("IModifiable");

interface IEffect {

    Modifiable: IModifiable;

    Connect(modifiable: IModifiable): void;
    Disconnect(modifiable: IModifiable): void;
    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IEffect;

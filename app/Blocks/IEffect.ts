import IModifiable = require("IModifiable");

interface IEffect {

    Modifiable: IModifiable;

    Connect(modifiable: IModifiable): void;
    Disconnect(): void;

}

export = IEffect;

import IModifiable = require("IModifiable");

interface IEffect {

    Modifiable: IModifiable;

    Connect(modifiable: IModifiable): void;
    Disconnect(modifiable: IModifiable): void;
    Delete(): void;

}

export = IEffect;

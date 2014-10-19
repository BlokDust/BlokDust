import IResource = require("./IResource");

interface IFactoryResource<T> extends IResource<T>
{
    GetInstance(): T;
    GetType(): T;
}

export = IFactoryResource;
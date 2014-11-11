import IFactoryResource = require("./IFactoryResource");

class FactoryResource<T> implements IFactoryResource<T> {

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
    private _Type: T;
    private _PropertyDescriptor: PropertyDescriptorMap;

    constructor(type: T, propertyDescriptor: PropertyDescriptorMap) {
        this._Type = type;
        this._PropertyDescriptor = propertyDescriptor;
    }

    GetInstance(): T  {
        return Object.create(this._Type, this._PropertyDescriptor);
    }

    GetType(): T {
        return this._Type;
    }
}

export = FactoryResource;
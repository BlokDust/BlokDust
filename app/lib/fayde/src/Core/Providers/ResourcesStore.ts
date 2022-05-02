/// <reference path="PropertyStore.ts" />

module Fayde.Providers {
    export class ResourcesStore extends PropertyStore {
        static Instance: ResourcesStore;

        GetValue (storage: IPropertyStorage): ResourceDictionary {
            if (storage.Local !== undefined)
                return storage.Local;
            var rd = storage.Local = new ResourceDictionary();
            rd.AttachTo(storage.OwnerNode.XObject);
            return rd;
        }

        GetValuePrecedence (storage: IPropertyStorage): PropertyPrecedence {
            return PropertyPrecedence.LocalValue;
        }

        SetLocalValue (storage: Providers.IPropertyStorage, newValue: number) {
            console.warn("Cannot set Resources.");
        }

        SetLocalStyleValue (storage: IPropertyStorage, newValue: any) {
        }

        SetImplicitStyle (storage: IPropertyStorage, newValue: any) {
        }

        ClearValue (storage: Providers.IPropertyStorage, notifyListeners?: boolean) {
        }
    }
    ResourcesStore.Instance = new ResourcesStore();
}
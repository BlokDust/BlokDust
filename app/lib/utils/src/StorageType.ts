module Utils {
    export class StorageType {
        static memory = new StorageType("memory");
        static session = new StorageType("session");
        static local = new StorageType("local");

        constructor(public value:string) {
        }

        toString() {
            return this.value;
        }
    }
}
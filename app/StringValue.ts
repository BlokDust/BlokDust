export class StringValue {
    public value: string = "";

    constructor(value?: string) {
        if (value){
            this.value = value.toLowerCase();
        }
    }

    toString() {
        return this.value;
    }
}
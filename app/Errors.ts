import {StringValue} from "./StringValue";

class Error extends StringValue {

}

export class Errors {
    public static LOAD_FAILED = new Error("loadFailed");
    public static SAVE_FAILED = new Error("saveFailed");
    public static SAVE_AS_FAILED = new Error("saveAsFailed");
}
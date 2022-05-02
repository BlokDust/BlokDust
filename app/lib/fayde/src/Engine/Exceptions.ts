class Exception {
    Message: string;
    constructor(message: string) {
        this.Message = message;
    }
    toString(): string {
        var typeName = (<any>this).constructor.name;
        if (typeName)
            return typeName + ": " + this.Message;
        return this.Message;
    }
}

class ArgumentException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class ArgumentNullException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class InvalidOperationException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class XamlParseException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class XamlMarkupParseException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class NotSupportedException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

class IndexOutOfRangeException extends Exception {
    constructor(index: number) {
        super(index.toString());
    }
}

class ArgumentOutOfRangeException extends Exception {
    constructor(msg: string) {
        super(msg);
    }
}

class AttachException extends Exception {
    Data: any;
    constructor(message: string, data: any) {
        super(message);
        this.Data = data;
    }
}

class InvalidJsonException extends Exception {
    JsonText: string;
    InnerException: Error;
    constructor(jsonText: string, innerException: Error) {
        super("Invalid json.");
        this.JsonText = jsonText;
        this.InnerException = innerException;
    }
}

class TargetInvocationException extends Exception {
    InnerException: Exception;
    constructor(message: string, innerException: Exception) {
        super(message);
        this.InnerException = innerException;
    }
}

class UnknownTypeException extends Exception {
    FullTypeName: string;
    constructor(fullTypeName: string) {
        super(fullTypeName);
        this.FullTypeName = fullTypeName;
    }
}

class FormatException extends Exception {
    constructor(message: string) {
        super(message);
    }
}
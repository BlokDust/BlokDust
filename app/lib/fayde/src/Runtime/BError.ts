class BError {
    static Argument: number = 2;
    static InvalidOperation: number = 3;
    static XamlParse: number = 5;
    static Attach: number = 6;
    Message: string;
    Number: number;
    Data: any;
    ThrowException() {
        var ex: Exception;
        switch (this.Number) {
            case BError.Attach:
                ex = new AttachException(this.Message, this.Data);
                break;
            case BError.Argument:
                ex = new ArgumentException(this.Message);
                break;
            case BError.InvalidOperation:
                ex = new InvalidOperationException(this.Message);
                break;
            case BError.XamlParse:
                ex = new XamlParseException(this.Message);
                break;
            default:
                ex = new Exception(this.Message);
                break;
        }
        throw ex;
    }
}
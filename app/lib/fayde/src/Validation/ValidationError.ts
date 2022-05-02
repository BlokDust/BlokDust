module Fayde.Validation {
    export class ValidationError {
        ErrorContent: any;
        Exception: Exception;
        PropertyName: string;

        constructor (content: any, exception: Exception, propertyName: string);
        constructor (content: any, exception: Error, propertyName: string);
        constructor (content: any, exception: any, propertyName: string) {
            this.ErrorContent = content;
            this.Exception = exception;
            this.PropertyName = propertyName;
            if (this.Exception instanceof Exception)
                this.ErrorContent = this.ErrorContent || (<Exception>exception).Message;
            if (this.Exception instanceof Error)
                this.ErrorContent = this.ErrorContent || (<Error>exception).message;
            Object.freeze(this);
        }
    }
}
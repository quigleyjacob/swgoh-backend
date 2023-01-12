export class MyError extends Error {
    constructor(status, message, cause) {
        super(message, {cause: cause})
        this.status = status
    }
}
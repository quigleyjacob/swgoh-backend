export class MyError extends Error {
    constructor(status, message, cause = null) {
        super(message)
        this.status = status
        this.cause = cause
    }
}
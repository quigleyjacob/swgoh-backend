export class MyError extends Error {
    constructor(status, message, cause = null) {
        super(message, {cause: cause})
        this.status = status
    }
}
export class MyError extends Error {
    constructor(status, message, cause = null) {
        super(message)
        this.status = status
        this.cause = cause
    }
}

export function handleDBError(err, obj, action) {
    if(err.code === 11000) {
        return new MyError(500, `${obj} already exists in the database.`, err)
    } else {
        return new MyError(500, `There was an error in the database: [action=${action},obj=${obj}]`, err)
    }
}
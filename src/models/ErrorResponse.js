// generic error class
class ErrorResponse {
    constructor(code, message) {
        this.code = code;
        this.message = message;
    }
}

module.exports  = ErrorResponse
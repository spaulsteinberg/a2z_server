class UserHistoryResponse {
    constructor(open, inProgress, completed, rejected, cancelled) {
        this.open = open;
        this.inProgress = inProgress;
        this.completed = completed;
        this.rejected = rejected;
        this.cancelled = cancelled;
    }
}

module.exports = UserHistoryResponse
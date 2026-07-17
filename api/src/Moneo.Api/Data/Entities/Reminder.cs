namespace Moneo.Api.Data.Entities
{
    public class Reminder : SyncableEntity
    {
        public string Note { get; set; } = null!;

        public Priority Priority { get; set; }

        public Guid CategoryId { get; set; }

        public DateTimeOffset RemindAt { get; set; }

        public ReminderStatus Status { get; set; }

        public Guid TodoId { get; set; }

        public DateTimeOffset? FiredAt { get; set; }

        public DateTimeOffset? CompletedAt { get; set; }

        public CompletionSource? CompletionSource { get; set; }

        public string? PresetUsed { get; set; }

        public int SnoozeCount { get; set; }

        public DateTimeOffset? OriginalRemindAt { get; set; }
    }

    public enum ReminderStatus
    {
        Pending   = 0,
        Fired     = 1,
        Completed = 2,
        Cancelled = 3,
    }

    public enum CompletionSource
    {
        InApp = 0,
        NotificationAction = 1,
        LinkedTodo = 2,
        LinkedTodoDeleted = 3,
        UserCancelledReminder = 4
    }
}

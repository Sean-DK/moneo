namespace Moneo.Api.Data.Entities
{
    public class Todo : SyncableEntity
    {
        public string Note { get; set; } = null!;

        public Priority Priority { get; set; }

        public Guid CategoryId { get; set; }

        public bool IsCompleted { get; set; }

        public DateTimeOffset? CompletedAt { get; set; }

        public Guid? SourceReminderId { get; set; }

        public CompletionSource? CompletionSource { get; set; }
    }
}

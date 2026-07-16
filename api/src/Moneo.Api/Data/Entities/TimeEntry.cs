namespace Moneo.Api.Data.Entities
{
    public class TimeEntry : SyncableEntity
    {
        public string Name { get; set; } = null!;

        public Guid CategoryId { get; set; }

        public DateTimeOffset StartedAt { get; set; }

        public DateTimeOffset? EndedAt { get; set; }

        public TimeEntrySource Source { get; set; }

        public int EditCount { get; set; }

        public TimerStopSource? StoppedBy { get; set; }
    }

    public enum TimeEntrySource
    {
        Timer  = 0,
        Manual = 1,
    }

    public enum TimerStopSource
    {
        Auto   = 0,
        User   = 1,
    }
}

namespace Moneo.Api.Data.Entities
{
    /// <summary>
    /// One daily check-in per user, keyed on MoodDate. All answer columns are
    /// NULLABLE: null = "not yet answered" (progressive save), distinct from the
    /// 0=DontKnow enum values which are real answers.
    /// </summary>
    public class MoodEntry : SyncableEntity
    {
        /// <summary>Logical day the check-in is about (wake-time boundary). Unique per user.</summary>
        public DateOnly MoodDate { get; set; }

        // --- Mood ---
        public DayRating? DayRating { get; set; }
        public Productivity? Productivity { get; set; }

        // --- Activity ---
        public Weather? Weather { get; set; }
        public Activities? Activities { get; set; }        // bitmask; null = unanswered
        public bool? ActivitiesChaotic { get; set; }        // override; when true, Activities = None
        public Location? Location { get; set; }
        public FreeTime? FreeTime { get; set; }
        public Social? Social { get; set; }

        // --- Physical ---
        public Sleep? Sleep { get; set; }
        public AteWell? AteWell { get; set; }
        public Exercise? Exercise { get; set; }
        public Sickness? Sickness { get; set; }

        // --- Emotional ---
        public StressEvent? StressEvent { get; set; }
        public GoodEvent? GoodEvent { get; set; }
        public Outlook? Outlook { get; set; }
        public bool? Laughed { get; set; }
        public bool? RepeatDay { get; set; }
        public bool RepeatDayAutoSkipped { get; set; }      // not nullable: defaults false
    }
}

namespace Moneo.Api.Data.Entities
{
    public class UserSettings : SyncableEntity
    {
        public int FirstThingTime { get; set; } = 5 * 60; // 5:00 / 5AM

        public int MorningTime { get; set; } = 9 * 60;    // 9:00 / 9AM

        public int MiddayTime { get; set; } = 12 * 60;    // 12:00 / 12PM

        public int AfternoonTime { get; set; } = 15 * 60; // 15:00 / 3PM

        public int EveningTime { get; set; } = 18 * 60;   // 18:00 / 6PM

        public int BeforeBedTime { get; set; } = 21 * 60; // 21:00 / 9PM

        public TrackerStrictness TrackerStrictness { get; set; } = TrackerStrictness.Lenient;
    }

    public enum TrackerStrictness
    {
        LeaveMeAlone = 0,
        Lenient      = 1,
        Firm         = 2,
        Strict       = 3,
        Draconian    = 4,
    }
}

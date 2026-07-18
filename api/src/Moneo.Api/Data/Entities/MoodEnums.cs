namespace Moneo.Api.Data.Entities
{
    public enum DayRating { Awful = 1, Challenging = 2, Okay = 3, Good = 4, Fantastic = 5 }
    public enum Productivity { NotAtAll = 1, NotVery = 2, Somewhat = 3, Fairly = 4, CrushedIt = 5 }
    public enum Weather { DontKnow = 0, Sunny = 1, Cloudy = 2, Rainy = 3, Snowy = 4 }        // category
    public enum Location { Inside = 1, Outside = 2, Both = 3 }                                // category
    public enum FreeTime { DontKnow = 0, None = 1, NotEnough = 2, Enough = 3, MoreThanEnough = 4 }
    public enum Social { NotAtAll = 1, ALittle = 2, Somewhat = 3, Very = 4 }
    public enum Sleep { DontKnow = 0, Poorly = 1, Okay = 2, Great = 3 }
    public enum AteWell { DontKnow = 0, No = 1, NotReally = 2, IThinkSo = 3, Yes = 4 }
    public enum Exercise { No = 0, Tried = 1, Yes = 2 }
    public enum Sickness { No = 0, ALittleOff = 1, Yes = 2 }        // POLARITY: high = worse
    public enum StressEvent { No = 0, YesABit = 1, YesBadly = 2 }   // POLARITY: high = worse
    public enum GoodEvent { No = 0, ANiceMoment = 1, MadeMyDay = 2 }
    public enum Outlook { DreadingIt = 1, Worried = 2, Indifferent = 3, Excited = 4, CantWait = 5 }

    /// <summary>Q4 activity buckets — a [Flags] bitmask (multi-select).</summary>
    [Flags]
    public enum Activities
    {
        None = 0,
        Working = 1,
        ChoresErrands = 2,
        Hobbies = 4,
        Relaxing = 8,
        Socializing = 16,
    }
}

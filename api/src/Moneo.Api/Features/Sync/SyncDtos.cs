using Moneo.Api.Data.Entities;

namespace Moneo.Api.Features.Sync
{
    public interface ISyncDto
    {
        Guid Id { get; }

        DateTimeOffset CreatedAt { get; }

        DateTimeOffset ModifiedAt { get; }

        bool IsDeleted { get; }
    }

    public record CategoryDto(
        Guid Id, string Name, string? Color, int SortOrder, bool IsSystem,
        DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool IsDeleted) : ISyncDto;

    public record TodoDto(
        Guid Id, string Note, Priority Priority, Guid CategoryId,
        bool IsCompleted, DateTimeOffset? CompletedAt,
        Guid? SourceReminderId, CompletionSource? CompletionSource,
        DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool IsDeleted) : ISyncDto;

    public record ReminderDto(
        Guid Id, string Note, Priority Priority, Guid CategoryId,
        DateTimeOffset RemindAt, ReminderStatus Status, Guid TodoId,
        DateTimeOffset? FiredAt, DateTimeOffset? CompletedAt,
        CompletionSource? CompletionSource, string? PresetUsed,
        int SnoozeCount, DateTimeOffset? OriginalRemindAt,
        DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool IsDeleted) : ISyncDto;

    public record TimeEntryDto(
        Guid Id, string Name, Guid CategoryId,
        DateTimeOffset StartedAt, DateTimeOffset? EndedAt,
        TimeEntrySource Source, int EditCount, TimerStopSource? StoppedBy,
        DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool IsDeleted) : ISyncDto;

    public record UserSettingsDto(
        Guid Id,
        int FirstThingTime, int MorningTime, int MiddayTime,
        int AfternoonTime, int EveningTime, int BeforeBedTime,
        TrackerStrictness TrackerStrictness,
        DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool IsDeleted) : ISyncDto;
}

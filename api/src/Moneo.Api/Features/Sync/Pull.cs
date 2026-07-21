using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Moneo.Api.Common;
using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Features.Sync
{
    public class Pull : IEndpoint
    {
        public record Response(
            CategoryDto[] Categories,
            TodoDto[] Todos,
            ReminderDto[] Reminders,
            TimeEntryDto[] TimeEntries,
            UserSettingsDto[] Settings,
            MoodEntryDto[] MoodEntries,
            string Cursor);

        public static void Map(IEndpointRouteBuilder app) =>
            app.MapGet("/sync/pull", Handle)
                .RequireAuthorization();

        internal static async Task<Results<Ok<Response>, BadRequest<string>>> Handle(string? since, AppDbContext db, CurrentUser user, CancellationToken ct)
        {
            ulong cursor = 0;

            if (since != null && !ulong.TryParse(since, out cursor))
                return TypedResults.BadRequest("'since' must be an unsigned integer cursor.");

            var categories = await Changed<Category>(db, user, cursor).ToArrayAsync(ct);

            var todos = await Changed<Todo>(db, user, cursor).ToArrayAsync(ct);

            var reminders = await Changed<Reminder>(db, user, cursor).ToArrayAsync(ct);

            var timeEntries = await Changed<TimeEntry>(db, user, cursor).ToArrayAsync(ct);

            var settings = await Changed<UserSettings>(db, user, cursor).ToArrayAsync(ct);

            var moodEntries = await Changed<MoodEntry>(db, user, cursor).ToArrayAsync(ct);

            var newCursor = new[]
            {
                cursor, MaxRowVersion(categories),
                MaxRowVersion(todos), MaxRowVersion(reminders),
                MaxRowVersion(timeEntries), MaxRowVersion(settings), MaxRowVersion(moodEntries)
            }.Max();

            return TypedResults.Ok(new Response(
                [.. categories.Select(ToDto)],
                [.. todos.Select(ToDto)],
                [.. reminders.Select(ToDto)],
                [.. timeEntries.Select(ToDto)],
                [.. settings.Select(ToDto)],
                [.. moodEntries.Select(ToDto)],
                newCursor.ToString()));
        }

        private static IQueryable<T> Changed<T>(AppDbContext db, CurrentUser user, ulong cursor)
            where T : SyncableEntity =>
            db.Set<T>()
                .IgnoreQueryFilters()
                .Where(e => e.UserId == user.Id && e.RowVersion > cursor)
                .AsNoTracking();

        private static ulong MaxRowVersion<T>(T[] rows) where T : SyncableEntity =>
            rows.Length == 0 ? 0 : rows.Max(r => r.RowVersion);

        private static CategoryDto ToDto(Category e) =>
            new(e.Id, e.Name, e.Color, e.SortOrder, e.IsSystem, e.CreatedAt, e.ModifiedAt, e.IsDeleted);

        private static TodoDto ToDto(Todo e) =>
            new(e.Id, e.Note, e.Priority, e.CategoryId, e.IsCompleted, e.CompletedAt, e.SourceReminderId, e.CompletionSource, e.CreatedAt, e.ModifiedAt, e.IsDeleted);

        private static ReminderDto ToDto(Reminder e) =>
            new(e.Id, e.Note, e.Priority, e.CategoryId, e.RemindAt, e.Status,
                e.TodoId, e.FiredAt, e.CompletedAt, e.CompletionSource, e.PresetUsed,
                e.SnoozeCount, e.OriginalRemindAt, e.CreatedAt, e.ModifiedAt, e.IsDeleted);

        private static TimeEntryDto ToDto(TimeEntry e) =>
            new(e.Id, e.Name, e.CategoryId, e.StartedAt, e.EndedAt, e.Source, e.EditCount, e.StoppedBy, e.CreatedAt, e.ModifiedAt, e.IsDeleted);

        private static UserSettingsDto ToDto(UserSettings e) =>
            new(e.Id, e.FirstThingTime, e.MorningTime, e.MiddayTime, e.AfternoonTime, e.EveningTime, e.BeforeBedTime, e.TrackerStrictness, e.CreatedAt, e.ModifiedAt, e.IsDeleted);

        private static MoodEntryDto ToDto(MoodEntry e) =>
            new(e.Id, e.MoodDate,
                e.DayRating, e.Productivity, e.Weather, e.Activities, e.ActivitiesChaotic,
                e.Location, e.FreeTime, e.Social, e.Sleep, e.AteWell, e.Exercise, e.Sickness,
                e.StressEvent, e.GoodEvent, e.Outlook, e.Laughed, e.RepeatDay, e.RepeatDayAutoSkipped,
                e.CreatedAt, e.ModifiedAt, e.IsDeleted);
    }
}

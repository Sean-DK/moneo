using Moneo.Api.Data.Entities;
using Moneo.Api.Features.Sync;

namespace Moneo.Api.Tests.Infrastructure
{
    public static class Dtos
    {
        public static readonly DateTimeOffset T0 = new(2026, 7, 1, 12, 0, 0, TimeSpan.Zero);

        public static readonly CategoryDto DefaultCategory =
            Category(new Guid("cccccccc-0000-0000-0000-000000000001"), name: "General");

        public static CategoryDto Category(
            Guid? id = null, string name = "Work",
            DateTimeOffset? modifiedAt = null, bool isDeleted = false, bool isSystem = false) =>
            new(id ?? Guid.CreateVersion7(), name, "#3B82F6", 0, isSystem, T0, modifiedAt ?? T0, isDeleted);

        public static TodoDto Todo(
            Guid? id = null, string note = "Dry cleaning", Guid? categoryId = null,
            DateTimeOffset? modifiedAt = null, bool isDeleted = false) =>
            new(id ?? Guid.CreateVersion7(), note, Priority.Medium,
                categoryId ?? DefaultCategory.Id,
                false, null, null, null, T0, modifiedAt ?? T0, isDeleted);

        public static ReminderDto Reminder(
            Guid? id = null, string note = "Mow lawn", Guid? categoryId = null, Guid? todoId = null,
            DateTimeOffset? modifiedAt = null, bool isDeleted = false) =>
            new(id ?? Guid.CreateVersion7(), note, Priority.High,
                categoryId ?? DefaultCategory.Id,
                T0.AddHours(6), ReminderStatus.Pending,
                todoId ?? Guid.CreateVersion7(),
                null, null, null, "today.evening", 0, null, T0, modifiedAt ?? T0, isDeleted);

        public static UserSettingsDto Settings(Guid? id = null, DateTimeOffset? modifiedAt = null) =>
            new(id ?? Guid.CreateVersion7(), 300, 540, 720, 900, 1080, 1320,
                TrackerStrictness.Lenient, T0, modifiedAt ?? T0, false);
    }
}
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Data
{
    public static class CategoryDefaults
    {
        public static List<Category> CreateFor(Guid userId, DateTimeOffset now) =>
            Names.Select((name, i) => new Category
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                Name = name,
                Color = Colors[i],
                SortOrder = i,
                IsSystem = name == "General",
                CreatedAt = now,
                ModifiedAt = now,
            }).ToList();

        private static readonly string[] Names = ["General", "Free Time", "Work", "Chores", "Errands", "Health"];

        private static readonly string[] Colors = ["#6B7280", "#8B5CF6", "#3B82F6", "#F59E0B", "#EF4444", "#10B981"];
    }
}

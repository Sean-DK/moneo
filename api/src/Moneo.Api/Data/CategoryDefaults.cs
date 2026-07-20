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

        private static readonly string[] Names = ["General", "Leisure", "Work", "Chores", "Errands", "Health"];

        private static readonly string[] Colors = ["#2CBFC9", "#B06CE0", "#4F8DF2", "#E9A63E", "#E8614C", "#40C57C"];
    }
}

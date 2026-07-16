namespace Moneo.Api.Data.Entities
{
    public class Category : SyncableEntity
    {
        public string Name { get; set; } = null!;

        public string? Color { get; set; }

        public int SortOrder { get; set; }

        public bool IsSystem { get; set; }
    }
}

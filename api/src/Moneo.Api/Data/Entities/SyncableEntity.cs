namespace Moneo.Api.Data.Entities
{
    public class SyncableEntity
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        public DateTimeOffset CreatedAt { get; set; }

        public DateTimeOffset ModifiedAt { get; set; }

        public bool IsDeleted { get; set; }

        public ulong RowVersion { get; set; }
    }
}

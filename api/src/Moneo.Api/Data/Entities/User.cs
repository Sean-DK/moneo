namespace Moneo.Api.Data.Entities
{
    public class User
    {
        public Guid Id { get; set; }

        public string? GoogleSubject { get; set; }

        public string Email { get; set; } = null!;

        public string DisplayName { get; set; } = null!;

        public DateTimeOffset CreatedAt { get; set; }

        public DateTimeOffset LastSeenAt { get; set; }
    }
}

using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Common
{
    public class UserProvisioning
    {
        public static Task ProvisionAsync(AppDbContext db, Guid userId, CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;

            db.Categories.AddRange(CategoryDefaults.CreateFor(userId, now));

            db.UserSettings.Add(new UserSettings
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                CreatedAt = now,
                ModifiedAt = now,
            });

            return Task.CompletedTask;
        }
    }
}

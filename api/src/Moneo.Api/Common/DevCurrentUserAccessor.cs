using Moneo.Api.Data;

namespace Moneo.Api.Common
{
    public class DevCurrentUserAccessor(AppDbContext db) : ICurrentUserAccessor
    {
        private static readonly Guid DevUserId = new("00000000-0000-0000-0000-000000000001");

        public async Task<CurrentUser> GetAsync(CancellationToken ct)
        {
            var user = await db.Users.FindAsync([DevUserId], ct);

            if (user == null)
            {
                user = new Data.Entities.User
                {
                    Id = DevUserId,
                    Email = "dev@local",
                    DisplayName = "Dev User",
                    CreatedAt = DateTimeOffset.UtcNow,
                    LastSeenAt = DateTimeOffset.UtcNow,
                };

                db.Users.Add(user);

                await UserProvisioning.ProvisionAsync(db, DevUserId, ct);

                await db.SaveChangesAsync(ct);
            }

            return new CurrentUser(user.Id, user.Email, user.DisplayName);
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Tests.Infrastructure
{
    public sealed class RowVersionShim : SaveChangesInterceptor
    {
        private long _counter;

        public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
        {
            Stamp(eventData.Context);

            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
        {
            Stamp(eventData.Context);

            return base.SavingChangesAsync(eventData, result, ct);
        }

        private void Stamp(DbContext? context)
        {
            if (context == null)
                return;

            foreach (var entry in context.ChangeTracker.Entries<SyncableEntity>())
            {
                if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
                    entry.Entity.RowVersion = (ulong)Interlocked.Increment(ref _counter);
            }
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Tests.Infrastructure
{
    public class TestDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (!entityType.ClrType.IsAssignableTo(typeof(SyncableEntity)))
                    continue;

                var prop = modelBuilder.Entity(entityType.ClrType)
                    .Property(nameof(SyncableEntity.RowVersion));

                prop.Metadata.SetValueConverter((ValueConverter?)null);

                prop.ValueGeneratedNever();

                prop.IsConcurrencyToken(false);

                prop.Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Save);

                prop.Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Save);
            }
        }
    }
}

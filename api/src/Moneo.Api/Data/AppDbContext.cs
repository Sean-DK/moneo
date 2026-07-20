using Microsoft.EntityFrameworkCore;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<Category> Categories => Set<Category>();

        public DbSet<MoodEntry> MoodEntries => Set<MoodEntry>();

        public DbSet<Reminder> Reminders => Set<Reminder>();

        public DbSet<Todo> Todos => Set<Todo>();

        public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();

        public DbSet<UserSettings> UserSettings => Set<UserSettings>();

        public DbSet<User> Users => Set<User>();

        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // --- SyncableEntity ---
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (!entityType.ClrType.IsAssignableTo(typeof(SyncableEntity)))
                    continue;

                var builder = modelBuilder.Entity(entityType.ClrType);

                builder.Property(nameof(SyncableEntity.Id)).ValueGeneratedNever();

                builder.Property(nameof(SyncableEntity.RowVersion))
                    .IsRowVersion()
                    .HasConversion<byte[]>();

                builder.HasIndex(nameof(SyncableEntity.UserId), nameof(SyncableEntity.RowVersion));
            }

            // --- Soft-delete query filters ---
            modelBuilder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);

            modelBuilder.Entity<Reminder>().HasQueryFilter(e => !e.IsDeleted);

            modelBuilder.Entity<Todo>().HasQueryFilter(e => !e.IsDeleted);

            modelBuilder.Entity<TimeEntry>().HasQueryFilter(e => !e.IsDeleted);

            modelBuilder.Entity<UserSettings>().HasQueryFilter(e => !e.IsDeleted);

            // --- Category ---
            modelBuilder.Entity<Category>(e =>
            {
                e.Property(c => c.Name).HasMaxLength(20);

                e.Property(c => c.Color).HasMaxLength(9); // #RRGGBBAA
            });

            // --- Reminder ---
            modelBuilder.Entity<Reminder>(e =>
            {
                e.Property(r => r.Note).HasMaxLength(50);

                e.Property(r => r.PresetUsed).HasMaxLength(50);

                e.HasOne<Category>()
                    .WithMany()
                    .HasForeignKey(r => r.CategoryId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne<Todo>()
                    .WithMany()
                    .HasForeignKey(r => r.TodoId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasIndex(r => new { r.UserId, r.Status, r.RemindAt });
            });

            // --- Todo ---
            modelBuilder.Entity<Todo>(e =>
            {
                e.Property(t => t.Note).HasMaxLength(50);

                e.HasOne<Category>()
                    .WithMany()
                    .HasForeignKey(t => t.CategoryId)
                    .OnDelete(DeleteBehavior.NoAction);

                // SourceReminderId is for provenance only and is not a FK

                e.HasIndex(t => new { t.UserId, t.IsCompleted });
            });

            // --- TimeEntry ---
            modelBuilder.Entity<TimeEntry>(e =>
            {
                e.Property(t => t.Name).HasMaxLength(50);

                e.HasOne<Category>()
                    .WithMany()
                    .HasForeignKey(t => t.CategoryId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasIndex(t => new { t.UserId, t.StartedAt });
            });

            // --- UserSettings ---
            modelBuilder.Entity<UserSettings>(e =>
            {
                e.HasIndex(s => s.UserId).IsUnique();
            });

            // --- User ---
            modelBuilder.Entity<User>(e =>
            {
                e.Property(u => u.Email).HasMaxLength(256);

                e.Property(u => u.DisplayName).HasMaxLength(100);

                e.Property(u => u.GoogleSubject).HasMaxLength(64);

                e.HasIndex(u => u.GoogleSubject).IsUnique();
            });

            // --- MoodEntry ---
            modelBuilder.Entity<MoodEntry>(e =>
            {
                // One entry per user per day. Filtered unique index so soft-deleted rows
                // don't block re-creating an entry for the same date.
                e.HasIndex(m => new { m.UserId, m.MoodDate })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0");
            });

            // --- RefreshToken ---
            modelBuilder.Entity<RefreshToken>(e =>
            {
                e.Property(t => t.TokenHash).HasMaxLength(64);

                e.HasIndex(t => t.TokenHash).IsUnique();

                e.HasIndex(t => t.UserId);
            });
        }
    }
}

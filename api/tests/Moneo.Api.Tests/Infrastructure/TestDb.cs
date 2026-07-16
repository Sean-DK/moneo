using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moneo.Api.Data;

namespace Moneo.Api.Tests.Infrastructure
{
    public sealed class TestDb : IDisposable
    {
        private readonly SqliteConnection _connection;

        private readonly DbContextOptions<AppDbContext> _options;

        public TestDb()
        {
            _connection = new SqliteConnection("DataSource=:memory:");

            _connection.Open();

            _options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .AddInterceptors(new RowVersionShim())
                .Options;

            using var context = CreateContext();

            context.Database.EnsureCreated();
        }

        public TestDbContext CreateContext() => new(_options);

        public void Dispose() => _connection.Dispose();
    }
}

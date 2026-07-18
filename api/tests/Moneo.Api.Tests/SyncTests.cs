using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Moneo.Api.Common;
using Moneo.Api.Data.Entities;
using Moneo.Api.Features.Sync;
using Moneo.Api.Tests.Infrastructure;

namespace Moneo.Api.Tests;

public class SyncTests
{
    private static readonly CurrentUser Alice = new(new Guid("aaaaaaaa-0000-0000-0000-000000000001"), "alice@test", "Alice");

    private static readonly CurrentUser Bob = new(new Guid("bbbbbbbb-0000-0000-0000-000000000002"), "bob@test", "Bob");

    private static readonly CancellationToken Ct = CancellationToken.None;

    private static Push.Request Batch(CategoryDto[]? categories = null, TodoDto[]? todos = null, ReminderDto[]? reminders = null,
        TimeEntryDto[]? timeEntries = null, UserSettingsDto[]? settings = null, MoodEntryDto[]? moodEntries = null) =>
        new(categories, todos, reminders, timeEntries, settings, moodEntries);

    private static TResponse AssertOk<TResponse>(INestedHttpResult result) =>
        Assert.IsType<Ok<TResponse>>(result.Result).Value!;

    [Fact]
    public async Task Push_inserts_new_row_and_stamps_server_owned_fields()
    {
        using var db = new TestDb();

        var dtos = Dtos.Category(name: "Chores");

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Push.Response>(await Push.Handle(Batch(categories: [dtos]), context, Alice, Ct));

            Assert.Equal("applied", response.Results[dtos.Id].Status);
        }

        await using (var context = db.CreateContext())
        {
            var saved = await context.Categories.SingleAsync(Ct);

            Assert.Equal(Alice.Id, saved.UserId);

            Assert.Equal("Chores", saved.Name);

            Assert.Equal(Dtos.T0, saved.CreatedAt);

            Assert.True(saved.RowVersion > 0);
        }
    }

    [Fact]
    public async Task Push_newer_ModifedAt_wins()
    {
        using var db = new TestDb();

        var id = Guid.CreateVersion7();

        await using (var context = db.CreateContext())
        {
            AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "Old")]), context, Alice, Ct));
        }

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "New", modifiedAt: Dtos.T0.AddMinutes(5))]), context, Alice, Ct));

            Assert.Equal("applied", response.Results[id].Status);
        }

        await using (var context = db.CreateContext())
        {
            Assert.Equal("New", (await context.Categories.SingleAsync(Ct)).Name);
        }
    }

    [Fact]
    public async Task Push_stale_ModifiedAt_is_skipped_not_errored()
    {
        using var db = new TestDb();

        var id = Guid.CreateVersion7();

        await using (var context = db.CreateContext())
        {
            AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "Current", modifiedAt: Dtos.T0.AddMinutes(10))]), context, Alice, Ct));
        }

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "Stale", modifiedAt: Dtos.T0)]), context, Alice, Ct));

            Assert.Equal("skippedStale", response.Results[id].Status);
        }

        await using (var context = db.CreateContext())
        {
            Assert.Equal("Current", (await context.Categories.SingleAsync(Ct)).Name);
        }
    }

    [Fact]
    public async Task Push_rejects_id_owned_by_another_user()
    {
        using var db = new TestDb();

        var id = Guid.CreateVersion7();

        await using (var context = db.CreateContext())
        {
            AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id)]), context, Bob, Ct));
        }

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "Hijack", modifiedAt: Dtos.T0.AddDays(1))]), context, Alice, Ct));

            Assert.Equal("rejected", response.Results[id].Status);
        }

        await using (var context = db.CreateContext())
        {
            var row = await context.Categories.SingleAsync(Ct);

            Assert.Equal(Bob.Id, row.UserId);

            Assert.NotEqual("Hijack", row.Name);
        }
    }

    [Fact]
    public async Task Push_rejects_invalid_item_but_applies_the_rest()
    {
        using var db = new TestDb();

        var bad = Dtos.Todo(note: new string('x', 51));

        var good = Dtos.Todo(note: "Valid");

        await using var context = db.CreateContext();

        await SeedDefaultCategoryAsync(context, Alice);

        var response = AssertOk<Push.Response>(await Push.Handle(Batch(todos: [bad, good]), context, Alice, Ct));

        Assert.Equal("rejected", response.Results[bad.Id].Status);

        Assert.NotNull(response.Results[bad.Id].Reason);

        Assert.Equal("applied", response.Results[good.Id].Status);

        Assert.Equal("Valid", (await context.Todos.SingleAsync(Ct)).Note);
    }

    [Fact]
    public async Task Push_same_batch_can_insert_category_and_reminder_referencing_it()
    {
        using var db = new TestDb();

        var category = Dtos.Category();

        var todo = Dtos.Todo(categoryId: category.Id);

        var reminder = Dtos.Reminder(categoryId: category.Id, todoId: todo.Id);

        await using var context = db.CreateContext();

        var response = AssertOk<Push.Response>(await Push.Handle(Batch(categories: [category], todos: [todo], reminders: [reminder]), context, Alice, Ct));

        Assert.Equal("applied", response.Results[category.Id].Status);

        Assert.Equal("applied", response.Results[reminder.Id].Status);
    }

    [Fact]
    public async Task Push_dangling_fk_fails_whole_batch_with_409()
    {
        using var db = new TestDb();

        var reminder = Dtos.Reminder(categoryId: Guid.CreateVersion7());

        await using var context = db.CreateContext();

        var result = await Push.Handle(Batch(reminders: [reminder]), context, Alice, Ct);

        var problem = Assert.IsType<ProblemHttpResult>(result.Result);

        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
    }

    [Fact]
    public void Push_validator_rejects_batches_over_500()
    {
        var items = Enumerable.Range(0, 501).Select(_ => Dtos.Todo()).ToArray();

        var result = new Push.Validator().Validate(Batch(todos: items));

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Pull_returns_only_current_users_rows()
    {
        using var db = new TestDb();

        await using (var context = db.CreateContext())
        {
            AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(name: "Mine")]), context, Alice, Ct));

            AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(name: "Theirs")]), context, Bob, Ct));
        }

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Pull.Response>(await Pull.Handle(null, context, Alice, Ct));

            var category = Assert.Single(response.Categories);

            Assert.Equal("Mine", category.Name);
        }
    }

    [Fact]
    public async Task Pull_includes_soft_deleted_rows()
    {
        using var db = new TestDb();

        var id = Guid.CreateVersion7();

        await using (var context = db.CreateContext())
        {
            await SeedDefaultCategoryAsync(context, Alice);

            AssertOk<Push.Response>(await Push.Handle(Batch(todos: [Dtos.Todo(id)]), context, Alice, Ct));

            AssertOk<Push.Response>(await Push.Handle(Batch(todos: [Dtos.Todo(id, modifiedAt: Dtos.T0.AddMinutes(1), isDeleted: true)]), context, Alice, Ct));
        }

        await using (var context = db.CreateContext())
        {
            var response = AssertOk<Pull.Response>(await Pull.Handle(null, context, Alice, Ct));

            var todo = Assert.Single(response.Todos);

            Assert.True(todo.IsDeleted);
        }
    }

    [Fact]
    public async Task Pull_cursor_advances_and_excludes_already_seen_rows()
    {
        using var db = new TestDb();

        await using var context = db.CreateContext();

        AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(name: "First")]), context, Alice, Ct));

        var first = AssertOk<Pull.Response>(await Pull.Handle(null, context, Alice, Ct));

        Assert.Single(first.Categories);

        var second = AssertOk<Pull.Response>(await Pull.Handle(first.Cursor, context, Alice, Ct));

        Assert.Empty(second.Categories);

        Assert.Equal(first.Cursor, second.Cursor);

        AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(name: "Second")]), context, Alice, Ct));

        var third = AssertOk<Pull.Response>(await Pull.Handle(first.Cursor, context, Alice, Ct));

        var category = Assert.Single(third.Categories);

        Assert.Equal("Second", category.Name);

        Assert.True(ulong.Parse(third.Cursor) > ulong.Parse(first.Cursor));
    }

    [Fact]
    public async Task Pull_update_to_old_row_reappears_in_next_pull()
    {
        using var db = new TestDb();

        var id = Guid.CreateVersion7();

        await using var context = db.CreateContext();

        AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "V1")]), context, Alice, Ct));

        var baseline = AssertOk<Pull.Response>(await Pull.Handle(null, context, Alice, Ct));

        AssertOk<Push.Response>(await Push.Handle(Batch(categories: [Dtos.Category(id, name: "V2", modifiedAt: Dtos.T0.AddMinutes(1))]), context, Alice, Ct));

        var next = AssertOk<Pull.Response>(await Pull.Handle(baseline.Cursor, context, Alice, Ct));

        var category = Assert.Single(next.Categories);

        Assert.Equal("V2", category.Name);
    }

    [Fact]
    public async Task Pull_rejects_malformed_cursor()
    {
        using var db = new TestDb();

        await using var context = db.CreateContext();

        var result = await Pull.Handle("not-a-number", context, Alice, Ct);

        Assert.IsType<BadRequest<string>>(result.Result);
    }

    [Fact]
    public async Task RowVersionShim_stamps_increasing_values_on_insert_and_update()
    {
        using var db = new TestDb();

        await using var context = db.CreateContext();

        var category = new Category
        {
            Id = Guid.CreateVersion7(),
            UserId = Guid.NewGuid(),
            Name = "Canary",
            CreatedAt = Dtos.T0,
            ModifiedAt = Dtos.T0
        };

        context.Categories.Add(category);

        await context.SaveChangesAsync(Ct);

        var afterInsert = category.RowVersion;

        Assert.True(afterInsert > 0);

        category.Name = "Canary2";

        await context.SaveChangesAsync(Ct);

        await using var fresh = db.CreateContext();

        var reloaded = await fresh.Categories.IgnoreQueryFilters().SingleAsync(c => c.Id == category.Id, Ct);

        Assert.True(reloaded.RowVersion > afterInsert);
    }

    private static async Task SeedDefaultCategoryAsync(TestDbContext ctx, CurrentUser user)
    {
        AssertOk<Push.Response>(await Push.Handle(
            Batch(categories: [Dtos.DefaultCategory]), ctx, user, Ct));
    }
}

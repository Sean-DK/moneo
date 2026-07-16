using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Moneo.Api.Common;
using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Features.Sync
{
    public class Push : IEndpoint
    {
        public record Request(
            CategoryDto[]? Categories,
            TodoDto[]? Todos,
            ReminderDto[]? Reminders,
            TimeEntryDto[]? TimeEntries,
            UserSettingsDto[]? Settings)
        {
            public int TotalCount =>
                (Categories?.Length ?? 0) + (Todos?.Length ?? 0) + (Reminders?.Length ?? 0) + (TimeEntries?.Length ?? 0) + (Settings?.Length ?? 0);
        }

        public record ItemResult(string Status, string? Reason = null)
        {
            public static readonly ItemResult Applied = new("applied");

            public static readonly ItemResult SkippedStale = new("skippedStale");
            
            public static ItemResult Rejected(string reason) => new("rejected", reason);
        }

        public record Response(Dictionary<Guid, ItemResult> Results);

        public class Validator : AbstractValidator<Request>
        {
            public Validator()
            {
                RuleFor(r => r.TotalCount)
                    .LessThanOrEqualTo(500)
                    .WithMessage("Push batches are limited to 500 items");
            }
        }

        public static void Map(IEndpointRouteBuilder app) =>
            app.MapPost("/sync/push", Handle)
                .WithRequestValidation<Request>();

        internal static async Task<Results<Ok<Response>, ProblemHttpResult>> Handle(Request request, AppDbContext db, CurrentUser user, CancellationToken ct)
        {
            var results = new Dictionary<Guid, ItemResult>();

            await ApplyAsync(db, user, request.Categories, CategoryRules,
                static dto => new Category(),
                static (dto, e) => { 
                    e.Name = dto.Name; 
                    e.Color = dto.Color; 
                    e.SortOrder = dto.SortOrder;
                    e.IsSystem = dto.IsSystem;
                },
                results, ct);

            await ApplyAsync(db, user, request.Todos, TodoRules,
                static dto => new Todo(),
                static (dto, e) =>
                {
                    e.Note = dto.Note;
                    e.Priority = dto.Priority;
                    e.CategoryId = dto.CategoryId;
                    e.IsCompleted = dto.IsCompleted;
                    e.CompletedAt = dto.CompletedAt;
                    e.SourceReminderId = dto.SourceReminderId;
                    e.CompletionSource = dto.CompletionSource;
                },
                results, ct);

            await ApplyAsync(db, user, request.Reminders, ReminderRules,
                static dto => new Reminder(),
                static (dto, e) =>
                {
                    e.Note = dto.Note;
                    e.Priority = dto.Priority;
                    e.CategoryId = dto.CategoryId;
                    e.RemindAt = dto.RemindAt;
                    e.Status = dto.Status;
                    e.TodoId = dto.TodoId;
                    e.FiredAt = dto.FiredAt;
                    e.CompletedAt = dto.CompletedAt;
                    e.CompletionSource = dto.CompletionSource;
                    e.PresetUsed = dto.PresetUsed;
                    e.SnoozeCount = dto.SnoozeCount;
                    e.OriginalRemindAt = dto.OriginalRemindAt;
                },
                results, ct);

            await ApplyAsync(db, user, request.TimeEntries, TimeEntryRules,
                static dto => new TimeEntry(),
                static (dto, e) =>
                {
                    e.Name = dto.Name;
                    e.CategoryId = dto.CategoryId;
                    e.StartedAt = dto.StartedAt;
                    e.EndedAt = dto.EndedAt;
                    e.Source = dto.Source;
                    e.EditCount = dto.EditCount;
                    e.StoppedBy = dto.StoppedBy;
                },
                results, ct);

            await ApplyAsync(db, user, request.Settings, SettingsRules,
                static dto => new UserSettings(),
                static (dto, e) =>
                {
                    e.FirstThingTime = dto.FirstThingTime;
                    e.MorningTime = dto.MorningTime;
                    e.MiddayTime = dto.MiddayTime;
                    e.AfternoonTime = dto.AfternoonTime;
                    e.EveningTime = dto.EveningTime;
                    e.BeforeBedTime = dto.BeforeBedTime;
                    e.TrackerStrictness = dto.TrackerStrictness;
                },
                results, ct);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                return TypedResults.Problem(
                    $"Push batch failed integrity checks: {ex.InnerException?.Message ?? ex.Message}",
                    statusCode: StatusCodes.Status409Conflict);
            }

            return TypedResults.Ok(new Response(results));
        }

        private static async Task ApplyAsync<TEntity, TDto>(AppDbContext db, CurrentUser user, TDto[]? items, IValidator<TDto> validator,
            Func<TDto, TEntity> create, Action<TDto, TEntity> update, Dictionary<Guid, ItemResult> results, CancellationToken ct)
            where TEntity : SyncableEntity
            where TDto : ISyncDto
        {
            if (items == null || items.Length == 0)
                return;

            var ids = items.Select(i => i.Id).ToArray();

            var existing = await db.Set<TEntity>()
                .IgnoreQueryFilters()
                .Where(e => ids.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, ct);

            foreach (var dto in items)
            {
                var validation = await validator.ValidateAsync(dto, ct);

                if (!validation.IsValid)
                {
                    results[dto.Id] = ItemResult.Rejected(string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

                    continue;
                }

                if (existing.TryGetValue(dto.Id, out var entity))
                {
                    if (entity.UserId != user.Id)
                    {
                        results[dto.Id] = ItemResult.Rejected("ID belongs to another user.");

                        continue;
                    }

                    if (dto.ModifiedAt <= entity.ModifiedAt)
                    {
                        results[dto.Id] = ItemResult.SkippedStale;

                        continue;
                    }

                    update(dto, entity);

                    entity.ModifiedAt = dto.ModifiedAt;

                    entity.IsDeleted = dto.IsDeleted;
                }
                else
                {
                    var e = create(dto);

                    e.Id = dto.Id;

                    e.UserId = user.Id;

                    e.CreatedAt = dto.CreatedAt;

                    e.ModifiedAt = dto.ModifiedAt;

                    e.IsDeleted = dto.IsDeleted;

                    update(dto, e);

                    db.Add(e);
                }

                results[dto.Id] = ItemResult.Applied;
            }
        }

        private static readonly IValidator<CategoryDto> CategoryRules = new InlineValidator<CategoryDto>
        {
            v => v.RuleFor(x => x.Name).NotEmpty().MaximumLength(20),
            v => v.RuleFor(x => x.Color).MaximumLength(9),
        };

        private static readonly IValidator<TodoDto> TodoRules = new InlineValidator<TodoDto>
        {
            v => v.RuleFor(x => x.Note).NotEmpty().MaximumLength(50),
            v => v.RuleFor(x => x.CategoryId).NotEmpty(),
        };

        private static readonly IValidator<ReminderDto> ReminderRules = new InlineValidator<ReminderDto>
        {
            v => v.RuleFor(x => x.Note).NotEmpty().MaximumLength(50),
            v => v.RuleFor(x => x.PresetUsed).MaximumLength(50),
            v => v.RuleFor(x => x.SnoozeCount).GreaterThanOrEqualTo(0),
            v => v.RuleFor(x => x.CategoryId).NotEmpty(),
            v => v.RuleFor(x => x.TodoId).NotEmpty(),
        };

        private static readonly IValidator<TimeEntryDto> TimeEntryRules = new InlineValidator<TimeEntryDto>
        {
            v => v.RuleFor(x => x.Name).NotEmpty().MaximumLength(50),
            v => v.RuleFor(x => x.EndedAt).GreaterThan(x => x.StartedAt).When(x => x.EndedAt.HasValue),
            v => v.RuleFor(x => x.EditCount).GreaterThanOrEqualTo(0),
            v => v.RuleFor(x => x.CategoryId).NotEmpty(),
        };

        private static readonly IValidator<UserSettingsDto> SettingsRules = new InlineValidator<UserSettingsDto>
        {
            v => v.RuleFor(x => x.FirstThingTime).InclusiveBetween(0, 1439),
            v => v.RuleFor(x => x.MorningTime).InclusiveBetween(0, 1439),
            v => v.RuleFor(x => x.MiddayTime).InclusiveBetween(0, 1439),
            v => v.RuleFor(x => x.AfternoonTime).InclusiveBetween(0, 1439),
            v => v.RuleFor(x => x.EveningTime).InclusiveBetween(0, 1439),
            v => v.RuleFor(x => x.BeforeBedTime).InclusiveBetween(0, 1439),
        };
    }
}

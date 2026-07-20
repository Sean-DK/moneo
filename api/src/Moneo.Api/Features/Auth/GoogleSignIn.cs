using FluentValidation;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moneo.Api.Common;
using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Features.Auth
{
    public class GoogleSignIn : IEndpoint
    {
        public record Request(string IdToken);
        public record Response(string AccessToken, string RefreshToken, DateTimeOffset AccessExpiresAt, string Email, string DisplayName);

        public class Validator : AbstractValidator<Request>
        {
            public Validator() => RuleFor(r => r.IdToken).NotEmpty();
        }

        public static void Map(IEndpointRouteBuilder app) =>
            app.MapPost("/auth/google", Handle)
               .WithRequestValidation<Request>()
               .AllowAnonymous();

        internal static async Task<Results<Ok<Response>, UnauthorizedHttpResult>> Handle(
            Request req, AppDbContext db, TokenService tokens,
            IOptions<AuthOptions> options, CancellationToken ct)
        {
            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = [options.Value.GoogleClientId],
                    });
            }
            catch (InvalidJwtException)
            {
                return TypedResults.Unauthorized();
            }

            var now = DateTimeOffset.UtcNow;
            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleSubject == payload.Subject, ct);

            if (user is null)
            {
                user = new User
                {
                    Id = Guid.CreateVersion7(),
                    GoogleSubject = payload.Subject,
                    Email = payload.Email,
                    DisplayName = payload.Name ?? payload.Email,
                    CreatedAt = now,
                    LastSeenAt = now,
                };
                db.Users.Add(user);
                await UserProvisioning.ProvisionAsync(db, user.Id, ct);
                await db.SaveChangesAsync(ct);
            }
            else
            {
                user.LastSeenAt = now;
                user.Email = payload.Email;                      // keep in sync with Google
                user.DisplayName = payload.Name ?? payload.Email;
                await db.SaveChangesAsync(ct);
            }

            var pair = await tokens.IssueAsync(user, ct);
            return TypedResults.Ok(new Response(
                pair.AccessToken, pair.RefreshToken, pair.AccessExpiresAt, user.Email, user.DisplayName));
        }
    }
}
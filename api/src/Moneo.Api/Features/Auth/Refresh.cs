using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Moneo.Api.Common;

namespace Moneo.Api.Features.Auth
{
    public class Refresh : IEndpoint
    {
        public record Request(string RefreshToken);
        public record Response(string AccessToken, string RefreshToken, DateTimeOffset AccessExpiresAt);

        public class Validator : AbstractValidator<Request>
        {
            public Validator() => RuleFor(r => r.RefreshToken).NotEmpty();
        }

        public static void Map(IEndpointRouteBuilder app) =>
            app.MapPost("/auth/refresh", Handle)
               .WithRequestValidation<Request>()
               .AllowAnonymous();

        internal static async Task<Results<Ok<Response>, UnauthorizedHttpResult>> Handle(
            Request req, TokenService tokens, CancellationToken ct)
        {
            var pair = await tokens.RefreshAsync(req.RefreshToken, ct);
            if (pair is null) return TypedResults.Unauthorized();
            return TypedResults.Ok(new Response(pair.AccessToken, pair.RefreshToken, pair.AccessExpiresAt));
        }
    }
}
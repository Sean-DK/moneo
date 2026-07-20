using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Moneo.Api.Common;

public class JwtCurrentUserAccessor(IHttpContextAccessor http) : ICurrentUserAccessor
{
    public Task<CurrentUser> GetAsync(CancellationToken ct)
    {
        var principal = http.HttpContext?.User
            ?? throw new UnauthorizedAccessException("No HttpContext.");

        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? throw new UnauthorizedAccessException("Token missing subject claim.");

        if (!Guid.TryParse(sub, out var userId))
            throw new UnauthorizedAccessException("Subject claim is not a user id.");

        var email = principal.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? principal.FindFirstValue(ClaimTypes.Email) ?? "";
        var name = principal.FindFirstValue("name") ?? email;

        return Task.FromResult(new CurrentUser(userId, email, name));
    }
}